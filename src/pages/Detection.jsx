import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  UploadCloud, Zap, FileText, Image as ImageIcon,
  AlertTriangle, ShieldAlert, Layers, ShieldCheck, X,
  Fingerprint
} from 'lucide-react';
import { classifyVerdict, SCORE_THRESHOLDS } from '../utils/verdict';

// ---------------------------------------------------------------------------
// XAI Heatmap Visualizer
// ---------------------------------------------------------------------------
const jetColor = (t) => {
  const r = Math.max(0, Math.min(255, Math.round(255 * (1.5 - Math.abs(4 * t - 3)))));
  const g = Math.max(0, Math.min(255, Math.round(255 * (1.5 - Math.abs(4 * t - 2)))));
  const b = Math.max(0, Math.min(255, Math.round(255 * (1.5 - Math.abs(4 * t - 1)))));
  return [r, g, b];
};

export const XAIVisualizer = ({ originalImageSrc, heatmapMatrix, result }) => {
  const canvasRef = useRef(null);
  const [opacity, setOpacity] = useState(0.6);

  useEffect(() => {
    if (!heatmapMatrix || !heatmapMatrix.length || !canvasRef.current) return;

    const matrixH = heatmapMatrix.length;
    const matrixW = heatmapMatrix[0]?.length || matrixH;

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let y = 0; y < matrixH; y++) {
      for (let x = 0; x < matrixW; x++) {
        const v = heatmapMatrix[y]?.[x] ?? 0;
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
    const range = maxVal - minVal || 1;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = originalImageSrc;

    img.onload = () => {
      canvas.width = 640;
      canvas.height = 640;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = matrixW;
      offscreenCanvas.height = matrixH;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      const heatImgData = offscreenCtx.createImageData(matrixW, matrixH);
      const data = heatImgData.data;

      for (let y = 0; y < matrixH; y++) {
        for (let x = 0; x < matrixW; x++) {
          const raw = heatmapMatrix[y]?.[x] ?? 0;
          const t = (raw - minVal) / range;
          const pixelIdx = (y * matrixW + x) * 4;

          if (t > 0.05) {
            const [r, g, b] = jetColor(t);
            data[pixelIdx] = r;
            data[pixelIdx + 1] = g;
            data[pixelIdx + 2] = b;
            data[pixelIdx + 3] = Math.floor(t * opacity * 255);
          } else {
            data[pixelIdx + 3] = 0;
          }
        }
      }

      offscreenCtx.putImageData(heatImgData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 1.0;
      ctx.drawImage(offscreenCanvas, 0, 0, canvas.width, canvas.height);
    };
  }, [originalImageSrc, heatmapMatrix, opacity]);

  // FIX: No hardcoded fallbacks — use null if score unavailable
  const semanticScore = result?.credibility_score ?? null;
  const visualScore = result?.image_score ?? null;
  const fusionScore = result?.stage_3_multimodal_fusion?.fusion_score
    ?? result?.fusion_score ?? null;

  return (
    <div className="flex flex-col items-center gap-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
      <div className="relative overflow-hidden rounded-lg shadow-inner border border-zinc-700 w-[320px] h-[320px]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <div className="w-full max-w-[320px] space-y-1">
        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-widest">
          <div className="flex flex-col items-start text-zinc-500">
            <span>Low (Text)</span>
            <span className="text-emerald-400 font-bold lowercase mt-0.5">
              {semanticScore !== null ? `${(semanticScore * 100).toFixed(0)}%` : 'N/A'}
            </span>
          </div>
          <div className="flex flex-col items-center text-zinc-500">
            <span>Medium (Fusion)</span>
            <span className="text-yellow-400 font-bold lowercase mt-0.5">
              {fusionScore !== null ? `${(fusionScore * 100).toFixed(0)}%` : 'N/A'}
            </span>
          </div>
          <div className="flex flex-col items-end text-zinc-500">
            <span>High (Image)</span>
            <span className="text-rose-400 font-bold lowercase mt-0.5">
              {visualScore !== null ? `${(visualScore * 100).toFixed(0)}%` : 'N/A'}
            </span>
          </div>
        </div>

        <div
          className="h-2 rounded-full w-full mb-2"
          style={{
            background: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
          }}
        />

        <label className="text-xs font-semibold text-zinc-400 flex justify-between pt-1">
          <span>Overlay intensity:</span>
          <span>{Math.round(opacity * 100)}%</span>
        </label>
        <input
          type="range" min="0" max="1" step="0.05" value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="w-full accent-emerald-500 bg-zinc-700 h-1 rounded-lg cursor-pointer appearance-none"
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Verdict Helpers
// ---------------------------------------------------------------------------
const getScoreColor = (score, verdictType) => {
  const type = (verdictType || '').toLowerCase();
  if (type === 'ood' || type === 'out of domain') return '#94a3b8';

  const val = score ?? 0;
  if (val >= SCORE_THRESHOLDS.HIGH) return '#10b981';
  if (val >= SCORE_THRESHOLDS.MID) return '#f59e0b';
  return '#ef4444';
};

// ---------------------------------------------------------------------------
// Detection Component
// ---------------------------------------------------------------------------
const Detection = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('multimodal');
  const [textValue, setTextValue] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const tabs = [
    { id: 'text', label: 'Text Only', icon: FileText },
    { id: 'image', label: 'Image Only', icon: ImageIcon },
    { id: 'multimodal', label: 'Multimodal', icon: Layers },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const removeFile = (e) => {
    e?.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    const hasText = activeTab !== 'image' && !!(textValue && textValue.trim());
    const hasImage = activeTab !== 'text' && !!selectedFile;

    if (!hasText && !hasImage) {
      alert('Please provide text or an image for the selected analysis mode.');
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    if (hasText) formData.append('text', textValue.trim());
    if (hasImage) formData.append('file', selectedFile);

    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        if (user?.id) formData.append('user_id', user.id);
      }
    } catch (e) {
      console.error('Error parsing user context:', e);
    }

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://inas-00-factfusion-backend.hf.space';
      const response = await axios.post(`${apiBase}/api/v1/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult({
        ...response.data,
        active_modalities: { text: hasText, image: hasImage },
      });
    } catch (error) {
      console.error('API Error:', error);
      alert('Analysis failed. Please try again or check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pt-32 pb-20 px-6 relative font-sans">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
          >
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] tracking-[0.2em] text-blue-300 uppercase font-black">
              Fusion Intelligence Engine
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-[0.9]"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-blue-200">
              Crisis{' '}
              <span className="text-blue-500 inline-block drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                Integrity
              </span>{' '}
              Gate
            </span>
          </motion.h1>
        </header>

        <nav className="flex flex-wrap gap-4 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setResult(null); }}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm transition-all border ${activeTab === tab.id
                ? 'bg-blue-600/20 border-blue-500 text-white'
                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                }`}
            >
              <tab.icon size={20} /> {tab.label}
            </button>
          ))}
        </nav>

        <section className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-10 backdrop-blur-3xl shadow-2xl mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {(activeTab === 'text' || activeTab === 'multimodal') && (
              <div className="lg:col-span-2">
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Paste news caption, social post, or disaster report..."
                  className="w-full h-72 p-8 rounded-[2.5rem] bg-[#020617]/50 border border-white/5 focus:border-blue-500/50 text-blue-100 text-lg outline-none transition-all"
                />
              </div>
            )}

            {(activeTab === 'image' || activeTab === 'multimodal') && (
              <div className="lg:col-span-1">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-72 border-2 border-dashed border-white/10 rounded-[2.5rem] bg-[#020617]/50 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {!previewUrl ? (
                    <div className="text-center">
                      <UploadCloud size={56} className="text-blue-400/50 mx-auto mb-4" />
                      <p className="text-xs font-black text-white/40 uppercase tracking-widest">
                        Upload Image
                      </p>
                    </div>
                  ) : (
                    <div className="relative h-full w-full p-4">
                      <img
                        src={previewUrl}
                        className="h-full w-full object-cover rounded-3xl"
                        alt="Preview"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                        className="absolute top-8 right-8 p-3 bg-red-500 text-white rounded-full transition-transform hover:scale-105"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-20 py-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.3em] disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20"
            >
              {loading ? 'Neural Core Processing…' : 'Initiate Detection'}
            </button>
          </div>
        </section>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="h-24 rounded-[2.5rem] bg-white/[0.03] border border-white/5 animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-36 rounded-[2rem] bg-white/[0.03] border border-white/5 animate-pulse" />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-48 rounded-[2rem] bg-white/[0.03] border border-white/5 animate-pulse" />
                <div className="h-48 rounded-[2rem] bg-white/[0.03] border border-white/5 animate-pulse" />
              </div>
            </motion.div>
          )}
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              {(() => {
                const { isCredible, isHighRisk, isSuspicious } = classifyVerdict(result);

                const cardStyles = isCredible
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  : isHighRisk
                    ? 'bg-red-500/5 border-red-500/20 text-red-400'
                    : isSuspicious
                      ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                      : 'bg-gray-500/5 border-gray-500/20 text-gray-400';

                const iconContainerStyles = isCredible
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isHighRisk
                    ? 'bg-red-500/20 text-red-400'
                    : isSuspicious
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-gray-500/20 text-gray-400';

                const VerdictIcon = isCredible
                  ? ShieldCheck
                  : isHighRisk
                    ? AlertTriangle
                    : ShieldAlert;

                return (
                  <div className={`p-6 rounded-[2.5rem] border-2 flex flex-col md:flex-row items-center justify-between gap-8 ${cardStyles}`}>
                    <div className="flex items-center gap-6 w-full md:w-auto">
                      <div className={`p-5 rounded-[1.5rem] flex-shrink-0 ${iconContainerStyles}`}>
                        <VerdictIcon size={40} />
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold tracking-tight text-white">
                          {result.verdict || 'Analysis Result'}
                        </h3>
                        <p className="text-white/40 font-bold uppercase text-xs mt-1">
                          Score: {result.credibility_score != null ? `${(result.credibility_score * 100).toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`border p-8 rounded-[2rem] relative overflow-hidden transition-all duration-500 ${result.active_modalities?.text
                  ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.15)]'
                  : 'bg-white/[0.03] border-white/10 opacity-40'
                  }`}>
                  <div className="absolute top-0 right-0 p-4 opacity-10"><FileText size={40} /></div>
                  <h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-4">
                    Stage 1: Text Analysis
                  </h4>
                  <p className="text-lg font-bold text-white leading-tight">
                    {result.stage_2_text_analysis?.text_label || 'N/A'}
                  </p>
                  {result.active_modalities?.text && result.stage_2_text_analysis?.text_confidence != null && (
                    <p className="text-xs text-white/40 mt-1 font-mono">
                      Model confidence: {(result.stage_2_text_analysis.text_confidence * 100).toFixed(2)}%
                    </p>
                  )}
                  <div className="mt-4">
                    {result.active_modalities?.text ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-black uppercase ${result.stage_2_text_analysis?.text_label === 'Non-Informative' || result.stage_2_text_analysis?.text_label === 'OOD'
                        ? 'bg-red-500/10 border-red-500/20 text-red-300'
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                        }`}>
                        {result.stage_2_text_analysis?.text_label === 'Non-Informative' || result.stage_2_text_analysis?.text_label === 'OOD'
                          ? 'Integrity Audit Flagged'
                          : 'Integrity Audit Passed'}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-gray-500/10 rounded border border-gray-500/20 text-gray-400 font-black uppercase">
                        No Text Provided
                      </span>
                    )}
                  </div>
                </div>

                <div className={`border p-8 rounded-[2rem] relative overflow-hidden transition-all duration-500 ${result.active_modalities?.image
                  ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.15)]'
                  : 'bg-white/[0.03] border-white/10 opacity-40'
                  }`}>
                  <div className="absolute top-0 right-0 p-4 opacity-10"><ImageIcon size={40} /></div>
                  <h4 className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-4">
                    Stage 2: Image Analysis
                  </h4>
                  <p className="text-lg font-bold text-white leading-tight">
                    {result.stage_1_image_analysis?.combined_image_label || 'N/A'}
                  </p>
                  {result.active_modalities?.image && (
                    <div className="mt-1 flex gap-3 text-xs font-mono text-white/40">
                      {result.stage_1_image_analysis?.semantic_confidence != null && (
                        <span>Semantic: {(result.stage_1_image_analysis.semantic_confidence * 100).toFixed(2)}%</span>
                      )}
                      {result.stage_1_image_analysis?.forensic_confidence != null && (
                        <span>Forensic: {(result.stage_1_image_analysis.forensic_confidence * 100).toFixed(2)}%</span>
                      )}
                    </div>
                  )}
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {result.active_modalities?.image ? (
                      <>
                        <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20 text-blue-300 font-black">
                          {result.stage_1_image_analysis?.semantic_label || 'N/A'}
                        </span>
                        {result.stage_1_image_analysis?.forensic_label && result.stage_1_image_analysis.forensic_label !== 'N/A' && (
                          <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 rounded border border-purple-500/20 text-purple-300 font-black">
                            {result.stage_1_image_analysis.forensic_label}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-gray-500/10 rounded border border-gray-500/20 text-gray-400 font-black uppercase">
                        No Image Provided
                      </span>
                    )}
                  </div>
                </div>

                <div className={`border p-8 rounded-[2rem] relative overflow-hidden transition-all duration-500 ${result.active_modalities?.image && result.active_modalities?.text
                  ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                  : 'bg-white/[0.03] border-white/10 opacity-40'
                  }`}>
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={40} /></div>
                  <h4 className="text-[10px] text-purple-400 font-black uppercase tracking-[0.2em] mb-4">
                    Stage 3: Multimodal Fusion
                  </h4>
                  <p className="text-lg font-bold text-white leading-tight">
                    {(result.active_modalities?.image && result.active_modalities?.text)
                      ? result.stage_3_multimodal_fusion?.multimodal_label
                      : 'N/A — Single Modality'}
                  </p>
                  <div className="mt-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-black uppercase ${(result.active_modalities?.image && result.active_modalities?.text)
                      ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                      : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                      }`}>
                      {(result.active_modalities?.image && result.active_modalities?.text)
                        ? 'Final Verdict'
                        : 'Requires Both Modalities'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-5 text-center relative">
                  <h4 className="text-xs font-bold uppercase text-blue-400 tracking-widest mb-3">
                    Semantic Integrity
                  </h4>
                  <div className="h-36 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { value: result.credibility_score ?? 0 },
                            { value: 1 - (result.credibility_score ?? 0) },
                          ]}
                          innerRadius={50}
                          outerRadius={68}
                          startAngle={180}
                          endAngle={0}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill={getScoreColor(result.credibility_score, result.verdict)} />
                          <Cell fill="#ffffff05" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pt-8 text-3xl font-black">
                      {result.credibility_score != null ? `${(result.credibility_score * 100).toFixed(0)}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                {result.image_score != null && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-5 text-center relative">
                    <h4 className="text-xs font-bold uppercase text-purple-400 tracking-widest mb-3">
                      Visual Authenticity
                    </h4>
                    <div className="h-36 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: result.image_score ?? 0 },
                              { value: 1 - (result.image_score ?? 0) },
                            ]}
                            innerRadius={50}
                            outerRadius={68}
                            startAngle={180}
                            endAngle={0}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill={getScoreColor(result.image_score, result.verdict)} />
                            <Cell fill="#ffffff05" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pt-8 text-3xl font-black">
                        {(result.image_score * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent border border-blue-500/20 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-6">
                  <div className="p-5 bg-blue-500/20 rounded-3xl text-blue-400 shadow-xl shadow-blue-500/10">
                    <Fingerprint size={32} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black mb-1 italic tracking-tight">
                      Neural Evidence Trace Available
                    </h4>
                    <p className="text-blue-100/40 text-sm max-w-md font-medium leading-relaxed">
                      Deep explainable AI insights (including visual Grad-CAM focus heatmaps and
                      keyword attributions) are ready for inspection.
                    </p>
                  </div>
                </div>
                {/* FIX: Pass full result via state (so XAIInsights can show it
                    immediately without waiting on a history re-fetch), and also
                    include the id as a query param when available so the URL is
                    shareable/bookmarkable and matches XAIInsights' ?id= handling. */}
                <button
                  onClick={() => navigate(result?.id ? `/xai?id=${result.id}` : '/xai', { state: { result, previewUrl } })}
                  className="px-10 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/40 hover:-translate-y-1"
                >
                  Explore XAI Evidence
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Detection;