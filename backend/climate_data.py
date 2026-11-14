"""Fetch and cache MODIS land surface temperature trends."""

import hashlib
import json
import logging
import time
from functools import wraps
from pathlib import Path
from datetime import date
from typing import Any, Callable, TypeVar

import dask
import numpy as np
import pandas as pd
import planetary_computer
import xarray as xr
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from odc import stac
from pystac_client import Client

STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
COLLECTION = "modis-11A2-061"
BAND = "LST_Day_1km"
INDICATORS = {
	"vegetation": {
		"collection": "modis-13Q1-061",
		"bands": ["250m_16_days_NDVI"],
		"unit": "NDVI",
		"label": "Vegetation index (NDVI)",
	},
	"atmosphere": {
		"collection": "sentinel-2-l2a",
		"bands": ["AOT", "SCL"],
		"unit": "AOT (unitless)",
		"label": "Aerosol optical thickness",
	},
	"water": {
		"collection": "sentinel-2-l2a",
		"bands": ["B03", "B08", "SCL"],
		"unit": "NDWI",
		"label": "Normalized Difference Water Index (NDWI)",
	},
}
FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

logger = logging.getLogger(__name__)
_Result = TypeVar("_Result")
app = FastAPI(title="Earth System Trend Detective API")
app.add_middleware(
	CORSMiddleware,
	allow_origins=FRONTEND_ORIGINS,
	allow_credentials=False,
	allow_methods=["GET"],
	allow_headers=["*"],
)


class NoDataFoundError(Exception):
	"""Raised when a STAC search returns no matching scenes."""


def retry(max_attempts: int = 3) -> Callable[[Callable[..., _Result]], Callable[..., _Result]]:
	"""Retry a function up to max_attempts with exponential backoff."""

	def decorate(function: Callable[..., _Result]) -> Callable[..., _Result]:
		@wraps(function)
		def wrapped(*args: Any, **kwargs: Any) -> _Result:
			for attempt in range(max_attempts):
				try:
					return function(*args, **kwargs)
				except NoDataFoundError:
					raise
				except Exception:
					if attempt == max_attempts - 1:
						raise
					delay = 2**attempt
					logger.warning("Fetch failed; retrying in %s seconds", delay)
					time.sleep(delay)
			raise RuntimeError("Retry loop ended unexpectedly")

		return wrapped

	return decorate


def _cache_path(
	bbox: list[float], start_date: str, end_date: str, indicator: str = "temperature"
) -> Path:
	"""Return the cache filename for a query."""
	query = [bbox, start_date, end_date]
	if indicator != "temperature":
		query.insert(0, indicator)
	key = json.dumps(query, separators=(",", ":"))
	digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
	cache_dir = Path(__file__).parent / ".cache"
	cache_dir.mkdir(parents=True, exist_ok=True)
	return cache_dir / f"{indicator}_{digest}.json"


@retry(max_attempts=3)
def _fetch_temperature_trend(
	bbox: list[float], start_date: str, end_date: str, max_items: int
) -> list[dict[str, Any]]:
	"""Fetch and aggregate matching MODIS scenes."""
	catalog = Client.open(STAC_URL, modifier=planetary_computer.sign_inplace)
	search = catalog.search(
		collections=[COLLECTION],
		bbox=bbox,
		datetime=f"{start_date}/{end_date}",
		max_items=max_items,
	)
	items = list(search.items())
	if not items:
		raise NoDataFoundError(
			f"No {COLLECTION} items found for {start_date} through {end_date}."
		)

	dataset: xr.Dataset = stac.load(
		items,
		bands=[BAND],
		chunks={"x": 512, "y": 512, "time": 1},
	)
	raw: xr.DataArray = dataset[BAND]
	temperature = raw.where(raw != 0) * 0.02 - 273.15
	spatial_mean = temperature.mean(dim=("y", "x"), skipna=True)

	if not dask.is_dask_collection(spatial_mean.data):
		raise RuntimeError("STAC data did not load lazily as a Dask collection.")
	values: pd.Series = spatial_mean.compute().to_series()
	values = values.dropna()
	return [
		{"date": timestamp.strftime("%Y-%m-%d"), "temp_c": round(float(value), 2)}
		for timestamp, value in values.items()
	]


def get_temperature_trend(
	bbox: list[float], start_date: str, end_date: str, max_items: int = 50
) -> list[dict]:
	"""Return cached or fetched daily spatial-mean temperatures in Celsius."""
	cache_file = _cache_path(bbox, start_date, end_date)
	if cache_file.exists():
		try:
			with cache_file.open("r", encoding="utf-8") as file:
				return json.load(file)
		except (OSError, json.JSONDecodeError):
			logger.warning("Ignoring unreadable cache file %s", cache_file)

	results = _fetch_temperature_trend(bbox, start_date, end_date, max_items)
	with cache_file.open("w", encoding="utf-8") as file:
		json.dump(results, file)
	return results


def _transform_indicator(dataset: xr.Dataset, indicator: str) -> xr.DataArray:
	"""Convert loaded source bands to the selected scientific indicator."""
	if indicator == "vegetation":
		raw = dataset["250m_16_days_NDVI"]
		return (raw.where((raw >= -2000) & (raw <= 10000)) * 0.0001).rename("value")

	valid_scene = ~dataset["SCL"].isin([0, 1, 3, 7, 8, 9, 10, 11])
	if indicator == "atmosphere":
		aerosol_optical_thickness = dataset["AOT"] * 0.001
		return aerosol_optical_thickness.where(valid_scene).rename("value")

	green = dataset["B03"]
	nir = dataset["B08"]
	denominator = green + nir
	ndwi = (green - nir) / denominator.where(denominator != 0)
	return ndwi.where(valid_scene).rename("value")


@retry(max_attempts=3)
def _fetch_indicator_trend(
	indicator: str, bbox: list[float], start_date: str, end_date: str, max_items: int
) -> list[dict[str, Any]]:
	"""Fetch and aggregate an indicator from its Planetary Computer collection."""
	config = INDICATORS[indicator]
	catalog = Client.open(STAC_URL, modifier=planetary_computer.sign_inplace)
	search = catalog.search(
		collections=[config["collection"]],
		bbox=bbox,
		datetime=f"{start_date}/{end_date}",
		max_items=max_items,
	)
	items = list(search.items())
	if not items:
		raise NoDataFoundError(
			f"No {config['label']} observations found for {start_date} through {end_date}."
		)

	dataset: xr.Dataset = stac.load(
		items,
		bands=config["bands"],
		chunks={"x": 512, "y": 512, "time": 1},
		**({"resolution": 60} if config["collection"] == "sentinel-2-l2a" else {}),
	)
	spatial_mean = _transform_indicator(dataset, indicator).mean(dim=("y", "x"), skipna=True)
	if not dask.is_dask_collection(spatial_mean.data):
		raise RuntimeError("STAC data did not load lazily as a Dask collection.")

	values: pd.Series = spatial_mean.compute().to_series().dropna()
	if values.empty:
		return []
	values.index = pd.to_datetime(values.index).date
	values = values.groupby(level=0).mean().sort_index()
	return [
		{"date": observation_date.isoformat(), "value": round(float(value), 4)}
		for observation_date, value in values.items()
	]


def get_indicator_trend(
	indicator: str,
	bbox: list[float],
	start_date: str,
	end_date: str,
	max_items: int = 50,
) -> list[dict[str, Any]]:
	"""Return cached spatial-mean observations for a supported indicator."""
	if indicator == "temperature":
		return get_temperature_trend(bbox, start_date, end_date, max_items)
	if indicator not in INDICATORS:
		raise ValueError(f"Unsupported indicator: {indicator}")

	cache_file = _cache_path(bbox, start_date, end_date, indicator)
	if cache_file.exists():
		try:
			with cache_file.open("r", encoding="utf-8") as file:
				return json.load(file)
		except (OSError, json.JSONDecodeError):
			logger.warning("Ignoring unreadable cache file %s", cache_file)

	results = _fetch_indicator_trend(indicator, bbox, start_date, end_date, max_items)
	with cache_file.open("w", encoding="utf-8") as file:
		json.dump(results, file)
	return results


@app.get("/api/trend")
def temperature_trend_endpoint(
	lat1: float = Query(ge=-90, le=90),
	lon1: float = Query(ge=-180, le=180),
	lat2: float = Query(ge=-90, le=90),
	lon2: float = Query(ge=-180, le=180),
	start: date = Query(),
	end: date = Query(),
        indicator: str = Query("temperature", pattern="^(temperature|vegetation|atmosphere|water)$"),
) -> list[dict]:
	"""Return an Earth-system indicator trend for a geographic area and date range."""
	if start > end:
		raise HTTPException(status_code=422, detail="start must be on or before end")

	bbox = [min(lon1, lon2), min(lat1, lat2), max(lon1, lon2), max(lat1, lat2)]
	try:
		return get_indicator_trend(indicator, bbox, start.isoformat(), end.isoformat())
	except NoDataFoundError as error:
		raise HTTPException(status_code=404, detail=str(error)) from error


if __name__ == "__main__":
	logging.basicConfig(level=logging.INFO)
	ahmedabad_bbox = [72.4, 22.9, 72.8, 23.2]
	records = get_temperature_trend(ahmedabad_bbox, "2024-01-01", "2024-03-31")
	logger.info("First five records: %s", records[:5])
