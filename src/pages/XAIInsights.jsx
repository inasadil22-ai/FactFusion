import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Image as ImageIcon, Fingerprint, Cpu, Target, Zap, Activity, ShieldCheck } from 'lucide-react';

const XAIInsights = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-hidden relative font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20">
        
        {/* --- Header Section (Aligned with Detection Page Style) --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <Fingerprint className="text-blue-400 w-4 h-4" />
            <span className="text-[10px] font-black tracking-[0.2em] text-blue-300 uppercase">Neural Interpretability Layer</span>
          </div>
          
          <h1 className="text-5xl md:text-5xl font-black mb-6 tracking-tighter">
            Explainable AI <span className="text-blue-500">Evidence</span>
          </h1>
          <p className="text-white/40 max-w-2xl text-lg font-medium leading-relaxed">
            FactFusion provides cryptographic evidence for every detection. We map attention weights to reveal the data points that triggered the system.
          </p>
        </motion.div>

        {/* --- Card Grid (Enforced Uniformity with Rounded Boxes) --- */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          
          {/* Card 1: Textual Attention */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl hover:border-blue-500/30 transition-all duration-500 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                <MessageSquare size={24} className="text-blue-400" /> Textual Attention
              </h2>
              <Cpu size={20} className="text-blue-500/40" />
            </div>

            <div className="flex-1">
              <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5 font-mono text-sm leading-relaxed mb-8 relative overflow-hidden h-44 flex items-center">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500/40 animate-[scan_4s_linear_infinite]" />
                <p className="text-blue-100/60">
                  "The <span className="bg-blue-500/30 text-white px-2 py-0.5 rounded-md">unverified</span> reports regarding the <span className="bg-indigo-500/20 text-white px-2 py-0.5 rounded-md">incident</span> were flagged as <span className="bg-blue-500/30 text-white px-2 py-0.5 rounded-md">synthetic</span> by the NLP core."
                </p>
              </div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-relaxed">
                Transformer Weights • Token Risk Analysis • Sentiment Mapping
              </p>
            </div>
          </motion.div>
          
          {/* Card 2: Visual Saliency */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl hover:border-indigo-500/30 transition-all duration-500 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                <ImageIcon size={24} className="text-indigo-400" /> Visual Saliency
              </h2>
              <Target size={20} className="text-indigo-500/40" />
            </div>

            <div className="flex-1">
              <div className="relative bg-black/40 rounded-[2rem] border border-white/5 overflow-hidden h-44 group/img flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-500/5" />
                <div className="absolute w-24 h-24 bg-blue-500/20 blur-3xl rounded-full animate-pulse top-4 left-10" />
                <div className="absolute w-28 h-28 bg-indigo-500/20 blur-3xl rounded-full bottom-4 right-10" />
                
                <div className="relative z-10 text-center">
                  <Activity size={32} className="text-indigo-400/30 mx-auto mb-2" />
                  <span className="text-[10px] font-black tracking-[0.3em] text-indigo-400/50 uppercase">Grad-CAM Active</span>
                </div>
              </div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-relaxed mt-8">
                Pixel Importance • Class Activation Mapping • CNN Forensic Trace
              </p>
            </div>
          </motion.div>
        </div>

        {/* --- Bottom Logic Block (Matching Verdict Card Style) --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 p-10 rounded-[3.5rem] bg-blue-500/5 border-2 border-blue-500/20 flex flex-col md:flex-row items-center gap-10"
        >
          <div className="w-20 h-20 rounded-[2rem] bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Zap size={36} className="text-blue-400" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">Cross-Modal Logic</h3>
            <p className="text-white/40 text-base font-medium leading-relaxed">
              Our FYP engine analyzes the semantic conflict between modalities via the <span className="text-white">Fusion Gate</span> to calculate final credibility.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/10 text-center min-w-[100px]">
              <p className="text-[10px] font-black text-blue-400 mb-1 tracking-widest">ACCURACY</p>
              <p className="text-lg font-mono font-black">92.4%</p>
            </div>
            <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/10 text-center min-w-[100px]">
              <p className="text-[10px] font-black text-indigo-400 mb-1 tracking-widest">LATENCY</p>
              <p className="text-lg font-mono font-black">0.8s</p>
            </div>
          </div>
        </motion.div>

      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(400%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default XAIInsights;