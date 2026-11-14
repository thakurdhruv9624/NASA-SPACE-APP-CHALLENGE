import { INDICATOR_INFO } from "../types";
import type { IndicatorKey } from "../types";

interface IndicatorsProps {
  selectedIndicator: IndicatorKey;
  onSelect: (indicator: IndicatorKey) => void;
}

const indicators = [
  { key: "temperature", available: true },
  { key: "vegetation", available: true },
  { key: "atmosphere", available: true },
  { key: "water", available: true },
] as const;

export function Indicators({ selectedIndicator, onSelect }: IndicatorsProps) {
  return (
    <section className="indicators content-width" aria-labelledby="indicators-heading">
      <div className="section-heading indicator-heading">
        <div>
          <p className="eyebrow">FOUR WAYS TO LOOK</p>
          <h2 id="indicators-heading">Earth’s vital signs</h2>
        </div>
        <p className="section-note">Choose a measure to explore its satellite observations.</p>
      </div>
      <div className="indicator-grid">
        {indicators.map(({ key, available }, index) => {
          const info = INDICATOR_INFO[key];
          const selected = selectedIndicator === key;
          return (
            <button
              className={`indicator-item${available ? " is-available" : ""}${selected ? " is-selected" : ""}`}
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(key)}
            >
              <span className="indicator-number">0{index + 1}</span>
              <span className="indicator-title">{info.name}</span>
              <span className="indicator-measure">{info.measure} <span>{info.unit}</span></span>
              <span className="indicator-status status-ready">
                <i aria-hidden="true" /> Data available
              </span>
            </button>
          );
        })}
      </div>
      <p className="indicator-footnote">
        <span aria-hidden="true">i</span>
        NDVI measures vegetation greenness; AOT estimates atmospheric aerosol; NDWI highlights water in satellite imagery.
      </p>
    </section>
  );
}