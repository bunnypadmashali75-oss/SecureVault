import { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Shield, Lock, AlertCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" />;

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError("Authentication failed. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-vault-bg flex relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse" />
      
      {/* Hero Section */}
      <div className="hidden lg:flex lg:w-3/5 p-20 flex-col justify-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
        >
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl shadow-blue-500/40 transform hover:rotate-12 transition-transform">
              S
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white glow-text italic">SecureVault</h1>
          </div>
          
          <h2 className="text-7xl font-black text-white leading-tight mb-8 tracking-tighter">
            THE NEXT GEN <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 italic">SECURITY PROTOCOL.</span>
          </h2>
          
          <p className="text-xl text-slate-400 max-w-xl mb-12 leading-relaxed font-medium">
            Zero-knowledge encryption. AI-driven threat detection. 
            Military-grade storage for your most sensitive digital assets.
          </p>
          
          <div className="flex gap-12">
            <div className="flex flex-col">
              <span className="text-4xl font-black text-white mb-2 glow-text italic tracking-tighter">AES-256</span>
              <span className="text-[10px] uppercase font-black text-slate-600 tracking-[0.2em]">Encryption Standard</span>
            </div>
            <div className="h-16 w-px bg-white/10" />
            <div className="flex flex-col">
              <span className="text-4xl font-black text-white mb-2 glow-text italic tracking-tighter">AI_GUARD</span>
              <span className="text-[10px] uppercase font-black text-slate-600 tracking-[0.2em]">Real-time Defense</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Login Card */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="w-full max-w-md glass-card p-12 shadow-blue-500/5 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-1000">
             <Shield size={200} />
          </div>

          <div className="text-center mb-12 relative z-10">
            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter glow-text">Initialize Node</h3>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Access Secure Terminal</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-3 shadow-lg"
            >
              <AlertTriangle size={16} />
              {error}
            </motion.div>
          )}

          <div className="space-y-10 relative z-10">
            <button 
              onClick={handleGoogleLogin}
              className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-4 group shadow-xl backdrop-blur-md"
            >
              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </div>
              Authorize with Identity Provider
            </button>
            
            <div className="relative flex items-center justify-center">
              <div className="w-full h-px bg-white/5" />
              <span className="absolute px-6 bg-vault-card text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] backdrop-blur-3xl border border-white/5 py-1 rounded-full">Or Manual Override</span>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] ml-4 mb-3 block">Credentials_Email</label>
                <input 
                  type="email" 
                  disabled
                  placeholder="node_identifier@secure.net" 
                  className="vault-input opacity-40 cursor-not-allowed bg-black/20" 
                />
              </div>
              <div className="pt-2">
                <button 
                  disabled
                  className="w-full py-5 bg-blue-600/10 text-blue-500/50 border border-blue-500/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] opacity-40 cursor-not-allowed italic"
                >
                  Cipher Verification Locked
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-16 text-center relative z-10">
            <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.2em] leading-loose">
              By accessing node, you accept the <br />
              <span className="text-slate-500 hover:text-blue-500 cursor-pointer transition-colors hover:underline">Sovereignty Protocol v3.1</span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
    </div>
  );
}
