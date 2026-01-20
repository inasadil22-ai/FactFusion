import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import {
  RefreshCw, Search, FileText,
  Image as ImageIcon, AlertTriangle, CheckCircle2, Shield
} from 'lucide-react';

const AnalysisHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // COLORS for Pie Chart: Informative (EMERALD), Non-Informative (RED), OOD (GRAY)
  const COLORS = ['#10b981', '#ef4444', '#9ca3af'];

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/v1/analysis-history');
      const data = Array.isArray(response.data) ? response.data : [];
      setHistory(data);
    } catch (err) {
      console.error("Connection Error:", err.message);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const query = searchQuery.toLowerCase();
      return (
        (item.text_snippet?.toLowerCase() || "").includes(query) ||
        (item.verdict?.toLowerCase() || "").includes(query) ||
        (item.xai_insights?.explanation?.toLowerCase() || "").includes(query)
      );
    });
  }, [searchQuery, history]);

  const pieData = [
    { name: 'Informative', value: history.filter(h => h.verdict === 'Informative').length },
    { name: 'Non-Informative', value: history.filter(h => h.verdict === 'Non-Informative').length },
    { name: 'OOD', value: history.filter(h => h.verdict === 'OOD').length },
  ];

  const chartData = useMemo(() => {
    return history.slice(0, 10).reverse().map((item, index) => {
      let label = "";

      if (item.text_snippet) {
        const words = item.text_snippet.split(' ');
        if (words.length > 2) {
          label = words.slice(0, 2).join(' ') + '...';
        } else {
          label = item.text_snippet.substring(0, 15) + (item.text_snippet.length > 15 ? '...' : '');
        }
      } else if (item.image_ref) {
        label = "Image Content";
      } else {
        label = `Analysis #${index + 1}`;
      }

      const confidence = item.credibility_score || 0;
      const percentage = Math.round(confidence * 100);

      return {
        name: label,
        // Visual floor: 2% height if score is 0, so a line appears
        score: percentage === 0 ? 2 : percentage,
        realScore: percentage, // Actual value for tooltip
        fullText: item.text_snippet || "No text content"
      };
    });
  }, [history]);

  return (
    <div className="min-h-screen bg-[#020617] text-white pt-32 px-6 pb-20 selection:bg-blue-500/30 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* --- Header Section (Detection Page Aesthetic) --- */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
              <Shield className="text-blue-400 w-3.5 h-3.5" />
              <span className="text-xs font-bold tracking-[0.2em] text-blue-300 uppercase">Integrity Archive</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
              Crisis <span className="text-blue-500">Analytics</span>
            </h1>
          </motion.div>

          {/* Search/Controls - Premium sizing but compact */}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search verdicts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 w-full md:w-[350px] focus:border-blue-500/50 outline-none transition-all text-sm font-bold"
              />
            </div>
            <button
              onClick={fetchHistory}
              className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl hover:bg-blue-600/20 text-blue-400 transition-all active:scale-95"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* --- Analytics Dashboard --- */}
        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[3rem] backdrop-blur-3xl">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-6 text-center">Detection Ratio</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-bold text-white/70 ml-2">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white/[0.03] border border-white/10 p-8 rounded-[3rem] backdrop-blur-3xl">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-6">Historical Confidence (%)</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 'bold' }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                      background: '#020617',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      padding: '10px'
                    }}
                    formatter={(value, name, props) => {
                      const realScore = props.payload.realScore !== undefined ? props.payload.realScore : value;
                      return [`${realScore}%`, 'Confidence'];
                    }}
                    labelFormatter={(label) => `Content: ${label}`}
                  />
                  <Bar
                    dataKey="score"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                    name="Confidence Score"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- Logs Table (Detection Rounded Style) --- */}
        <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] overflow-hidden backdrop-blur-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-8 py-6 text-xs font-bold text-blue-400 uppercase tracking-widest">Source Content</th>
                  <th className="px-8 py-6 text-xs font-bold text-blue-400 uppercase tracking-widest text-center">Modality</th>
                  <th className="px-8 py-6 text-xs font-bold text-blue-400 uppercase tracking-widest">Analysis Insights</th>
                  <th className="px-8 py-6 text-xs font-bold text-blue-400 uppercase tracking-widest text-right">Credibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan="4" className="py-32 text-center text-white/10 font-black uppercase text-xs tracking-widest animate-pulse">Neural Synchronization...</td></tr>
                ) : filteredHistory.length === 0 ? (
                  <tr><td colSpan="4" className="py-20 text-center text-white/30 italic font-medium">No archive records found.</td></tr>
                ) : filteredHistory.map((item, idx) => (
                  <tr key={item.id || idx} className="group hover:bg-blue-500/[0.04] transition-all duration-300">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm text-white/90 font-bold line-clamp-1 italic mb-1 group-hover:text-blue-400 transition-colors">
                          "{item.text_snippet || "Visual content analyzed"}"
                        </span>
                        <div className="flex gap-3 text-[9px] font-mono text-white/20 uppercase font-black">
                          <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "PENDING"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-4">
                        <FileText size={18} className={item.text_snippet ? "text-blue-400" : "text-white/5"} />
                        <ImageIcon size={18} className={item.image_ref ? "text-indigo-400" : "text-white/5"} />
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter ${item.verdict === 'Informative' ? 'text-emerald-400' :
                          item.verdict === 'Non-Informative' ? 'text-red-400' : 'text-gray-400'
                          }`}>
                          {item.verdict === 'Informative' ? <CheckCircle2 size={12} /> :
                            item.verdict === 'Non-Informative' ? <AlertTriangle size={12} /> : <Shield size={12} />}
                          {item.verdict || "UNCATEGORIZED"}
                        </div>
                        <p className="text-[11px] text-white/40 font-medium leading-relaxed max-w-sm group-hover:text-white/70 transition-colors">
                          {item.xai_insights?.explanation || "Neural engine explanation pending."}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className={`font-mono text-xl font-black ${item.credibility_score > 0.7 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {((item.credibility_score || 0) * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div >
  );
};

export default AnalysisHistory;