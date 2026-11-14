import { useRef, useState } from "react";
import { Hero } from "./components/Hero";
import { Indicators } from "./components/Indicators";
import { InteractiveMap } from "./components/InteractiveMap";
import { Navigation } from "./components/Navigation";
import { TrendExplorer } from "./components/TrendExplorer";
import type { BBox, IndicatorKey, TrendRecord } from "./types";

const DEFAULT_BBOX: BBox = [72.4, 22.9, 72.8, 23.2];
const DEFAULT_START = "2024-01-01";
const DEFAULT_END = "2024-03-31";
const DEFAULT_LOCATION = "Ahmedabad";

export function App() {
  const [bbox, setBbox] = useState<BBox>(DEFAULT_BBOX);
  const [locationName, setLocationName] = useState(DEFAULT_LOCATION);
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);
  const [indicator, setIndicator] = useState<IndicatorKey>("temperature");
  const [selectedRange, setSelectedRange] = useState<1 | 3 | 5 | null>(null);
  const [records, setRecords] = useState<TrendRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const trendRequestId = useRef(0);

  async function fetchTrend(
    queryBbox: BBox = bbox,
    queryStart: string = startDate,
    queryEnd: string = endDate,
    queryIndicator: IndicatorKey = indicator,
  ) {
    const requestId = ++trendRequestId.current;
    setLoading(true);
    setError("");
    setHasSearched(true);

    const params = new URLSearchParams({
      lon1: String(queryBbox[0]),
      lat1: String(queryBbox[1]),
      lon2: String(queryBbox[2]),
      lat2: String(queryBbox[3]),
      start: queryStart,
      end: queryEnd,
      indicator: queryIndicator,
    });

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/trend?${params}`);
      const payload: unknown = await response.json();
      if (!response.ok) {
        const detail = typeof payload === "object" && payload !== null && "detail" in payload
          ? String(payload.detail)
          : `The request failed (${response.status}).`;
        throw new Error(detail);
      }
      if (!Array.isArray(payload)) throw new Error("The server returned an unexpected response.");
      if (requestId !== trendRequestId.current) return;
      const trendRecords = payload.flatMap((entry): TrendRecord[] => {
        if (typeof entry !== "object" || entry === null || !("date" in entry)) return [];
        const row = entry as { date: unknown; value?: unknown; temp_c?: unknown };
        const value = typeof row.value === "number" ? row.value : row.temp_c;
        if (typeof row.date !== "string" || typeof value !== "number" || !Number.isFinite(value)) return [];
        return [{ date: row.date, value, ...(typeof row.temp_c === "number" ? { temp_c: row.temp_c } : {}) }];
      });
      setRecords(trendRecords);
    } catch (requestError) {
      if (requestId !== trendRequestId.current) return;
      setRecords([]);
      setError(requestError instanceof Error ? requestError.message : "Unable to load trend data.");
    } finally {
      if (requestId === trendRequestId.current) setLoading(false);
    }
  }

  function exploreFromHero() {
    document.querySelector("#explore")?.scrollIntoView({ behavior: "smooth" });
    void fetchTrend();
  }

  function selectLocation(nextBbox: BBox, name: string) {
    setBbox(nextBbox);
    setLocationName(name);
    void fetchTrend(nextBbox);
  }

  function selectIndicator(nextIndicator: IndicatorKey) {
    setIndicator(nextIndicator);
    void fetchTrend(bbox, startDate, endDate, nextIndicator);
  }

  function selectTimeRange(years: 1 | 3 | 5) {
    const end = new Date();
    const start = new Date(end);
    start.setUTCFullYear(start.getUTCFullYear() - years);
    const nextStartDate = start.toISOString().slice(0, 10);
    const nextEndDate = end.toISOString().slice(0, 10);
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setSelectedRange(years);
    void fetchTrend(bbox, nextStartDate, nextEndDate, indicator);
  }

  function changeStartDate(date: string) {
    setStartDate(date);
    setSelectedRange(null);
  }

  function changeEndDate(date: string) {
    setEndDate(date);
    setSelectedRange(null);
  }

  function renameLocation(name: string) {
    setLocationName(name);
  }

  const dataStatus = loading
    ? "Loading satellite observations…"
    : error
      ? "Unable to load observations"
      : hasSearched
        ? `${records.length} observations loaded`
        : "Satellite data ready to explore";

  return (
    <>
      <Navigation />
      <main id="overview">
        <Hero onExplore={exploreFromHero} dataStatus={dataStatus} />
        <Indicators selectedIndicator={indicator} onSelect={selectIndicator} />
        <section className="explore-section" id="explore" aria-labelledby="explore-heading">
          <div className="content-width">
            <div className="section-heading">
              <div>
                <p className="eyebrow">01 / EXPLORE</p>
                <h2 id="explore-heading">Start with a place.</h2>
              </div>
              <p className="section-note">Select an area, choose a time period, then follow the observations.</p>
            </div>
            <InteractiveMap
              bbox={bbox}
              locationName={locationName}
              indicator={indicator}
              onIndicatorChange={selectIndicator}
              onLocationChange={selectLocation}
              onLocationNameChange={renameLocation}
            />
            <TrendExplorer
              startDate={startDate}
              endDate={endDate}
              indicator={indicator}
              selectedRange={selectedRange}
              onStartDateChange={changeStartDate}
              onEndDateChange={changeEndDate}
              onRangeSelect={selectTimeRange}
              onSubmit={fetchTrend}
              records={records}
              loading={loading}
              error={error}
              hasSearched={hasSearched}
            />
          </div>
        </section>
      </main>
    </>
  );
}