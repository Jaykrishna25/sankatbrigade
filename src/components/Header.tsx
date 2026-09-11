import { useEffect, useState } from 'react';
import Icon, { BrandMark } from './Icons';
import { ROUTE_TITLE, type Route } from '../utils/router';
import type { ThemeName } from '../utils/storage';

interface HeaderProps {
  route: Route;
  onNavigate: (route: Route) => void;
  criticalCount: number;
  theme: ThemeName;
  onToggleTheme: () => void;
}

const NAV_ITEMS: Route[] = ['report', 'assistant', 'command', 'resources', 'about'];

export default function Header({ route, onNavigate, criticalCount, theme, onToggleTheme }: HeaderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [route]);

  const go = (next: Route) => {
    onNavigate(next);
    setOpen(false);
  };

  const navButton = (item: Route) => (
    <button
      key={item}
      type="button"
      className={`sb-nav-link${route === item || (item === 'report' && route === 'analysis') ? ' is-active' : ''}`}
      onClick={() => go(item)}
      aria-current={route === item ? 'page' : undefined}
    >
      {item === 'report' ? 'Report Emergency' : ROUTE_TITLE[item]}
      {item === 'command' && criticalCount > 0 && (
        <span className="sb-nav-link__count" aria-label={`${criticalCount} critical incidents`}>
          {criticalCount}
        </span>
      )}
    </button>
  );

  return (
    <header className="sb-header">
      <div className="sb-container">
        <div className="sb-header__inner">
          <button type="button" className="sb-brand" onClick={() => go('report')} aria-label="SankatBrigade home">
            <BrandMark className="sb-brand__mark" />
            <span className="sb-brand__text">
              <span className="sb-brand__name">
                SANKAT<span>BRIGADE</span>
              </span>
              <span className="sb-brand__tag">From emergency reports to coordinated action</span>
            </span>
          </button>

          <div className="sb-header__spacer" />

          <nav className="sb-nav" aria-label="Main">
            {NAV_ITEMS.map(navButton)}
          </nav>

          <span className="sb-chip-live" title="This is a prototype. No live emergency feed is connected.">
            <span className="sb-chip-live__dot" />
            Prototype Mode
          </span>

          <button
            type="button"
            className="sb-icon-btn"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>

          <button
            type="button"
            className="sb-icon-btn sb-nav-toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="sb-mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>

        {open && (
          <nav className="sb-mobile-nav" id="sb-mobile-nav" aria-label="Main (mobile)">
            {NAV_ITEMS.map(navButton)}
            <span className="sb-chip-live" style={{ display: 'inline-flex', alignSelf: 'start' }}>
              <span className="sb-chip-live__dot" />
              Prototype Mode
            </span>
          </nav>
        )}
      </div>
    </header>
  );
}
