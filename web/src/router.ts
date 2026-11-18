import { useEffect, useState } from 'react';

/** '#/notes' -> '/notes'；空 hash 视为首页。 */
export function normalizeHash(hash: string): string {
  const path = hash.replace(/^#/, '').trim();
  if (!path || path === '/') return '/';
  return path.replace(/\/+$/, '') || '/';
}

/** 用 hash 做路由：不需要服务端 rewrite，静态托管也能直接用。 */
export function useHashRoute(): string {
  const [route, setRoute] = useState(() => normalizeHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(normalizeHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
