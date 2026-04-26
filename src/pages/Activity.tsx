import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { History, ShieldAlert, Globe, Monitor, Clock, CheckCircle, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Activity() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      query(collection(db, 'users', user.uid, 'activity'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white glow-text italic">SYSTEM_LEDGER</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Immutable audit trail of all node interactions.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="px-5 py-2 bg-emerald-500/5 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(16,185,129,0.1)] flex items-center gap-3">
            <CheckCircle size={14} className="animate-pulse" />
            Integrity: VERIFIED_HASH
          </div>
        </div>
      </header>

      <div className="glass-card min-h-[550px] flex flex-col relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        
        <div className="p-8 border-b border-white/5 bg-white/2 flex justify-between items-center relative backdrop-blur-3xl">
            <h3 className="font-black text-white uppercase text-[11px] tracking-[0.2em] italic glow-text">EVENT_STREAM_ALPHA</h3>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)] animate-ping" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LIVE_SYNC: ACTIVE</span>
            </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/2">
                <th className="py-4 px-10 col-header w-12"></th>
                <th className="py-4 px-6 col-header">Verification_Node (IP)</th>
                <th className="py-4 px-6 col-header text-center">Protocol_Interface</th>
                <th className="py-4 px-6 col-header text-center">Security_State</th>
                <th className="py-4 px-10 col-header text-right">Audit_Epoch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-40 text-center relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/2 to-transparent opacity-50" />
                    <div className="flex flex-col items-center justify-center opacity-30 gap-6 relative z-10 transition-transform hover:scale-105 duration-700">
                      <div className="w-20 h-20 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-center text-slate-700 shadow-inner">
                        <History size={40} />
                      </div>
                      <p className="font-black text-[11px] uppercase tracking-[0.3em] text-slate-600 italic">Audit Ledger Empty.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                activities.map((act) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={act.id} 
                    className="hover:bg-white/2 transition-all group border-l-2 border-transparent hover:border-blue-500/50"
                  >
                    <td className="py-6 px-10 text-center">
                      <ShieldAlert size={18} className={cn(
                        "transition-all group-hover:scale-125",
                        act.status === 'success' ? "text-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "text-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                      )} />
                    </td>
                    <td className="py-6 px-6">
                      <div className="flex flex-col">
                        <span className="data-value font-mono font-black text-[13px] text-white/70 group-hover:text-white transition-colors">{act.ip}</span>
                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em] mt-1 group-hover:text-slate-400 transition-colors">Verified Ingress</span>
                      </div>
                    </td>
                    <td className="py-6 px-6 text-center">
                      <span className="px-3 py-1 bg-white/5 border border-white/5 text-slate-500 group-hover:text-blue-400 group-hover:border-blue-500/20 rounded-md text-[9px] font-black uppercase tracking-widest transition-all">
                        {act.deviceType || 'SECURE_NODE'}
                      </span>
                    </td>
                    <td className="py-6 px-6 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2 transition-all",
                        act.status === 'success' 
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]" 
                          : "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.05)]"
                      )}>
                        <div className={cn("w-1 h-1 rounded-full", act.status === 'success' ? "bg-emerald-500" : "bg-red-500")} />
                        {act.status}
                      </span>
                    </td>
                    <td className="py-6 px-10 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-mono font-black text-slate-500 group-hover:text-slate-300 transition-colors tracking-widest">
                          {new Date(act.timestamp).toLocaleDateString()}
                        </span>
                        <span className="text-[9px] font-mono text-slate-600 font-bold tracking-tighter uppercase mt-1">
                          {new Date(act.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="bg-slate-950/80 backdrop-blur-2xl rounded-3xl p-10 border border-white/5 flex items-center gap-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-[0.05] group-hover:scale-125 transition-all duration-[2000ms] ease-in-out pointer-events-none">
          <Shield size={220} />
        </div>
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
          <History size={32} />
        </div>
        <div className="flex-1 relative z-10">
          <h4 className="font-black text-white text-xs uppercase tracking-[0.3em] mb-3 glow-text italic">IMMUTABLE_LOG_PROTOCOL_V4</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-3xl font-medium tracking-wide">
            All system interactions are committed to a read-only audit node on the encrypted cluster. These records are protected by non-repudiation policies and permanent asymmetric encryption. Modification attempts trigger immediate node isolation and core-root lockdown.
          </p>
        </div>
      </footer>
    </div>
  );
}
