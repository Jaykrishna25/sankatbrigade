import { useCallback, useEffect, useState } from 'react';

/**
 * Hash routing.
 *
 * Deliberate choice: hash routes need no server rewrite rules, so the exact
 * same `dist/` folder works on Cloudflare Pages, GitHub Pages, or opened from
 * a file share, and a deep link never 404s.
 */

export const ROUTES = ['report', 'analysis', 'assistant', 'command', 'resources', 'about'] as const;
export type Route = (typeof ROUTES)[number];

export const ROUTE_TITLE: Record<Route, string> = {
  report: 'Report Emergency',
  analysis: 'Incident Analysis',
  assistant: 'Assistant',
  command: 'Command Center',
  resources: 'Resources',
  about: 'About',
};

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0].trim();
  return (ROUTES as readonly string[]).includes(raw) ? (raw as Route) : 'report';
}

export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    if (parseHash() === next) {
      setRoute(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.location.hash = `#/${next}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return [route, navigate];
}
