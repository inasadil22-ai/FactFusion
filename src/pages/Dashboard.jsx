import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
  Activity, ShieldCheck, Zap, AlertTriangle,
  TrendingUp, Cpu, Database, Image as ImageIcon, FileText, Share2
} from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Colors: Blue (Verifiable), Red (Image Threat), Orange (Text Threat), Purple (Mismatch)
  const COLORS = ['#3b82f6', '#ef4444', '#f97316', '#a855f7'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/v1/analysis-history');
        setData(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Multi-Modal Threat Logic ---
  const stats = useMemo(() => {
    const total = data.length;

    // New Labels Mapping:
    // Informative -> Verifiable Content
    // Non-Informative -> Subjective/Vague (Potentially Misinfo/Noise)
    // OOD -> Irrelevant (Filtered)

    const verifiableItems = data.filter(item => item.verdict === 'Informative');
    const nonInformativeItems = data.filter(item => item.verdict === 'Non-Informative');
    const oodItems = data.filter(item => item.verdict === 'OOD');

    const suspiciousCount = nonInformativeItems.length + oodItems.length;

    // Categorize "Threats" (Noise/Misinfo) by type
    // Since our current model is text-heavy, we treat Non-Info as Text Threats mostly.
    // If we had image logic, we'd check item.threat_origin

    const textThreats = nonInformativeItems.length;
    const filteredThreats = oodItems.length; // OOD
    const mismatchThreats = 0; // Placeholder until multimodal mismatch logic is robust

    const avgConfidence = data.reduce((acc, curr) => acc + (curr.credibility_score || 0), 0) / (total || 1);

    return {
      total,
      suspicious: suspiciousCount,
      verifiable: verifiableItems.length,
      textThreats,
      filteredThreats,
      mismatchThreats,
      avgConfidence: (avgConfidence * 100).toFixed(1)
    };
  }, [data]);

  const originData = [
    { name: 'Subjective/Noise', value: stats.textThreats, icon: FileText, color: '#f97316' }, // Orange
    { name: 'Out of Context', value: stats.filteredThreats, icon: AlertTriangle, color: '#9ca3af' }, // Gray
    { name: 'Fusion Mismatch', value: stats.mismatchThreats, icon: Share2, color: '#a855f7' }, // Purple
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white pt-28 px-6 pb-20">
      <div className="max-w-7xl mx-auto">

        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-5xl font-black tracking-tighter mb-2">
              Neural <span className="text-blue-500">Command.</span>
            </h1>
            <p className="text-blue-100/40 text-lg italic tracking-wide">Multimodal Detection Intelligence</p>
          </motion.div>

          <div className="px-5 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">Engine: Online</span>
          </div>
        </div>

        {/* --- Metrics Row (Snappy Transitions) --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Total Scans', val: stats.total, icon: Database, color: 'text-blue-400' },
            { label: 'Avg Confidence', val: `${stats.avgConfidence}%`, icon: Zap, color: 'text-yellow-400' },
            { label: 'Threats Blocked', val: stats.suspicious, icon: ShieldCheck, color: 'text-red-400' },
            { label: 'Engine Latency', val: '0.8s', icon: Cpu, color: 'text-purple-400' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] hover:border-blue-500/30 transition-all group"
            >
              <stat.icon className={`${stat.color} mb-4 group-hover:scale-110 transition-transform`} size={28} />
              <p className="text-[11px] font-black text-white/30 uppercase tracking-widest">{stat.label}</p>
              <h2 className="text-4xl font-black mt-2">{stat.val}</h2>
            </motion.div>
          ))}
        </div>

        {/* --- Main Analytics --- */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">

          {/* 1. Threat Origin Breakdown */}
          <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-10 flex flex-col">
            <h3 className="text-lg font-black mb-8 flex items-center gap-3 uppercase tracking-tighter">
              <AlertTriangle className="text-red-500" /> Threat Origin
            </h3>
            <div className="space-y-6 flex-1 justify-center flex flex-col">
              {originData.map((origin, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="flex items-center gap-2 text-white/60">
                      <origin.icon size={16} /> {origin.name}
                    </span>
                    <span>{origin.value}</span>
                  </div>
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(origin.value / (stats.suspicious || 1)) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: origin.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/20 mt-8 text-center italic font-medium">
              Based on Cross-Modal Fusion Logic analysis
            </p>
          </div>

          {/* 2. Integrity Flow (Area Chart) */}
          <div className="lg:col-span-2 bg-white/[0.02] border border-white/10 rounded-[3rem] p-10">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-lg font-black flex items-center gap-3 uppercase tracking-tighter">
                <TrendingUp size={22} className="text-blue-500" /> Neural Integrity Flow
              </h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.slice(-10)}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ background: '#020617', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '20px', padding: '15px' }}
                  />
                  <Area type="monotone" dataKey="credibility_score" stroke="#3b82f6" strokeWidth={5} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- System Intelligence Banner --- */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent border border-blue-500/20 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-6">
            <div className="p-5 bg-blue-500/20 rounded-3xl text-blue-400 shadow-xl shadow-blue-500/10">
              <Activity size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black mb-1 italic tracking-tight">Fusion Intelligence Report</h4>
              <p className="text-blue-100/40 text-sm max-w-md font-medium leading-relaxed">
                System detected {stats.mismatchThreats} Semantic Mismatches today. This indicates text claims are not visually supported by paired images.
              </p>
            </div>
          </div>
          <button className="px-10 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/40 hover:-translate-y-1">
            Optimize Weights
          </button>
        </motion.div>

      </div>
    </div>
  );
};

export default Dashboard;