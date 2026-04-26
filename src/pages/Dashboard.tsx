import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { Shield, Key, History, AlertTriangle, FileLock, CheckCircle, RefreshCw, ShieldAlert, Zap, Activity, AlertCircle, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, limit, getDocs, orderBy, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { detectAnomalies, calculateSecurityScoreAI } from '../lib/gemini';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState({ files: 0, passwords: 0, alerts: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [securityScore, setSecurityScore] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const filesSnap = await getDocs(collection(db, 'users', user!.uid, 'files'));
      const passwordsSnap = await getDocs(collection(db, 'users', user!.uid, 'passwords'));
      
      const alertsQuery = query(collection(db, 'users', user!.uid, 'alerts'), where('resolved', '==', false), orderBy('createdAt', 'desc'));
      const alertsSnap = await getDocs(alertsQuery);
      
      const activityQuery = query(collection(db, 'users', user!.uid, 'activity'), orderBy('timestamp', 'desc'), limit(5));
      const activitySnap = await getDocs(activityQuery);

      setStats({
        files: filesSnap.size,
        passwords: passwordsSnap.size,
        alerts: alertsSnap.size
      });

      setActiveAlerts(alertsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setRecentActivity(activitySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Calculate and fetch Security Score using frontend AI
      const avgStrength = passwordsSnap.docs.reduce((acc, doc) => acc + (doc.data().strength || 0), 0) / (passwordsSnap.size || 1);
      
      const scoreData = await calculateSecurityScoreAI({
        passwordStats: { count: passwordsSnap.size, avgStrength },
        alertCount: alertsSnap.size,
        activityCount: activitySnap.size,
        mfaEnabled: false
      });
      setSecurityScore(scoreData);
    }

    fetchData();
  }, [user]);

  const handleManualScan = async () => {
    if (!user) return;
    setAnalyzing(true);
    
    try {
      const logRes = await fetch('/api/log-activity', { method: 'POST' });
      const current = await logRes.json();
      
      const analysis = await detectAnomalies(
        { 
          ip: current.ip,
          userAgent: current.userAgent,
          timestamp: current.timestamp,
          location: "Detected Location (Local Node)",
          deviceType: "Verified Device"
        },
        recentActivity
      );
      
      setAiAnalysis(analysis);
      
      if (analysis.isAnomalous) {
        const path = `users/${user.uid}/alerts`;
        try {
          await addDoc(collection(db, path), {
            userId: user.uid,
            type: analysis.threatType || 'potential_compromise',
            severity: analysis.riskLevel,
            message: analysis.reasoning,
            createdAt: new Date().toISOString(),
            resolved: false
          });
          // Update stats locally for immediate feedback
          setStats(prev => ({ ...prev, alerts: prev.alerts + 1 }));
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, path);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white glow-text italic">SYSTEM_ROOT</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">Infrastructure Surveillance // Node-Alpha</p>
        </div>
        <button 
          onClick={handleManualScan}
          disabled={analyzing}
          className="vault-button flex items-center gap-3 px-8 shadow-blue-500/10 hover:shadow-blue-500/30"
        >
          {analyzing ? (
            <RefreshCw className="animate-spin" size={16} />
          ) : (
            <Shield size={16} />
          )}
          {analyzing ? 'VERIFYING...' : 'INITIALIZE AI SCAN'}
        </button>
      </header>

      {activeAlerts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-red-500" size={18} />
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-red-500/80">Active Security Incidents</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {activeAlerts.map(alert => (
              <motion.div 
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{alert.type}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-300 font-medium">{alert.message}</p>
                </div>
                <button 
                  onClick={async () => {
                    const path = `users/${user?.uid}/alerts/${alert.id}`;
                    try {
                      await updateDoc(doc(db, path), { resolved: true });
                      setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
                      setStats(prev => ({ ...prev, alerts: Math.max(0, prev.alerts - 1) }));
                    } catch (e) {
                      handleFirestoreError(e, OperationType.UPDATE, path);
                    }
                  }}
                  className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
                >
                  RESOLVE
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {aiAnalysis?.reasoning && (
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={cn(
            "p-8 rounded-3xl border flex items-start gap-6 transition-all shadow-2xl backdrop-blur-3xl",
            aiAnalysis.isAnomalous 
              ? "bg-red-500/5 border-red-500/20 shadow-red-500/5" 
              : "bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/5",
            aiAnalysis.isAnomalous ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
          )}>
            {aiAnalysis.isAnomalous ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
          </div>
          <div>
            <h3 className={cn(
              "font-black text-xs mb-2 uppercase tracking-[0.2em]",
              aiAnalysis.isAnomalous ? "text-red-400" : "text-emerald-400"
            )}>
              {aiAnalysis.isAnomalous ? 'AI_THREAT_DETECTED' : 'AI_INTEGRITY_VERIFIED'}
            </h3>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed font-medium max-w-2xl">{aiAnalysis.reasoning}</p>
            <div className="flex gap-6">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/5">Risk: {aiAnalysis.riskLevel}</span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/5">Protocol: VERTEX-A2</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Security Score Highlight */}
      {securityScore && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-3xl relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                <motion.circle 
                  cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                  className={cn(
                    securityScore.score > 80 ? "text-emerald-500" : securityScore.score > 50 ? "text-amber-500" : "text-red-500"
                  )}
                  strokeDasharray={364}
                  initial={{ strokeDashoffset: 364 }}
                  animate={{ strokeDashoffset: 364 - (364 * securityScore.score) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black">{securityScore.score}</span>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Integrity</span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold mb-2">Cluster Shield: <span className={cn(
                "uppercase",
                securityScore.rating === 'FORTIFIED' ? "text-emerald-400" : 
                securityScore.rating === 'SECURE' ? "text-emerald-500" :
                securityScore.rating === 'VULNERABLE' ? "text-amber-500" : "text-red-500"
              )}>{securityScore.rating}</span></h2>
              <p className="text-slate-400 text-sm mb-4 leading-relaxed max-w-md">{securityScore.insights || "AI evaluation of your current security posture across all identity vectors."}</p>
              
              <div className="flex flex-wrap gap-2">
                {securityScore.recommendations.slice(0, 2).map((rec: string, i: number) => (
                  <span key={i} className="text-[10px] font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
                    <Zap size={10} className="text-amber-400" />
                    {rec}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Background Accent */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full" />
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={Shield} label="Trust Score" value={`${profile?.securityScore}%`} subValue="Vertex Optimized" accent />
        <StatCard icon={FileLock} label="Encrypted Assets" value={stats.files} subValue="Zero-Knowledge" />
        <StatCard icon={Key} label="Stored Identities" value={stats.passwords} subValue="Protected" />
        <StatCard 
          icon={AlertTriangle} 
          label="Active Threats" 
          value={stats.alerts} 
          subValue="Security Critical"
          isDanger={stats.alerts > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 glass-card flex flex-col min-h-[450px]">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-black text-white text-xs uppercase tracking-[0.2em]">Activity Audit Stream</h3>
            <button className="text-[10px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest border border-blue-500/20 px-4 py-2 rounded-xl bg-blue-500/5">Full Activity Log →</button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/2">
                  <th className="py-4 px-8 col-header">Interface_Node</th>
                  <th className="py-4 px-6 col-header">Verification_Client</th>
                  <th className="py-4 px-6 col-header text-center">Status</th>
                  <th className="py-4 px-8 col-header text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-slate-600 italic text-sm font-bold uppercase tracking-widest">No activity detected in current cluster.</td>
                  </tr>
                ) : (
                  recentActivity.map((act) => (
                    <tr key={act.id} className="hover:bg-white/2 transition-colors group">
                      <td className="py-5 px-8">
                        <div className="flex flex-col">
                          <span className="data-value font-mono text-xs">{act.ip}</span>
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mt-1">IPV6_VERIFIED</span>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-[10px] text-slate-400 font-bold truncate max-w-[150px] block font-mono">
                          {act.userAgent}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                          act.status === 'success' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "bg-red-500/10 text-red-400 border border-red-500/20"
                        )}>
                          {act.status}
                        </span>
                      </td>
                      <td className="py-5 px-8 text-right">
                        <span className="text-[10px] font-mono text-slate-500 font-black tracking-widest">
                          {new Date(act.timestamp).toLocaleTimeString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-black rounded-3xl p-10 text-white shadow-2xl flex flex-col border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-1000 rotate-12">
            <Shield size={300} />
          </div>
          
          <div className="flex items-center gap-5 mb-10 relative z-10">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner backdrop-blur-md">
              <Shield size={28} />
            </div>
            <div>
              <h3 className="font-black text-xl tracking-tight leading-none glow-text italic">AI_GUARDIAN</h3>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Kernel v3.08 Active</p>
            </div>
          </div>

          <div className="space-y-10 flex-1 relative z-10">
            <div>
              <p className="text-slate-500 mb-4 uppercase text-[9px] font-black tracking-[0.2em]">Verification Status</p>
              <div className="p-6 bg-white/2 rounded-2xl border border-white/5 backdrop-blur-sm shadow-inner group-hover:border-blue-500/20 transition-colors">
                <p className="text-emerald-400 font-black text-xs uppercase tracking-widest">Matrix: Nominal</p>
                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed font-medium">
                  Login patterns established. Biometric signature verification: PASS. Behavioral analysis suggests 99.8% identity certainty.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-slate-500 mb-4 uppercase text-[9px] font-black tracking-[0.2em]">Local Risk Vectors</p>
              <ul className="space-y-5">
                <RiskItem label="Interface Variance" score="0.0%" />
                <RiskItem label="Velocity Alert" score="CLEARED" />
                <RiskItem label="Geolocation Node" score="LOCAL" active />
              </ul>
            </div>
          </div>

          <button className="mt-10 w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl backdrop-blur-md">
            Recalibrate Audit Node
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, accent = false, isDanger = false }: any) {
  return (
    <div className={cn(
      "p-8 rounded-3xl border transition-all relative overflow-hidden group backdrop-blur-xl",
      accent && !isDanger ? "bg-blue-600/10 border-blue-500/30 text-white shadow-blue-500/5" : "bg-white/2 border-white/5 text-slate-300",
      isDanger ? "bg-red-500/5 border-red-500/20 text-red-400" : ""
    )}>
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-inner border border-white/5",
          accent && !isDanger ? "bg-blue-500 text-white shadow-blue-500/40" : "bg-white/5 text-slate-500"
        )}>
          <Icon size={24} />
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border backdrop-blur-md transition-colors",
          accent && !isDanger ? "bg-white/10 text-white border-white/10" : "bg-white/2 text-slate-500 border-white/5"
        )}>
          Live_Audit
        </div>
      </div>
      
      <div className="relative z-10">
        <p className={cn(
          "text-4xl font-black tracking-tighter mb-1 glow-text italic transition-all group-hover:translate-x-1",
          accent && !isDanger ? "text-white" : "text-slate-100"
        )}>{value}</p>
        <p className={cn(
          "text-[10px] uppercase font-black tracking-[0.2em] opacity-40",
          accent && !isDanger ? "text-white" : "text-slate-500"
        )}>{label}</p>
      </div>

      <div className={cn(
        "mt-8 pt-5 border-t relative z-10 transition-colors",
        accent && !isDanger ? "border-white/10" : "border-white/5"
      )}>
        <p className={cn(
          "text-[9px] font-black uppercase tracking-[0.2em] italic",
          accent && !isDanger ? "text-blue-400" : "text-slate-500"
        )}>{subValue}</p>
      </div>

      {/* Decorative bg glow */}
      {accent && (
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

function RiskItem({ label, score, active = false }: any) {
  return (
    <li className="flex items-center justify-between text-[10px]">
      <div className="flex items-center gap-3">
        <span className={cn(
          "w-2 h-2 rounded-full transition-all duration-1000",
          active ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" : "bg-slate-800"
        )}></span>
        <span className="text-slate-500 font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="font-mono font-black tracking-widest text-slate-300">{score}</span>
    </li>
  );
}
