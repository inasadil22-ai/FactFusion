import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fingerprint, MessageSquare, Image as ImageIcon,
  Cpu, Target, Zap, Activity, ShieldCheck, ChevronDown,
  FileText, Layers, AlertTriangle, Clock, ArrowRight
} from 'lucide-react';
import { XAIVisualizer } from './Detection';

const API_BASE = 'http://127.0.0.1:5000';

const XAIInsights = () => {
  const [searchParams] = useSearchParams();
  const scanId = searchParams.get('id');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const userString = localStorage.getItem('user');
        let url = `${API_BASE}/api/v1/analysis-history`;
        if (userString) {
          try {
            const user = JSON.parse(userString);
            if (user && user.id && user.role !== 'admin') {
              url += `?user_id=${user.id}`;
            }
          } catch (e) {
            console.error("Error parsing user for XAI query:", e);
          }
        }
        const res = await axios.get(url);
        const data = Array.isArray(res.data) ? res.data : [];
        // Only keep records that have xai_insights
        const withXai = data.filter(r => r.xai_insights);
        setRecords(withXai);

        if (scanId && withXai.length > 0) {
          const idx = withXai.findIndex(r => r.id === scanId);
          if (idx !== -1) {
            setSelectedIdx(idx);
          }
        }
      } catch (err) {
        console.error('Failed to fetch analysis history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [scanId]);

  const selected = selectedIdx !== null ? (records[selectedIdx] || null) : null;
  const xai = selected?.xai_insights || {};
  const hasImage = selected?.image_ref && selected?.image_score !== null && selected?.image_score !== undefined;
  const hasText = !!selected?.text_snippet;
  const hasHeatmap = xai.visual_heatmap && Array.isArray(xai.visual_heatmap) && xai.visual_heatmap.length > 0;

  // Build a short label for each record in the selector
  const getRecordLabel = (record, idx) => {
    if (!record) return "Select a scan to inspect...";
    if (record.text_snippet) {
      const words = record.text_snippet.split(' ');
      return words.length > 5 ? words.slice(0, 5).join(' ') + '…' : record.text_snippet;
    }
    if (record.image_ref) return `Image: ${record.image_ref}`;
    return `Analysis #${idx + 1}`;
  };

  const getVerdictColor = (verdict) => {
    if (!verdict) return 'text-gray-400';
    if (verdict.includes('CREDIBLE') || verdict === 'Informative') return 'text-emerald-400';
    if (verdict.includes('MISINFORMATION') || verdict.includes('HIGH RISK') || verdict === 'Non-Informative') return 'text-red-400';
    if (verdict.includes('SUSPICIOUS') || verdict.includes('UNCERTAIN')) return 'text-amber-400';
    return 'text-gray-400';
  };

  const getVerdictBg = (verdict) => {
    if (!verdict) return 'bg-gray-500/10 border-gray-500/20';
    if (verdict.includes('CREDIBLE') || verdict === 'Informative') return 'bg-emerald-500/10 border-emerald-500/20';
    if (verdict.includes('MISINFORMATION') || verdict.includes('HIGH RISK') || verdict === 'Non-Informative') return 'bg-red-500/10 border-red-500/20';
    if (verdict.includes('SUSPICIOUS') || verdict.includes('UNCERTAIN')) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-gray-500/10 border-gray-500/20';
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-hidden relative font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20">

        {/* --- Header --- */}
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
          >
            <Fingerprint className="text-blue-400 w-4 h-4" />
            <span className="text-[10px] font-black tracking-[0.2em] text-blue-300 uppercase">Neural Interpretability Layer</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-[0.9]"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-blue-200">
              Explainable AI <span className="text-blue-500 inline-block drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">Evidence</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-blue-100/60 max-w-2xl leading-relaxed"
          >
            FactFusion provides cryptographic evidence for every detection. We map attention weights to reveal the data points that triggered the system.
          </motion.p>
        </header>

        {/* --- Loading State --- */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <Activity size={40} className="text-blue-500/40 mx-auto mb-4 animate-pulse" />
              <p className="text-xs font-black text-white/20 uppercase tracking-widest">Synchronizing Neural Archive...</p>
            </div>
          </div>
        )}

        {/* --- Empty State --- */}
        {!loading && records.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-24 h-24 rounded-[2rem] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-8">
              <Fingerprint size={40} className="text-blue-400/40" />
            </div>
            <h3 className="text-2xl font-black mb-3 tracking-tight">No Analyses Yet</h3>
            <p className="text-white/40 max-w-md mb-8 font-medium">
              Run your first detection to generate XAI evidence. Token attributions, heatmaps, and audit trails will appear here.
            </p>
            <a
              href="/detection"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-sm hover:bg-blue-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all duration-300"
            >
              Go to Detection <ArrowRight size={16} />
            </a>
          </motion.div>
        )}

        {/* --- Main Content (when records exist) --- */}
        {!loading && records.length > 0 && (
          <div className="space-y-10">

            {/* Analysis Selector */}
            <div className="relative max-w-2xl">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between gap-4 px-8 py-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-500/30 hover:bg-white/[0.05] hover:shadow-[0_0_25px_rgba(59,130,246,0.1)] transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 rounded-xl bg-blue-500/10">
                    <Cpu size={18} className="text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Inspecting Analysis</p>
                    <p className="text-sm font-bold text-white truncate">
                      {getRecordLabel(selected, selectedIdx)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black uppercase px-3 py-1 rounded-lg border ${getVerdictBg(selected?.verdict)} ${getVerdictColor(selected?.verdict)}`}>
                    {selected?.verdict || 'N/A'}
                  </span>
                  <ChevronDown size={18} className={`text-white/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute z-50 w-full mt-2 rounded-2xl bg-[#0a1128] border border-white/10 shadow-2xl overflow-hidden max-h-72 overflow-y-auto"
                  >
                    {records.map((record, idx) => (
                      <button
                        key={record.id || idx}
                        onClick={() => { setSelectedIdx(idx); setDropdownOpen(false); }}
                        className={`w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-blue-500/10 transition-all border-b border-white/5 last:border-b-0 ${idx === selectedIdx ? 'bg-blue-500/10' : ''
                          }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex gap-1.5">
                            <FileText size={14} className={record.text_snippet ? 'text-blue-400' : 'text-white/10'} />
                            <ImageIcon size={14} className={record.image_ref ? 'text-indigo-400' : 'text-white/10'} />
                          </div>
                          <span className="text-sm text-white/80 font-medium truncate">{getRecordLabel(record, idx)}</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase ${getVerdictColor(record.verdict)}`}>
                          {record.verdict?.split('—')[0]?.trim() || 'N/A'}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* XAI Evidence Grid */}
            <AnimatePresence mode="wait">
              {selectedIdx !== null ? (
                <motion.div
                  key={selectedIdx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >

                  {/* Row 1: Text Attributions + Visual Heatmap */}
                  <div className={`grid gap-8 ${hasHeatmap ? 'md:grid-cols-2' : 'grid-cols-1'}`}>

                    {/* Text Attributions Card */}
                    <div className="flex flex-col p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl hover:border-blue-500/20 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(59,130,246,0.05)] transition-all duration-300">
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                          <MessageSquare size={24} className="text-blue-400" /> Textual Attention
                        </h2>
                        <Cpu size={20} className="text-blue-500/40" />
                      </div>

                      <div className="flex-1">
                        {/* Token Attribution Chips */}
                        {xai.text_attributions && xai.text_attributions.length > 0 ? (
                          <div className="mb-8">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Token Weight Map</p>
                            <div className="flex flex-wrap gap-2">
                              {xai.text_attributions.map((attr, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                                  style={{ opacity: Math.max(0.4, attr.weight) }}
                                  title={`Attribution weight: ${attr.weight}`}
                                >
                                  {attr.token}
                                  <span className="ml-2 text-[9px] text-indigo-400/60 font-mono">{(attr.weight * 100).toFixed(0)}%</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : xai.text_weights && xai.text_weights.length > 0 ? (
                          <div className="mb-8">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Keyword Signals</p>
                            <div className="flex flex-wrap gap-2">
                              {xai.text_weights.map((word, i) => (
                                <span key={i} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs uppercase font-bold text-blue-300">
                                  {word}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mb-8 p-6 bg-black/40 rounded-[2rem] border border-white/5 flex items-center justify-center h-28">
                            <span className="text-xs font-black text-white/20 uppercase tracking-widest">No Text Attributions Available</span>
                          </div>
                        )}

                        {/* Source Text Preview */}
                        {hasText && (
                          <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5 font-mono text-sm leading-relaxed relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500/40 animate-[scan_4s_linear_infinite]" />
                            <p className="text-blue-100/60 italic line-clamp-3">"{selected.text_snippet}"</p>
                          </div>
                        )}

                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-relaxed mt-6">
                          Transformer Weights • Token Risk Analysis • Sentiment Mapping
                        </p>
                      </div>
                    </div>

                    {/* Visual Heatmap Card */}
                    {hasHeatmap && (
                      <div className="flex flex-col p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl hover:border-indigo-500/20 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(99,102,241,0.05)] transition-all duration-300">
                        <div className="flex items-center justify-between mb-8">
                          <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                            <ImageIcon size={24} className="text-indigo-400" /> Visual Saliency
                          </h2>
                          <Target size={20} className="text-indigo-500/40" />
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center">
                          <XAIVisualizer
                            originalImageSrc={`${API_BASE}/uploads/${selected.image_ref}`}
                            heatmapMatrix={xai.visual_heatmap}
                          />

                          <div className="mt-6 flex items-center gap-3">
                            <span className={`text-[10px] px-3 py-1 rounded-lg border font-black uppercase ${xai.heatmap_status?.includes('AVAILABLE')
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                              }`}>
                              {xai.heatmap_status || 'UNKNOWN'}
                            </span>
                          </div>

                          <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-relaxed mt-6">
                            Pixel Importance • Class Activation Mapping • CNN Forensic Trace
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Explanation + Pipeline Audit */}
                  <div className="grid md:grid-cols-2 gap-8">

                    {/* Logic Transparency */}
                    <div className="p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl hover:border-indigo-500/20 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(99,102,241,0.05)] transition-all duration-300">
                      <div className="mb-6">
                        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Logic Transparency</h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">Why was this verdict chosen?</p>
                      </div>
                      <p className="text-lg italic text-white/80 mb-6 leading-relaxed">
                        "{xai.explanation || 'No automated explanation generated.'}"
                      </p>

                      {/* Verdict Badge */}
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-sm uppercase ${getVerdictBg(selected?.verdict)} ${getVerdictColor(selected?.verdict)}`}>
                        <ShieldCheck size={16} />
                        {selected?.verdict || 'N/A'}
                      </div>

                      {/* Score */}
                      <div className="mt-6 flex gap-4">
                        <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-center">
                          <p className="text-[9px] font-black text-blue-400 tracking-widest mb-1">CREDIBILITY</p>
                          <p className="text-lg font-mono font-black">{((selected?.credibility_score || 0) * 100).toFixed(0)}%</p>
                        </div>
                        {hasImage && (
                          <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-center">
                            <p className="text-[9px] font-black text-purple-400 tracking-widest mb-1">IMAGE AUTH</p>
                            <p className="text-lg font-mono font-black">{((selected?.image_score || 0) * 100).toFixed(0)}%</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pipeline Audit Trail */}
                    <div className="p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl hover:border-purple-500/20 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(168,85,247,0.05)] transition-all duration-300">
                      <div className="mb-8">
                        <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest">Pipeline Audit Trail</h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">3-Stage Multimodal Detection Pipeline</p>
                      </div>

                      <div className="space-y-4">
                        {/* Stage 1: Text */}
                        <div className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${hasText
                            ? 'bg-indigo-500/5 border-indigo-500/20'
                            : 'bg-white/[0.02] border-white/5 opacity-40'
                          }`}>
                          <div className={`p-2 rounded-lg ${hasText ? 'bg-indigo-500/20' : 'bg-white/10'}`}>
                            <FileText size={16} className={hasText ? 'text-indigo-400' : 'text-white/30'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Stage 1 — Text Analysis</p>
                            <p className="text-sm font-bold text-white truncate">
                              {selected?.stage_2_text_analysis?.text_label || 'N/A'}
                            </p>
                          </div>
                          {hasText && (
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${selected?.stage_2_text_analysis?.text_label === 'Unverified Rumor'
                                ? 'bg-red-500/10 border-red-500/20 text-red-300'
                                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                              }`}>
                              {selected?.stage_2_text_analysis?.text_label === 'Unverified Rumor' ? 'Flagged' : 'Passed'}
                            </span>
                          )}
                        </div>

                        {/* Stage 2: Image */}
                        <div className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${hasImage
                            ? 'bg-blue-500/5 border-blue-500/20'
                            : 'bg-white/[0.02] border-white/5 opacity-40'
                          }`}>
                          <div className={`p-2 rounded-lg ${hasImage ? 'bg-blue-500/20' : 'bg-white/10'}`}>
                            <ImageIcon size={16} className={hasImage ? 'text-blue-400' : 'text-white/30'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Stage 2 — Image Analysis</p>
                            <p className="text-sm font-bold text-white truncate">
                              {selected?.stage_1_image_analysis?.combined_image_label || 'N/A'}
                            </p>
                          </div>
                          {hasImage && (
                            <div className="flex gap-1.5">
                              <span className="text-[9px] font-black px-2 py-0.5 rounded border bg-blue-500/10 border-blue-500/20 text-blue-300">
                                {selected?.stage_1_image_analysis?.semantic_label || 'N/A'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center py-1">
                          <ArrowRight size={14} className="text-white/10 rotate-90" />
                        </div>

                        {/* Stage 3: Fusion */}
                        <div className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${hasText && hasImage
                            ? 'bg-purple-500/5 border-purple-500/20'
                            : 'bg-white/[0.02] border-white/5 opacity-40'
                          }`}>
                          <div className={`p-2 rounded-lg ${hasText && hasImage ? 'bg-purple-500/20' : 'bg-white/10'}`}>
                            <Zap size={16} className={hasText && hasImage ? 'text-purple-400' : 'text-white/30'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Stage 3 — Multimodal Fusion</p>
                            <p className="text-sm font-bold text-white truncate">
                              {(hasText && hasImage)
                                ? selected?.stage_3_multimodal_fusion?.multimodal_label || 'N/A'
                                : 'N/A — Single Modality'}
                            </p>
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${hasText && hasImage
                              ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                              : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                            }`}>
                            {hasText && hasImage ? 'Final Verdict' : 'Single Mode'}
                          </span>
                        </div>
                      </div>

                      {/* Timestamp */}
                      {selected?.created_at && (
                        <div className="mt-6 flex items-center gap-2 text-white/20">
                          <Clock size={12} />
                          <span className="text-[10px] font-mono font-bold">
                            {new Date(selected.created_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                </motion.div>
              ) : (
                <motion.div
                  key="xai-placeholder"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center py-24 border border-white/10 rounded-[3rem] bg-white/[0.01] text-center px-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
                  <div className="w-20 h-20 rounded-[2rem] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 animate-pulse">
                    <Fingerprint size={36} className="text-blue-400" />
                  </div>
                  <h4 className="text-xl font-black mb-2 tracking-tight">Inspect Scan Evidence</h4>
                  <p className="text-white/40 max-w-md text-sm font-medium leading-relaxed">
                    Please select an analysis from the dropdown above to inspect its neural traces.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
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
