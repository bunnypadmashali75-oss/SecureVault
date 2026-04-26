import { useAuth } from '../../hooks/useAuth';
import { LogOut, User, Bell } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Navbar() {
  const { profile } = useAuth();

  const handleLogout = () => signOut(auth);

  return (
    <header className="h-20 bg-slate-950/50 backdrop-blur-lg border-b border-white/5 px-8 flex items-center justify-between shrink-0 z-40">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-black text-white tracking-widest uppercase text-sm">
          Node_Alpha <span className="text-blue-500 text-xs">// Secure</span>
        </h1>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em]">Verified Instance</span>
          <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-[9px] font-mono font-bold text-blue-400 shadow-inner">
            SHA-256_ACTIVE
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all group border border-white/5">
          <Bell size={18} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
        </button>

        <div className="flex items-center gap-4 pl-6 border-l border-white/10">
          <div className="text-right">
            <p className="text-xs font-black text-white leading-none mb-1 tracking-tight">{profile?.displayName}</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Trust Rating: {profile?.securityScore}%</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-slate-300 shadow-xl group hover:border-blue-500/50 transition-colors">
            <User size={18} />
          </div>
          <button 
            onClick={handleLogout}
            className="p-2.5 bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl border border-white/5 transition-all active:scale-90"
            title="Secure Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
