import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Eye, Target, ShieldCheck, Zap, BarChart } from 'lucide-react';

const About = () => {
  // Features for the mini-grid
  const stats = [
    { label: "Data Input", value: "Multi-Source", icon: Zap },
    { label: "Technology", value: "Real-Time AI", icon: Cpu },
    { label: "Visibility", value: "Transparent", icon: Eye },
    { label: "Reliability", value: "High Precision", icon: BarChart },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-24">

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] tracking-[0.2em] text-blue-300 uppercase font-bold">Disaster Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black mb-8 tracking-tighter">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">FactFusion</span>
          </h1>
          <p className="text-xl text-blue-100/60 leading-relaxed max-w-3xl mx-auto font-light">
            Empowering crisis response with verified information.
            FactFusion utilizes <span className="text-blue-400 font-medium">advanced AI</span> to validate disaster-related data, providing clarity when it matters most.
          </p>
        </motion.div>

        {/* Stats/Quick Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center"
            >
              <stat.icon className="w-5 h-5 text-blue-500 mb-2" />
              <span className="text-[10px] text-blue-100/40 uppercase tracking-widest mb-1">{stat.label}</span>
              <span className="text-sm font-bold text-blue-100">{stat.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Project Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Pillar 1: Multimodal Fusion */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group p-8 rounded-3xl bg-blue-900/10 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-500 backdrop-blur-sm"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Cpu className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-blue-400 font-bold text-2xl mb-4">Instant Verification</h3>
            <p className="text-blue-100/40 leading-relaxed group-hover:text-blue-100/70 transition-colors">
              We cross-reference <span className="text-blue-300">text and visual data</span> to validate events in real-time.
              This bridges the gap between public reports and verified ground truth, enabling faster response times.
            </p>
          </motion.div>

          {/* Pillar 2: Explainable AI (XAI) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group p-8 rounded-3xl bg-purple-900/10 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-500 backdrop-blur-sm"
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Eye className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-purple-400 font-bold text-2xl mb-4">Transparent Analysis</h3>
            <p className="text-blue-100/40 leading-relaxed group-hover:text-blue-100/70 transition-colors">
              Our <span className="text-purple-300">explainable AI</span> identifies manipulated images and unverified text.
              This provides authorities with clear, actionable evidence to support critical decision-making.
            </p>
          </motion.div>
        </div>

        {/* Primary Goal Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative p-12 rounded-[3rem] bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 overflow-hidden text-center"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Target size={200} />
          </div>

          <h3 className="text-white font-bold text-3xl mb-6">Our Mission</h3>
          <p className="text-blue-100/60 text-lg leading-relaxed max-w-2xl mx-auto">
            To provide a resilient digital infrastructure for disaster management.
            We aim to ensure that information sharing directly supports effective rescue and relief operations.
          </p>

          <div className="mt-10 flex justify-center gap-3">
            {[1, 2, 3].map((dot) => (
              <div key={dot} className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: `${dot * 0.2}s` }} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;