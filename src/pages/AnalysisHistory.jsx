import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import {
  RefreshCw, Search, FileText,
  Image as ImageIcon, AlertTriangle, CheckCircle2, Shield,
  Trash2, X
} from 'lucide-react';

// Shared Util Import
import { getVerdictCategory, getVerdictColor, SCORE_THRESHOLDS } from '../utils/verdict';

const AnalysisHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const COLORS = ['#10b981', '#ef4444', '#9ca3af'];

  const getApiBase = () =>
    import.meta.env.VITE_API_BASE_URL || 'https://inas-00-factfusion-backend.hf.space';

  // ── FETCH ────────────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const userString = localStorage.getItem('user');
      let url = `${getApiBase()}/api/v1/analysis-history`;
      if (userString) {
        try {
          const user = JSON.parse(userString);
          if (user && user.id && user.role !== 'admin') {
            url += `?user_id=${user.id}`;
          }
        } catch (e) {
          console.error("Error parsing user for history query:", e);
        }
      }
      const response = await axios.get(url);
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

  // ── DELETE LOGIC ─────────────────────────────────────────────────────────
  const deleteOne = async (id) => {
    try {
      await axios.delete(`${getApiBase()}/api/v1/analysis/${id}`);
      setHistory(prev => prev.filter(item => (item.id || item._id) !== id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete record. Please try again.');
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected record${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id =>
        axios.delete(`${getApiBase()}/api/v1/analysis/${id}`)
      ));
      setHistory(prev => prev.filter(item => !selectedIds.has(item.id || item._id)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk delete failed:', err);
      alert('Some records could not be deleted. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const clearAll = async () => {
    if (!window.confirm(`Delete ALL ${history.length} records? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await Promise.all(history.map(item =>
        axios.delete(`${getApiBase()}/api/v1/analysis/${item.id || item._id}`)
      ));
      setHistory([]);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Clear all failed:', err);
      alert('Some records could not be deleted. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // ── SELECTION LOGIC ───────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (filteredHistory) => {
    if (selectedIds.size === filteredHistory.length && filteredHistory.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredHistory.map(item => item.id || item._id)));
    }
  };

  // ── DERIVED DATA ──────────────────────────────────────────────────────────
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
    { name: 'Informative', value: history.filter(h => getVerdictCategory(h.verdict) === 'Informative').length },
    { name: 'Non-Informative', value: history.filter(h => getVerdictCategory(h.verdict) === 'Non-Informative').length },
    { name: 'OOD', value: history.filter(h => getVerdictCategory(h.verdict) === 'OOD').length },
  ];

  const chartData = useMemo(() => {
    return history.slice(0, 10).reverse().map((item, index) => {
      let label = "";
      if (item.text_snippet) {
        const words = item.text_snippet.split(' ');
        label = words.length > 2 ? words.slice(0, 2).join(' ') + '...' : item.text_snippet.substring(0, 15) + (item.text_snippet.length > 15 ? '...' : '');
      } else if (item.image_ref) {
        label = "Image Content";
      } else {
        label = `Analysis #${index + 1}`;
      }
      const confidence = item.credibility_score || 0;
      const percentage = Math.round(confidence * 100);
      return {
        name: label,
        score: percentage === 0 ? 2 : percentage,
        realScore: percentage,
        fullText: item.text_snippet || "No text content"
      };
    });
  }, [history]);

  const allSelectedOnPage = filteredHistory.length > 0 && selectedIds.size === filteredHistory.length;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#020617] text-white pt-32 px-6 pb-20 selection:bg-blue-500/30 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* --- Header Section --- */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <header>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
            >
              <Shield className="text-blue-400 w-4 h-4" />
              <span className="text-[10px] font-black tracking-[0.2em] text-blue-300 uppercase">Integrity Archive</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl font-black tracking-tighter leading-[0.9]"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-blue-200">
                Crisis <span className="text-blue-500 inline-block drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">Analytics</span>
              </span>
            </motion.h1>
          </header>

          {/* Search/Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search verdicts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 w-full md:w-[280px] focus:border-blue-500/50 outline-none transition-all text-sm font-bold"
              />
            </div>
            <button
              onClick={fetchHistory}
              className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl hover:bg-blue-600/20 text-blue-400 transition-all active:scale-95"
              title="Refresh"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            {/* Clear All */}
            {history.length > 0 && (
              <button
                onClick={clearAll}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 text-red-400 transition-all active:scale-95 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                title="Delete all records"
              >
                <Trash2 size={16} /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* --- Bulk Action Bar --- */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-4 mb-6 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
          >
            <span className="text-sm font-black text-red-300">
              {selectedIds.size} record{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-300 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete Selected'}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-2 rounded-xl hover:bg-white/10 text-white/40 transition-all"
                title="Clear selection"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}

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
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
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
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
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
                    contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', padding: '10px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value, name, props) => {
                      const realScore = props.payload.realScore !== undefined ? props.payload.realScore : value;
                      return [`${realScore}%`, 'Confidence'];
                    }}
                    labelFormatter={(label) => `Content: ${label}`}
                  />
                  <Bar dataKey="score" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={24} name="Confidence Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- Logs Table --- */}
        <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] overflow-hidden backdrop-blur-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  {/* Styled Header Checkbox */}
                  <th className="pl-8 pr-2 py-6 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={() => toggleSelectAll(filteredHistory)}
                      className="w-3.5 h-3.5 rounded border-white/20 bg-slate-900 text-blue-500 focus:ring-0 focus:ring-offset-0 accent-blue-500 cursor-pointer transition-all mix-blend-screen opacity-70 hover:opacity-100"
                      title="Select all"
                    />
                  </th>
                  <th className="px-8 py-6 text-xs font-bold text-blue-400 uppercase tracking-widest">Source Content</th>
                  <th className="px-8 py-6 text-xs font-bold text-blue-400 uppercase tracking-widest text-center">Modality</th>
                  <th className="px-8 py-6 text-xs font-bold text-blue-400 uppercase tracking-widest">Analysis Insights</th>
                  <th className="px-8 py-6 text-xs font-bold text-blue-400 uppercase tracking-widest text-right">Credibility</th>
                  <th className="px-6 py-6 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan="6" className="py-32 text-center text-white/10 font-black uppercase text-xs tracking-widest animate-pulse">Neural Synchronization...</td></tr>
                ) : filteredHistory.length === 0 ? (
                  <tr><td colSpan="6" className="py-20 text-center text-white/30 italic font-medium">No archive records found.</td></tr>
                ) : filteredHistory.map((item, idx) => {
                  const id = item.id || item._id;
                  const isSelected = selectedIds.has(id);
                  const cat = getVerdictCategory(item.verdict);
                  const catColor = getVerdictColor(cat);

                  return (
                    <tr
                      key={id || idx}
                      className={`group transition-all duration-300 ${isSelected ? 'bg-red-500/[0.04]' : 'hover:bg-blue-500/[0.02]'}`}
                    >
                      {/* Styled Row Checkbox */}
                      <td className="pl-8 pr-2 py-6 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(id)}
                          className="w-3.5 h-3.5 rounded border-white/20 bg-slate-900 text-blue-500 focus:ring-0 focus:ring-offset-0 accent-blue-500 cursor-pointer transition-all mix-blend-screen opacity-60 group-hover:opacity-100"
                        />
                      </td>
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
                          <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter ${catColor}`}>
                            {cat === 'Informative' ? <CheckCircle2 size={12} /> :
                              cat === 'Non-Informative' ? <AlertTriangle size={12} /> : <Shield size={12} />}
                            {item.verdict || "UNCATEGORIZED"}
                          </div>
                          <p className="text-[11px] text-white/40 font-medium leading-relaxed max-w-sm group-hover:text-white/70 transition-colors">
                            {(item.xai_insights?.explanation || "Neural engine explanation pending.").split(' | Audit Path: ')[0]}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className={`font-mono text-xl font-black ${item.credibility_score > SCORE_THRESHOLDS.HIGH ? 'text-emerald-400' : 'text-red-400'}`}>
                          {((item.credibility_score || 0) * 100).toFixed(0)}%
                        </span>
                      </td>
                      {/* Single delete */}
                      <td className="px-6 py-6">
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this record? This cannot be undone.')) deleteOne(id);
                          }}
                          className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-all"
                          title="Delete record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalysisHistory;