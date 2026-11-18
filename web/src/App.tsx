import { useHashRoute } from './router';
import { findModule } from './modules';
import HomePage from './pages/HomePage';
import ModulePage from './pages/ModulePage';

export default function App() {
  const route = useHashRoute();
  const module = findModule(route);

  // 首页与未知路径都回模块总览，避免出现死链。
  if (!module) return <HomePage />;

  return <ModulePage key={module.kind} module={module} />;
}
