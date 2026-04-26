import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Key, Eye, EyeOff, Plus, Trash2, Shield, Search, ExternalLink, RefreshCw, X } from 'lucide-react';
import CryptoJS from 'crypto-js';
import zxcvbn from 'zxcvbn';
import { checkPasswordStrengthAI } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Passwords() {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [masterKey, setMasterKey] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const [newTitle, setNewTitle] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [aiScore, setAiScore] = useState<any>(null);
  const [isCheckingAI, setIsCheckingAI] = useState(false);

  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/passwords`;
    const unsubscribe = onSnapshot(
      query(collection(db, path), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setPasswords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleAddPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !masterKey) {
      alert("Master Key required for encryption.");
      return;
    }

    const encrypted = CryptoJS.AES.encrypt(newPassword, masterKey).toString();
    const strength = zxcvbn(newPassword).score;

    const path = `users/${user.uid}/passwords`;
    try {
      await addDoc(collection(db, path), {
        ownerId: user.uid,
        title: newTitle,
        username: newUsername,
        encryptedPassword: encrypted,
        url: newUrl,
        strength,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }

    setNewTitle("");
    setNewUsername("");
    setNewPassword("");
    setNewUrl("");
    setShowForm(false);
    setAiScore(null);
  };

  const handleCheckAI = async () => {
    if (!newPassword) return;
    setIsCheckingAI(true);
    const result = await checkPasswordStrengthAI(newPassword);
    setAiScore(result);
    setIsCheckingAI(false);
  };

  const toggleVisibility = (id: string) => {
    if (!masterKey) {
      alert("Please provide the Master Key to decrypt.");
      return;
    }
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const decrypt = (encrypted: string) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, masterKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return "ERROR";
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (confirm("Delete this identity?")) {
      const path = `users/${user.uid}/passwords/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    }
  };

  const getStrengthColor = (score: number) => {
    if (score <= 1) return "bg-red-500";
    if (score === 2) return "bg-orange-500";
    if (score === 3) return "bg-emerald-500/70";
    return "bg-emerald-500";
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white glow-text italic">CREDENTIAL_VAULT</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Protected Identity Ledger // Node-Alpha</p>
        </div>
        
        <div className="flex gap-6">
          <div className="relative group">
            <input 
              type="password" 
              placeholder="MASTER KEY" 
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              className="vault-input w-48 text-center font-mono bg-black/40 border-white/5 focus:border-blue-500/50 shadow-inner text-xs tracking-[0.3em]"
            />
            <Key size={14} className="absolute right-4 top-4 text-slate-700 group-hover:text-blue-500 transition-colors" />
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="vault-button flex items-center gap-3 px-8 shadow-blue-500/10 hover:shadow-blue-500/30 overflow-hidden group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {showForm ? <X size={16} /> : <Plus size={16} />}
            <span className="font-black text-[10px] uppercase tracking-[0.2em] relative z-10">
              {showForm ? 'CANCEL' : 'COMMIT IDENTITY'}
            </span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddPassword} className="glass-card p-10 grid grid-cols-1 md:grid-cols-2 gap-10 border-blue-500/20 shadow-blue-500/5 mb-10">
              <div className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] ml-4 mb-3 block">Resource_Identifier</label>
                  <input required placeholder="e.g. ProtonMail Cluster" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="vault-input bg-black/20" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] ml-4 mb-3 block">Principal_Username</label>
                  <input required placeholder="node_admin@crypt.net" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="vault-input bg-black/20" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] ml-4 mb-3 block">Secret_Cipher_Payload</label>
                  <div className="flex gap-4">
                    <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="vault-input bg-black/20 font-mono tracking-widest" />
                    <button type="button" onClick={handleCheckAI} disabled={isCheckingAI} className="vault-button-secondary py-0 px-5 flex items-center justify-center min-w-[60px]">
                      {isCheckingAI ? <RefreshCw className="animate-spin text-blue-500" size={18} /> : <Shield size={18} className="text-blue-500" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] ml-4 mb-3 block">Interaction_Endpoint (URL)</label>
                  <input placeholder="https://..." value={newUrl} onChange={e => setNewUrl(e.target.value)} className="vault-input bg-black/20" />
                </div>
              </div>

              <div className="bg-white/2 rounded-3xl p-10 flex flex-col justify-between border border-white/5 backdrop-blur-md shadow-inner">
                <div>
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner transition-transform hover:scale-110">
                      <Shield size={22} />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-xs uppercase tracking-[0.15em] glow-text italic">Matrix_Validation</h4>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-none mt-1.5">Vertex AI Assessment</p>
                    </div>
                  </div>

                  {newPassword ? (
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Entropy Level</span>
                          <span className="text-[11px] font-mono font-black text-white glow-text">{Math.round((zxcvbn(newPassword).score + 1) * 25)}%</span>
                        </div>
                        <div className="flex gap-2">
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} className={cn("flex-1 h-1.5 rounded-full transition-all duration-1000", i <= zxcvbn(newPassword).score ? getStrengthColor(zxcvbn(newPassword).score) : "bg-white/5 shadow-inner")} />
                          ))}
                        </div>
                      </div>
                      
                      {aiScore && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-6 bg-white/2 rounded-2xl border border-white/5 backdrop-blur-sm group"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.1em]">AI Score: {aiScore.score}/100</span>
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]",
                              aiScore.score > 70 ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                            )} />
                          </div>
                          <p className="text-[11px] text-slate-400 italic leading-relaxed font-medium">{aiScore.feedback}</p>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic text-center opacity-40">
                      Awaiting cryptographic input...
                    </div>
                  )}
                </div>
                <button type="submit" className="vault-button w-full mt-10 py-5 text-[10px] uppercase tracking-[0.3em] font-black flex items-center justify-center gap-3">
                  <Key size={18} />
                  COMMIT TO VAULT
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card flex flex-col relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        
        <div className="p-8 border-b border-white/5 bg-white/2 flex items-center relative">
          <Search size={18} className="text-slate-700 absolute left-12" />
          <input 
            placeholder="FILTER ENCRYPTED CLUSTERS..." 
            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-16 pr-8 text-[11px] font-black text-slate-200 focus:outline-none focus:border-blue-500/40 focus:bg-white/10 uppercase tracking-[0.2em] placeholder:text-slate-800 shadow-inner transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/2">
                <th className="py-4 px-10 col-header w-12"></th>
                <th className="py-4 px-6 col-header">Principal_Identity</th>
                <th className="py-4 px-6 col-header">Verification_User</th>
                <th className="py-4 px-6 col-header">Secret_Allocation</th>
                <th className="py-4 px-10 col-header text-right">Integrity_Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {passwords.filter(p => p.title.toLowerCase().includes(search.toLowerCase())).map((p) => (
                  <motion.tr 
                    layout
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="hover:bg-white/2 transition-colors group cursor-pointer border-l-2 border-transparent hover:border-blue-500/50"
                  >
                    <td className="py-2 px-10 text-center text-slate-700 group-hover:text-blue-500 transition-all group-hover:scale-125">
                      <Key size={18} />
                    </td>
                    <td className="py-6 px-6">
                      <div className="flex flex-col">
                        <span className="data-value font-black text-[13px] group-hover:text-white group-hover:glow-text italic transition-all">{p.title}</span>
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noreferrer" className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest flex items-center gap-2 hover:text-blue-400 transition-colors mt-1.5 font-mono">
                            VERIFY_ENDPOINT <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-6 px-6">
                      <span className="text-[11px] font-mono font-bold text-slate-500 group-hover:text-slate-300 transition-colors">{p.username}</span>
                    </td>
                    <td className="py-6 px-6">
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-[11px] font-black tracking-[0.2em] text-white/50 group-hover:text-white transition-all">
                          {visiblePasswords[p.id] ? decrypt(p.encryptedPassword) : '••••••••••••'}
                        </span>
                        <button onClick={() => toggleVisibility(p.id)} className="text-slate-800 hover:text-blue-500 transition-all active:scale-90">
                          {visiblePasswords[p.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </td>
                    <td className="py-6 px-10 text-right">
                      <div className="flex justify-end items-center gap-8">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5 shadow-inner">
                           <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]", getStrengthColor(p.strength))} />
                           <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.1em]">{p.strength * 25}%</span>
                        </div>
                        <button onClick={() => handleDelete(p.id)} className="p-3 text-slate-800 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 active:scale-90">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {passwords.length === 0 && (
            <div className="h-80 flex flex-col items-center justify-center gap-6 opacity-30 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/2 to-transparent" />
              <div className="w-20 h-20 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-center text-slate-700 shadow-inner relative z-10 transition-transform group-hover:scale-110">
                <Shield size={36} />
              </div>
              <div className="text-center relative z-10">
                <p className="font-black text-[11px] uppercase tracking-[0.3em] text-slate-600">Infrastructure Node: EMPTY</p>
                <p className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.2em] mt-2 italic">Zero identity records detected in cluster</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
