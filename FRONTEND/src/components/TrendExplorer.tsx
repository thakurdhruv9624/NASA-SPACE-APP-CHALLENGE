import { useLayoutEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendRecord } from "../types";
import { INDICATOR_INFO } from "../types";
import type { IndicatorKey } from "../types";

interface TrendExplorerProps {
  startDate: string;
  endDate: string;
  indicator: IndicatorKey;
  selectedRange: 1 | 3 | 5 | null;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onRangeSelect: (years: 1 | 3 | 5) => void;
  onSubmit: () => void;
  records: TrendRecord[];
  loading: boolean;
  error: string;
  hasSearched: boolean;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TrendExplorer({
  startDate,
  endDate,
  indicator,
  selectedRange,
  onStartDateChange,
  onEndDateChange,
  onRangeSelect,
  onSubmit,
  records,
  loading,
  error,
  hasSearched,
}: TrendExplorerProps) {
  const info = INDICATOR_INFO[indicator];
  const chartHost = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const invalidRange = Boolean(startDate && endDate && startDate > endDate);
  const insight = buildInsight(records, indicator);

  useLayoutEffect(() => {
    const host = chartHost.current;
    if (!host) return;

    const updateWidth = () => setChartWidth(Math.floor(host.getBoundingClientRect().width));
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [records]);

  return (
    <section className="trend-explorer" id="trends" aria-labelledby="trend-heading">
      <div className="section-heading trend-heading">
        <div>
          <p className="eyebrow">02 / TREND EXPLORER</p>
          <h2 id="trend-heading">Look closer over time.</h2>
        </div>
        <p className="section-note">{info.measure} for the selected area.</p>
      </div>

      <form
        className="trend-controls"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalidRange) onSubmit();
        }}
      >
        <label className="date-control">
          <span className="field-label">From</span>
          <input type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} required />
        </label>
        <label className="date-control">
          <span className="field-label">To</span>
          <input type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} required />
        </label>
        <div className="range-control" role="group" aria-label="Quick time ranges">
          <span className="field-label">Quick range</span>
          <div className="range-pills">
            {([1, 3, 5] as const).map((years) => (
              <button
                className={`range-pill${selectedRange === years ? " is-active" : ""}`}
                key={years}
                type="button"
                aria-pressed={selectedRange === years}
                onClick={() => onRangeSelect(years)}
              >
                Last {years} {years === 1 ? "year" : "years"}
              </button>
            ))}
          </div>
        </div>
        <button className="query-action" type="submit" disabled={loading || invalidRange}>
          {loading ? "Loading observations…" : "Update trend"}
        </button>
        {invalidRange && <p className="range-error" role="alert">End date must be on or after the start date.</p>}
      </form>

      <div className="chart-panel" aria-live="polite" aria-busy={loading}>
        <div className="chart-topline">
          <div>
            <h3>{info.title}</h3>
            <p>Spatial mean · {info.unit}</p>
          </div>
          {records.length > 0 && <span className="chart-legend"><i /> {info.name}</span>}
        </div>

        <div className="insight-box" aria-live="polite">
          <span className="insight-label">TREND INSIGHT</span>
          <p>{loading ? "Updating the summary with the selected observations…" : insight}</p>
        </div>

        {loading ? (
          <div className="chart-message"><span className="loading-indicator" /><strong>Fetching satellite observations</strong><p>This can take a moment for a new area or date range.</p></div>
        ) : error ? (
          <div className="chart-message chart-error" role="alert"><strong>Trend data could not be loaded</strong><p>{error}</p></div>
        ) : records.length > 0 ? (
          <div className="chart-visual" ref={chartHost}>
            {chartWidth > 0 && <ResponsiveContainer width={chartWidth} height="100%">
              <LineChart data={records} margin={{ top: 14, right: 18, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="#eceff2" strokeDasharray="3 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => formatDate(value)}
                  minTickGap={30}
                  tick={{ fill: "#737373", fontSize: 10 }}
                  axisLine={{ stroke: "#dfe3e8" }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="value"
                  unit={indicator === "temperature" ? "°" : ""}
                  width={48}
                  tick={{ fill: "#737373", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  labelFormatter={(value) => formatDate(String(value))}
                  formatter={(value) => [
                    `${Number(value).toFixed(indicator === "temperature" ? 2 : 4)} ${info.unit}`,
                    info.name,
                  ]}
                  contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 4, fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={info.name}
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "#2563eb" }}
                />
              </LineChart>
            </ResponsiveContainer>}
          </div>
        ) : (
          <div className="chart-message">
            <span className="empty-chart-mark" aria-hidden="true">—</span>
            <strong>{hasSearched ? "No observations found for this query" : "Your trend will appear here"}</strong>
            <p>{hasSearched ? "Try a different area or time period." : "Choose a region and time period, then update the trend."}</p>
          </div>
        )}

        <div className="chart-footer">
          <span>{records.length ? `${records.length} observations · ${formatDate(records[0].date)} – ${formatDate(records[records.length - 1].date)}` : `Source: ${info.dataset} via Microsoft Planetary Computer`}</span>
          <span>{indicator === "temperature" ? "Land surface temperature is not air temperature." : `Measure: ${info.unit}. Values summarize the selected area.`}</span>
        </div>
      </div>
    </section>
  );
}

function buildInsight(records: TrendRecord[], indicator: IndicatorKey): string {
  if (!records.length) return "An insight will appear when observations are available.";
  if (records.length === 1) return "One observation is available; more dates are needed to describe a trend.";

  const values = records.map((record) => record.value).filter(Number.isFinite);
  if (values.length < 2) return "There are not enough valid observations to describe a trend.";

  const change = values[values.length - 1] - values[0];
  const threshold = indicator === "temperature" ? 0.3 : 0.01;
  const info = INDICATOR_INFO[indicator];
  const amount = Math.abs(change).toFixed(indicator === "temperature" ? 2 : 4);
  const period = `${formatDate(records[0].date)} to ${formatDate(records[records.length - 1].date)}`;

  if (Math.abs(change) < threshold) {
    return `Across ${values.length} observations from ${period}, ${info.title.toLowerCase()} was broadly stable, changing by ${amount} ${info.unit}.`;
  }

  const direction = change > 0 ? "increased" : "decreased";
  return `Across ${values.length} observations from ${period}, ${info.title.toLowerCase()} ${direction} by ${amount} ${info.unit}; this describes a change, not its cause.`;
}