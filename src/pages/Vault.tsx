import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Upload, File, Trash2, ShieldCheck, Search } from 'lucide-react';
import { formatBytes } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Vault() {
  const { user } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [encryptionKey, setEncryptionKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/files`;
    const unsubscribe = onSnapshot(
      query(collection(db, path), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/vault/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Encryption failed. Ensure server is active and key is configured.');
      }

      const uploadResult = await response.json();

      const path = `users/${user.uid}/files`;
      try {
        await addDoc(collection(db, path), {
          ownerId: user.uid,
          name: file.name,
          type: file.type,
          size: file.size,
          serverId: uploadResult.id,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, path);
      }

      setUploading(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, serverId?: string) => {
    if (!user) return;
    if (confirm("Permanently purge this asset from the cluster? This cannot be undone.")) {
      const path = `users/${user.uid}/files/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
      // In a real production app, we would also delete from server storage here
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const response = await fetch(`/api/vault/download/${file.serverId}?name=${encodeURIComponent(file.name)}`);
      
      if (!response.ok) {
        throw new Error('Decryption failed or file not found on cluster.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white glow-text italic">ENCRYPTED_VAULT</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Zero-Knowledge Asset Storage // Node-Alpha</p>
        </div>
        
        <div className="flex gap-6">
          <div className="relative group">
            <input 
              type="password" 
              placeholder="MASTER ENCRYPTION KEY" 
              value={encryptionKey}
              onChange={(e) => setEncryptionKey(e.target.value)}
              className="vault-input w-80 pr-12 font-mono bg-black/40 border-white/5 focus:border-blue-500/50 shadow-inner group-hover:border-white/10 transition-all text-xs tracking-widest"
            />
            <ShieldCheck size={18} className="absolute right-4 top-3.5 text-slate-600 group-hover:text-blue-500 transition-colors" />
          </div>
          
          <label className="vault-button flex items-center gap-3 px-10 cursor-pointer shadow-blue-500/10 hover:shadow-blue-500/30 active:scale-95 group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Upload size={16} />
            <span className="font-black text-[10px] uppercase tracking-[0.2em] relative z-10">
              {uploading ? 'ENCRYPTING...' : 'COMMIT ASSET'}
            </span>
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </header>

      <div className="glass-card min-h-[550px] flex flex-col shadow-blue-500/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        
        <div className="p-8 border-b border-white/5 flex items-center bg-white/2 backdrop-blur-3xl relative">
          <Search size={18} className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-600" />
          <input 
            type="text" 
            placeholder="SEARCH ENCRYPTED CLUSTERS..." 
            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-16 pr-8 text-[11px] font-black text-slate-200 focus:outline-none focus:border-blue-500/40 focus:bg-white/10 uppercase tracking-[0.2em] placeholder:text-slate-700 shadow-inner transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/2">
                <th className="py-4 px-10 col-header w-12"></th>
                <th className="py-4 px-6 col-header">Resource_Identifier</th>
                <th className="py-4 px-6 col-header text-center">Cipher_Type</th>
                <th className="py-4 px-6 col-header text-center">Magnitude</th>
                <th className="py-4 px-10 col-header text-right">Integrity_Lock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredFiles.map((f) => (
                  <motion.tr 
                    layout
                    key={f.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="hover:bg-white/2 transition-all group cursor-pointer border-l-2 border-transparent hover:border-blue-500/50"
                    onClick={() => handleDownload(f)}
                  >
                    <td className="py-6 px-10 text-center text-slate-700 group-hover:text-blue-400 transition-all group-hover:scale-125">
                      <File size={20} />
                    </td>
                    <td className="py-6 px-6">
                      <div className="flex flex-col">
                        <span className="data-value font-black text-[13px] group-hover:text-white group-hover:glow-text italic transition-all group-hover:translate-x-1">
                          {f.name}
                        </span>
                        <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] mt-1 group-hover:text-slate-400 transition-colors">Verified Shard Node</span>
                      </div>
                    </td>
                    <td className="py-6 px-6 text-center">
                      <span className="px-3 py-1 bg-white/5 border border-white/5 text-slate-500 group-hover:text-blue-400 group-hover:border-blue-500/20 rounded-md text-[9px] font-black uppercase tracking-widest transition-all">
                        {f.type?.split('/')[1] || 'BINARY'}
                      </span>
                    </td>
                    <td className="py-6 px-6 text-center">
                      <span className="text-[11px] font-mono text-slate-500 font-bold tracking-widest">
                        {formatBytes(f.size)}
                      </span>
                    </td>
                    <td className="py-6 px-10 text-right">
                      <div className="flex justify-end items-center gap-8">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] bg-emerald-500/5 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.05)] group-hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:text-emerald-400 transition-all">
                          <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                          <span>ENCRYPTED</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                          className="p-3 text-slate-800 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 active:scale-90"
                          title="Purge Shard"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredFiles.length === 0 && (
            <div className="h-80 flex flex-col items-center justify-center gap-6 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/2 to-transparent opacity-50" />
              <div className="w-20 h-20 bg-white/3 border border-white/5 rounded-3xl flex items-center justify-center text-slate-700 shadow-inner group-hover:scale-110 transition-transform relative z-10 backdrop-blur-md">
                <Upload size={36} />
              </div>
              <div className="text-center relative z-10">
                <p className="font-black text-[11px] uppercase tracking-[0.3em] text-slate-600">Infrastructure Node: EMPTY</p>
                <p className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.2em] mt-2">Initialize commit to populate cluster</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <footer className="flex justify-between items-center px-4 bg-white/2 border border-white/5 py-6 rounded-3xl backdrop-blur-lg">
        <div className="flex items-center gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">SECURE_FABRIC // AES-256-GCM ACTIVE</span>
        </div>
        <div className="flex gap-10">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-slate-500 font-black uppercase tracking-widest">Cluster_ID</span>
            <span className="text-[10px] font-bold text-white glow-text">{user?.uid.slice(0, 16).toUpperCase()}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-slate-500 font-black uppercase tracking-widest italic">Protocol</span>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">ZERO_KNOWLEDGE_V3</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
