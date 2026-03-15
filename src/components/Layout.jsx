import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-black font-sans text-slate-100">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col overflow-hidden">
        <div className="h-16 flex items-center px-8 border-b border-slate-800 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
          <h2 className="text-slate-300 text-sm font-medium tracking-wider uppercase">Overview Dashboard</h2>
        </div>
        <div className="flex-1 overflow-auto p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-orange/5 to-transparent pointer-events-none" />
          <div className="relative z-0 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
