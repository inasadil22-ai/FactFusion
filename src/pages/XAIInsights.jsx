import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fingerprint, MessageSquare, Image as ImageIcon,
  Cpu, Target, Zap, Activity, ShieldCheck, ChevronDown,
  FileText, Layers, AlertTriangle, Clock, ArrowRight
} from 'lucide-react';
import { XAIVisualizer } from './Detection';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://inas-00-factfusion-backend.hf.space';

import { classifyVerdict, getVerdictColor, getVerdictBg } from '../utils/verdict';

// ---------------------------------------------------------------------------
// Verdict helpers imported from ../utils/verdict
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Heatmap method label
// ---------------------------------------------------------------------------
// FIX 2: Case-insensitive matching — no longer breaks if backend sends
//         'GradCAM', 'Grad-CAM+', 'SHAP', etc.
//         Unknown methods show as-is (uppercased) instead of defaulting to CLIP.

const getHeatmapMethodLabel = (method) => {
  if (!method) return null;
  const m = method.toLowerCase();
  if (m.includes('shap')) return '⚡ SHAP';
  if (m.includes('grad')) return '🔥 Grad-CAM';
  if (m.includes('clip')) return '🔍 CLIP';
  return method.toUpperCase(); // unknown method: show raw value
};

// ---------------------------------------------------------------------------
// XAIInsights Component
// ---------------------------------------------------------------------------

const XAIInsights = () => {
  const [searchParams] = useSearchParams();
  const scanId = searchParams.get('id');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Block A: Fetch history once on mount
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        let url = `${API_BASE}/api/v1/analysis-history`;

        // FIX Issue 2a: Handle both authenticated and unauthenticated users
        // Only append user_id if user is logged in AND is not an admin
        const userString = localStorage.getItem('user');
        if (userString) {
          try {
            const user = JSON.parse(userString);
            if (user?.id && user?.role !== 'admin') {
              url += `?user_id=${user.id}`;
            }
          } catch (e) {
            console.error('Error parsing user for XAI query:', e);
            // Continue without user_id filter for unauthenticated users
          }
        }

        const res = await axios.get(url);
        const rawData = Array.isArray(res.data) ? res.data : [];

        // FIX Issue 2b: Robust xai_insights filtering
        // Check that both xai_insights exists AND is a non-empty object/array
        // This handles cases where r.xai_insights is null, undefined, or empty
        const withXai = rawData
          .filter(r => r && r.xai_insights && Object.keys(r.xai_insights).length > 0)
          .slice(0, 15);

        // FIX 3: Warn in console if records were silently trimmed
        const totalWithXai = rawData.filter(
          r => r && r.xai_insights && Object.keys(r.xai_insights).length > 0
        ).length;

        if (totalWithXai > 15) {
          console.warn(
            `[XAIInsights] ${rawData.length} total records received, ${totalWithXai} with XAI insights — showing latest 15 only.`
          );
        }

        // FIX Issue 2c: Log helpful message if no XAI records found
        if (withXai.length === 0) {
          console.warn(
            `[XAIInsights] No analysis records with XAI insights found. Raw records: ${rawData.length}`
          );
        }

        setRecords(withXai);
      } catch (err) {
        console.error('Failed to fetch analysis history:', err);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  // Block B: Select the right record when scanId or records change
  useEffect(() => {
    if (records.length > 0) {
      let defaultIdx = 0;
      if (scanId) {
        const idx = records.findIndex(r => r.id === scanId || r._id === scanId);
        if (idx !== -1) defaultIdx = idx;
      }
      setSelectedIdx(defaultIdx);
    } else {
      setSelectedIdx(null);
    }
  }, [scanId, records]);

  const selected = selectedIdx !== null ? (records[selectedIdx] || null) : null;
  const xai = selected?.xai_insights || {};

  // FIX 4: image_score check — use != null (covers undefined too) so score=0 still shows image panel
  const hasImage = !!(selected?.image_ref && selected?.image_score != null);
  const hasText = !!selected?.text_snippet;
  const hasHeatmap = Array.isArray(xai.visual_heatmap) && xai.visual_heatmap.length > 0;

  // FIX 5: dominant_modality — case-insensitive compare throughout
  const dominantModality = xai.dominant_modality?.toLowerCase();

  // FIX 6: explanation — split on ' | Audit Path: ' is documented and guarded;
  //         if the separator isn't found, [0] safely returns the full string.
  //         Backend should ideally send separate `explanation` + `audit_path` fields.
  const explanationText = (xai.explanation || '').split(' | Audit Path: ')[0] || 'No automated explanation generated.';

  // FIX 7: verdict in dropdown — split on em-dash OR hyphen via regex
  const getShortVerdict = (verdict) =>
    verdict?.split(/\s*[—-]\s*/)[0]?.trim() || 'N/A';

  const getRecordLabel = (record, idx) => {
    if (!record) return 'Select a scan to inspect...';
    if (record.text_snippet) {
      const words = record.text_snippet.split(' ');
      return words.length > 5 ? words.slice(0, 5).join(' ') + '…' : record.text_snippet;
    }
    if (record.image_ref) return `Image: ${record.image_ref}`;
    return `Analysis #${idx + 1}`;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-hidden relative font-sans">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20">

        {/* Header */}
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
            XAI Evidence Explorer
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/40 text-lg max-w-3xl leading-relaxed font-light"
          >
            Inspect neural decision logic, visual attention heatmaps, and multimodal evidence traces from your detection pipeline.
            Each analysis includes explainable AI artifacts: Grad-CAM focus maps, SHAP keyword attributions, and fusion audits.
          </motion.p>
        </header>

        {/* Dropdown & Loading */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-400 rounded-full"
              />
              <span className="text-white/60">Loading analysis history...</span>
            </div>
          </motion.div>
        )}

        {!loading && (
          <>
            {records.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-20 text-center"
              >
                <AlertTriangle className="w-16 h-16 text-yellow-500/40 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">No Analyses Yet</h3>
                <p className="text-white/40 max-w-2xl mx-auto">
                  Run a detection on the main page to generate XAI insights. Each analysis with both text and image inputs
                  will appear here for detailed inspection.
                </p>
                <Link
                  to="/"
                  className="inline-block mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold uppercase tracking-[0.15em] transition-all"
                >
                  Go to Detection Engine
                </Link>
              </motion.div>
            ) : (
              <>
                <div className="mb-12 relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full md:w-96 flex items-center justify-between gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-blue-500/30 transition-all font-bold text-left"
                  >
                    <span className="truncate text-white/80">
                      {selected ? getRecordLabel(selected, records.indexOf(selected)) : 'Select a scan...'}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white/10 border border-white/20 rounded-xl overflow-hidden backdrop-blur-xl z-50 max-h-64 overflow-y-auto"
                      >
                        {records.map((r, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedIdx(idx);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-6 py-3 border-b border-white/5 hover:bg-white/10 transition-colors ${selectedIdx === idx ? 'bg-blue-500/20' : ''}`}
                          >
                            <div className="font-bold text-sm mb-1">{getRecordLabel(r, idx)}</div>
                            <div className="text-xs text-white/40">
                              {getShortVerdict(r.verdict || 'Pending')} • {r.credibility_score ? `${(r.credibility_score * 100).toFixed(0)}%` : 'N/A'}
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                  {selected ? (
                    <motion.div
                      key={selected.id || 'selected'}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-8"
                    >

                      {/* Heatmap Section */}
                      {hasHeatmap && hasImage && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="bg-white/[0.03] border border-white/10 rounded-3xl p-12 backdrop-blur-xl"
                        >
                          <div className="mb-8">
                            <h3 className="text-lg font-bold text-blue-400 uppercase tracking-widest mb-2">
                              Visual Focus Attribution Map
                            </h3>
                            <p className="text-sm text-white/40">
                              Method: {getHeatmapMethodLabel(xai.heatmap_method) || 'Unknown'}
                            </p>
                          </div>

                          <XAIVisualizer
                            originalImageSrc={selected.image_ref}
                            heatmapMatrix={xai.visual_heatmap}
                            result={selected}
                          />

                          {xai.visual_explanation && (
                            <div className="mt-6 p-6 bg-white/5 border border-white/10 rounded-xl">
                              <h4 className="text-xs font-black text-blue-300 uppercase tracking-wider mb-2">
                                Visual Evidence
                              </h4>
                              <p className="text-sm text-white/70 leading-relaxed">
                                {xai.visual_explanation}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* Text Attribution & Evidence */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: hasHeatmap ? 0.2 : 0.1 }}
                        className="bg-white/[0.03] border border-white/10 rounded-3xl p-12 backdrop-blur-xl"
                      >
                        <div className="mb-8">
                          <h3 className="text-lg font-bold text-indigo-400 uppercase tracking-widest">
                            Semantic Analysis & Attribution
                          </h3>
                        </div>

                        <div className="space-y-6">

                          {/* Main Explanation */}
                          <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-wider mb-3">
                              Explainable Reasoning
                            </p>
                            <p className="text-sm leading-relaxed text-white/80">
                              {explanationText}
                            </p>
                          </div>

                          {/* Keyword Attributions (if available) */}
                          {xai.keyword_attributions && Array.isArray(xai.keyword_attributions) && xai.keyword_attributions.length > 0 && (
                            <div className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                              <p className="text-[10px] font-black text-purple-300 uppercase tracking-wider mb-3">
                                🔑 Attributed Keywords (SHAP / Feature Importance)
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {xai.keyword_attributions.map((kw, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs font-semibold text-purple-200"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Text Snippet */}
                          {hasText && (
                            <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                              <p className="text-[10px] font-black text-blue-300 uppercase tracking-wider mb-3">
                                📝 Input Text Snippet
                              </p>
                              <p className="text-sm text-white/70 italic leading-relaxed">
                                "{selected.text_snippet}"
                              </p>
                            </div>
                          )}

                        </div>
                      </motion.div>

                      {/* Modality Summary */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="grid md:grid-cols-2 gap-6"
                      >

                        {hasText && (
                          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">
                              📄 Text Evidence
                            </p>
                            <p className="text-xs text-white/70">
                              <span className="text-indigo-400 font-bold">Label: </span>
                              {selected?.stage_2_text_analysis?.text_label || 'N/A'}
                            </p>
                          </div>
                        )}

                        {hasImage && (
                          <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">
                              🖼 Image Evidence
                            </p>
                            <p className="text-xs text-white/70">
                              <span className="text-purple-400 font-bold">Semantic: </span>
                              {selected?.stage_1_image_analysis?.semantic_label || 'N/A'}
                              {' · '}
                              <span className="text-purple-400 font-bold">Forensic: </span>
                              {selected?.stage_1_image_analysis?.forensic_label || 'N/A'}
                            </p>
                          </div>
                        )}

                        {/* FIX 5: dominantModality already lowercased above */}
                        {dominantModality && (
                          <div className={`p-4 rounded-2xl border ${dominantModality === 'image'
                            ? 'bg-red-500/5 border-red-500/20'
                            : 'bg-purple-500/5 border-purple-500/20'
                            }`}>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1">
                              ⚡ Decision Driver
                            </p>
                            <p className="text-xs text-white/70">
                              The{' '}
                              <span className="font-bold text-white">{dominantModality}</span>{' '}
                              modality had stronger evidence and primarily drove this verdict.
                            </p>
                          </div>
                        )}
                      </motion.div>

                      <div className="mt-6 flex gap-4">
                        <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-center">
                          <p className="text-[9px] font-black text-blue-400 tracking-widest mb-1">CREDIBILITY</p>
                          {/* FIX 4: ?? 0 instead of || 0 — intent-clear nullish coalescing */}
                          <p className="text-lg font-mono font-black">
                            {((selected?.credibility_score ?? 0) * 100).toFixed(0)}%
                          </p>
                        </div>
                        {hasImage && (
                          <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-center">
                            <p className="text-[9px] font-black text-purple-400 tracking-widest mb-1">IMAGE AUTH</p>
                            <p className="text-lg font-mono font-black">
                              {((selected?.image_score ?? 0) * 100).toFixed(0)}%
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Pipeline Audit Trail Card */}
                      <div className="p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl hover:border-purple-500/20 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(168,85,247,0.05)] transition-all duration-300">
                        <div className="mb-8">
                          <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest">
                            Pipeline Audit Trail
                          </h3>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">
                            3-Stage Multimodal Detection Pipeline
                          </p>
                        </div>

                        <div className="space-y-4">

                          {/* Stage 1 */}
                          <div className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${hasText
                            ? 'bg-indigo-500/5 border-indigo-500/20'
                            : 'bg-white/[0.02] border-white/5 opacity-40'
                            }`}>
                            <div className={`p-2 rounded-lg ${hasText ? 'bg-indigo-500/20' : 'bg-white/10'}`}>
                              <FileText size={16} className={hasText ? 'text-indigo-400' : 'text-white/30'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                                Stage 1 — Text Analysis
                              </p>
                              <p className="text-sm font-bold text-white truncate">
                                {selected?.stage_2_text_analysis?.text_label || 'N/A'}
                              </p>
                            </div>
                            {hasText && (
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${selected?.stage_2_text_analysis?.text_label === 'Unverified Rumor'
                                ? 'bg-red-500/10 border-red-500/20 text-red-300'
                                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                                }`}>
                                {selected?.stage_2_text_analysis?.text_label === 'Unverified Rumor'
                                  ? 'Flagged' : 'Passed'}
                              </span>
                            )}
                          </div>

                          {/* Stage 2 */}
                          <div className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${hasImage
                            ? 'bg-blue-500/5 border-blue-500/20'
                            : 'bg-white/[0.02] border-white/5 opacity-40'
                            }`}>
                            <div className={`p-2 rounded-lg ${hasImage ? 'bg-blue-500/20' : 'bg-white/10'}`}>
                              <ImageIcon size={16} className={hasImage ? 'text-blue-400' : 'text-white/30'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                                Stage 2 — Image Analysis
                              </p>
                              <p className="text-sm font-bold text-white truncate">
                                {selected?.stage_1_image_analysis?.combined_image_label || 'N/A'}
                              </p>
                            </div>
                            {hasImage && (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded border bg-blue-500/10 border-blue-500/20 text-blue-300">
                                {selected?.stage_1_image_analysis?.semantic_label || 'N/A'}
                              </span>
                            )}
                          </div>

                          <div className="flex justify-center py-1">
                            <ArrowRight size={14} className="text-white/10 rotate-90" />
                          </div>

                          {/* Stage 3 */}
                          <div className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${hasText && hasImage
                            ? 'bg-purple-500/5 border-purple-500/20'
                            : 'bg-white/[0.02] border-white/5 opacity-40'
                            }`}>
                            <div className={`p-2 rounded-lg ${hasText && hasImage ? 'bg-purple-500/20' : 'bg-white/10'}`}>
                              <Zap size={16} className={hasText && hasImage ? 'text-purple-400' : 'text-white/30'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">
                                Stage 3 — Multimodal Fusion
                              </p>
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
                      </div>

                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-20 text-center text-white/40"
                    >
                      Select a scan from the dropdown to inspect XAI evidence.
                    </motion.div>
                  )}
                </AnimatePresence>

              </>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default XAIInsights;