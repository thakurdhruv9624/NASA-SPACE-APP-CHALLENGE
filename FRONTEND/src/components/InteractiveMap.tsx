import { useEffect, useRef, useState } from "react";
import { MapContainer, Rectangle, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import { INDICATOR_INFO } from "../types";
import type { BBox, IndicatorKey } from "../types";

interface InteractiveMapProps {
  bbox: BBox;
  locationName: string;
  indicator: IndicatorKey;
  onIndicatorChange: (indicator: IndicatorKey) => void;
  onLocationChange: (bbox: BBox, name: string) => void;
  onLocationNameChange: (name: string) => void;
}

const LOCATIONS: { name: string; bbox: BBox }[] = [
  { name: "Ahmedabad", bbox: [72.4, 22.9, 72.8, 23.2] },
  { name: "Gandhinagar", bbox: [72.5, 23.15, 72.75, 23.35] },
  { name: "Rann of Kutch", bbox: [68.7, 23.5, 71.8, 24.8] },
  { name: "Gir Forest", bbox: [70.5, 20.6, 71.7, 21.5] },
];

interface DynamicLocation {
  name: string;
  bbox: BBox;
}

interface NominatimResult {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

function MapViewport({ bbox }: { bbox: BBox }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(
      [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]],
      ],
      { padding: [24, 24], maxZoom: 9, animate: true },
    );
  }, [bbox, map]);

  return null;
}

function RegionClickHandler({
  onMapClick,
}: {
  onMapClick: (event: LeafletMouseEvent) => void;
}) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

export function InteractiveMap({
  bbox,
  locationName,
  indicator,
  onIndicatorChange,
  onLocationChange,
  onLocationNameChange,
}: InteractiveMapProps) {
  const [dynamicLocation, setDynamicLocation] = useState<DynamicLocation | null>(null);
  const geocodeController = useRef<AbortController | null>(null);
  const geocodeRequestId = useRef(0);
  const nextGeocodeTime = useRef(0);

  function isSelected(candidate: { name: string; bbox: BBox }) {
    return locationName === candidate.name && candidate.bbox.every((value, index) => value === bbox[index]);
  }

  function getPlaceName(result: NominatimResult) {
    const address = result.address;
    if (!address) return "";
    const locality = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county;
    return [...new Set([locality, address.state, address.country].filter(Boolean))].join(", ");
  }

  async function reverseGeocode(lat: number, lng: number, requestId: number, signal: AbortSignal) {
    const delay = Math.max(0, nextGeocodeTime.current - Date.now());
    if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
    if (signal.aborted || requestId !== geocodeRequestId.current) return;

    nextGeocodeTime.current = Date.now() + 1100;
    try {
      const params = new URLSearchParams({
        format: "jsonv2",
        lat: String(lat),
        lon: String(lng),
        zoom: "10",
        addressdetails: "1",
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
        headers: { Accept: "application/json" },
        signal,
      });
      if (!response.ok) throw new Error(`Reverse geocoding failed (${response.status}).`);
      const result = (await response.json()) as NominatimResult;
      const placeName = getPlaceName(result);
      if (!placeName || signal.aborted || requestId !== geocodeRequestId.current) return;

      setDynamicLocation((current) => current ? { ...current, name: placeName } : current);
      onLocationNameChange(placeName);
    } catch (error) {
      if (!signal.aborted) console.warn("Could not look up the selected map location.", error);
    }
  }

  function handleMapClick(event: LeafletMouseEvent) {
    const { lat, lng } = event.latlng;
    const lat1 = Math.max(-90, lat - 0.15);
    const lat2 = Math.min(90, lat + 0.15);
    const lng1 = Math.max(-180, lng - 0.15);
    const lng2 = Math.min(180, lng + 0.15);
    const nextBbox: BBox = [lng1, lat1, lng2, lat2];
    const fallbackName = `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
    const requestId = ++geocodeRequestId.current;

    geocodeController.current?.abort();
    const controller = new AbortController();
    geocodeController.current = controller;
    setDynamicLocation({ name: fallbackName, bbox: nextBbox });
    onLocationChange(nextBbox, fallbackName);
    void reverseGeocode(lat, lng, requestId, controller.signal);
  }

  function selectPreset(location: (typeof LOCATIONS)[number]) {
    geocodeRequestId.current += 1;
    geocodeController.current?.abort();
    geocodeController.current = null;
    onLocationChange(location.bbox, location.name);
  }

  const rectangleBounds: [[number, number], [number, number]] = [
    [bbox[1], bbox[0]],
    [bbox[3], bbox[2]],
  ];

  return (
    <div className="map-workspace">
      <div className="map-toolbar">
        <div>
          <span className="field-label">Observation layer</span>
          <select
            className="map-indicator-select"
            aria-label="Observation layer"
            value={indicator}
            onChange={(event) => onIndicatorChange(event.target.value as IndicatorKey)}
          >
            {(Object.keys(INDICATOR_INFO) as IndicatorKey[]).map((key) => (
              <option key={key} value={key}>{INDICATOR_INFO[key].title} · {INDICATOR_INFO[key].unit}</option>
            ))}
          </select>
        </div>
        <span className="map-hint">Click anywhere on the map to explore a 0.3° area</span>
      </div>
      <div className="location-shortcuts" role="group" aria-label="Quick locations">
        <span className="field-label">Quick locations</span>
        <div className="location-buttons">
          {LOCATIONS.map((location) => (
            <button
              className={`location-button${isSelected(location) ? " is-active" : ""}`}
              key={location.name}
              type="button"
              aria-pressed={isSelected(location)}
              onClick={() => selectPreset(location)}
            >
              {location.name}
            </button>
          ))}
          {dynamicLocation && (
            <button
              className={`location-button location-button-dynamic${isSelected(dynamicLocation) ? " is-active" : ""}`}
              type="button"
              aria-pressed={isSelected(dynamicLocation)}
              title={dynamicLocation.name}
              onClick={() => onLocationChange(dynamicLocation.bbox, dynamicLocation.name)}
            >
              {dynamicLocation.name}
            </button>
          )}
        </div>
      </div>
      <div className="map-canvas">
        <MapContainer
          center={[(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2]}
          zoom={8}
          scrollWheelZoom
          className="earth-map"
          aria-label="Interactive map. Select a region with two map clicks."
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Rectangle
            bounds={rectangleBounds}
            pathOptions={{ color: "#2563eb", weight: 2, fillColor: "#2563eb", fillOpacity: 0.1 }}
          />
          <MapViewport bbox={bbox} />
          <RegionClickHandler onMapClick={handleMapClick} />
        </MapContainer>
        <span className="map-layer-note"><i /> Basemap only · Place names via Nominatim / © OpenStreetMap</span>
      </div>
      <div className="map-caption" role="status">
        <strong>
          {locationName} · {bbox[1].toFixed(2)}, {bbox[0].toFixed(2)} to {bbox[3].toFixed(2)}, {bbox[2].toFixed(2)}
        </strong>
        <span>
          Click the map to move this area. The blue outline is used for the trend query.
        </span>
      </div>
    </div>
  );
}