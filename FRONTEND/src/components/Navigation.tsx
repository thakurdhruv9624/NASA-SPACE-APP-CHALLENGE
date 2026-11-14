import { useState } from "react";

const navigationItems = [
  { label: "Overview", href: "#overview", active: true },
  { label: "Explore data", href: "#explore", active: false },
  { label: "Trend analysis", href: "#trends", active: false },
  { label: "About", href: "#about", active: false, disabled: true },
];

export function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <a className="brand" href="#overview" aria-label="Earth System Trend Detective home">
        <span className="brand-symbol" aria-hidden="true">
          <span />
        </span>
        <span className="brand-name">
          Earth System
          <strong>Trend Detective</strong>
        </span>
      </a>

      <button
        className="menu-toggle"
        type="button"
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
        <span />
      </button>

      <nav
        id="primary-navigation"
        className={`primary-navigation${menuOpen ? " is-open" : ""}`}
        aria-label="Main navigation"
      >
        {navigationItems.map((item) => (
          <a
            key={item.label}
            className={`navigation-link${item.active ? " is-active" : ""}`}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            aria-disabled={item.disabled || undefined}
            onClick={(event) => {
              if (item.disabled) event.preventDefault();
              setMenuOpen(false);
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <a className="method-link" href="#sources" aria-disabled="true" onClick={(event) => event.preventDefault()}>
        Data &amp; method <span aria-hidden="true">↗</span>
      </a>
    </header>
  );
}