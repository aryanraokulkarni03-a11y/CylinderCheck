import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, ArrowRight, Loader2 } from 'lucide-react';
import LiquidGlassBtn from '../../components/shared/LiquidGlassBtn';

export default function AdminModal({ isOpen, onClose, onUnlock, loading }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    const success = await onUnlock(password);
    if (!success) {
      setError(true);
      setTimeout(() => setError(false), 2000);
      setPassword("");
    } else {
      setPassword("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center isolate p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-bg-body/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="relative w-full max-w-sm card bg-bg-inset border-border-color shadow-[0_20px_40px_rgba(0,0,0,0.2)] overflow-hidden"
        >
          {/* Accent border top */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-status-warning to-accent" />
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-full hover:bg-bg-body transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center pt-8 pb-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 ${
              error ? "bg-status-severe-soft text-status-severe border border-status-severe/20" : "bg-bg-body text-accent border border-accent/20 shadow-[0_0_15px_rgba(255,107,0,0.15)]"
            }`}>
              <Lock size={24} className={error ? "animate-pulse" : ""} />
            </div>
            
            <h2 className="text-xl font-bold font-display text-text-primary mb-2">Restricted Area</h2>
            <p className="text-[13px] text-text-secondary text-center max-w-[240px] mb-8 font-medium">
              Enter clearance code to access system metrics.
            </p>
            
            <form onSubmit={handleSubmit} className="w-full px-2 space-y-4">
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(false); }}
                  placeholder="Password"
                  autoFocus
                  className={`w-full bg-bg-body border rounded-[var(--radius-sm)] px-4 py-3 text-[16px] text-text-primary font-data tracking-[0.2em] text-center focus:outline-none focus:ring-2 transition-all ${
                    error ? "border-status-severe focus:ring-status-severe/20" : "border-border-color focus:border-accent focus:ring-accent/20"
                  }`}
                />
              </div>
              
              {error && (
                <p className="text-[11px] font-bold tracking-widest uppercase font-data text-status-severe text-center animate-bounce">
                  Access Denied
                </p>
              )}
              
              <LiquidGlassBtn 
                type="submit"
                className="w-full"
                disabled={!password || loading || error}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Authenticate"}
              </LiquidGlassBtn>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
