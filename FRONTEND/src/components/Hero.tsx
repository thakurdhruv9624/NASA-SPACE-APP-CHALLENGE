interface HeroProps {
  onExplore: () => void;
  dataStatus: string;
}

export function Hero({ onExplore, dataStatus }: HeroProps) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-content">
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          EARTH OBSERVATION, MADE CLEAR
        </p>
        <h1 id="hero-title">
          Earth is changing.
          <br />
          <span>Let’s find out why.</span>
        </h1>
        <p className="hero-description">
          Explore Earth’s environmental changes through satellite observations. Follow the evidence,
          compare places, and see what the data can tell us.
        </p>
        <button className="primary-action" type="button" onClick={onExplore}>
          Explore Earth data <span aria-hidden="true">↓</span>
        </button>
        <p className="data-notice" id="data-status" role="status" tabIndex={-1}>
          <span aria-hidden="true" /> {dataStatus}
        </p>
      </div>

      <figure className="hero-visual">
        <img
          src="https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&w=1200&h=1200&q=85"
          alt="Earth viewed from space, with continents, oceans, and cloud cover visible"
          fetchPriority="high"
        />
        <figcaption>
          <span>EARTH, IN CONTEXT</span>
          <span>Image via Unsplash</span>
        </figcaption>
      </figure>
    </section>
  );
}