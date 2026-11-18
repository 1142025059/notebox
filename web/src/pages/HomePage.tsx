import { useEffect, useState } from 'react';
import { api } from '../api';
import { MODULES, navigate } from '../modules';
import type { StatsMap } from '../types';

const EMPTY_STATS: StatsMap = {
  note: { notes: 0, done: 0 },
  todo: { notes: 0, done: 0 },
  knowledge: { notes: 0, done: 0 },
};

export default function HomePage() {
  const [stats, setStats] = useState<StatsMap>(EMPTY_STATS);

  useEffect(() => {
    let alive = true;
    void api
      .stats()
      .then((next) => {
        if (alive) setStats(next);
      })
      .catch(() => {
        // 首页拿不到计数不影响进入模块
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="home">
      <div className="home-inner">
        <header className="home-head">
          <div className="home-brand">
            <span className="brand-mark" />
            <span className="home-title">notebox</span>
          </div>
          <p className="home-sub">选一个模块进去</p>
        </header>

        <div className="module-grid">
          {MODULES.map((module) => {
            const stat = stats[module.kind] ?? { notes: 0, done: 0 };
            const summary = `${stat.notes} ${module.unit}${module.counters.notes} · ${stat.done} ${module.unit}${module.counters.done}`;

            return (
              <button
                key={module.kind}
                type="button"
                className="module-card"
                data-kind={module.kind}
                onClick={() => navigate(module.path)}
              >
                <span className="module-head">
                  <span className="module-dot" />
                  <span className="module-name">{module.name}</span>
                  <span className="module-arrow">→</span>
                </span>
                <span className="module-tagline">{module.tagline}</span>
                <span className="module-stats">{summary}</span>
              </button>
            );
          })}
        </div>

        <footer className="home-foot">数据存在本机，随时可以导出 JSON 备份</footer>
      </div>
    </div>
  );
}
