import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Shield, Key, History, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Shield, label: 'File Vault', path: '/vault' },
  { icon: Key, label: 'Passwords', path: '/passwords' },
  { icon: History, label: 'Activity', path: '/activity' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "h-screen bg-slate-950/80 backdrop-blur-3xl text-white flex flex-col shrink-0 transition-all duration-300 border-r border-white/5 shadow-2xl z-50",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/40 shrink-0 transform hover:scale-110 transition-transform">
          S
        </div>
        {!collapsed && <span className="text-xl font-black tracking-tight glow-text">SecureVault</span>}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="ml-auto p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all shadow-inner"
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>
      
      <nav className="flex-1 py-10 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all group overflow-hidden relative",
              isActive 
                ? "bg-blue-600/90 text-white shadow-lg shadow-blue-600/20" 
                : "text-slate-500 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon size={18} className={cn(
              "transition-all duration-300 group-hover:scale-110",
              collapsed ? "mx-auto" : ""
            )} />
            {!collapsed && <span className="text-[10px]">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <div className={cn(
          "bg-white/5 border border-white/10 rounded-2xl transition-all shadow-inner",
          collapsed ? "p-2" : "p-4"
        )}>
          {!collapsed && <p className="text-[8px] text-slate-500 uppercase font-black mb-3 tracking-[0.2em]">Core Processing</p>}
          <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-black uppercase tracking-tighter">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            {!collapsed && "Vertex-3 Active"}
          </div>
        </div>
      </div>
    </aside>
  );
}
