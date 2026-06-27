import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  UploadCloud, Zap, FileText, Image as ImageIcon,
  AlertTriangle, Download, ShieldAlert, Layers, ShieldCheck, X,
  Fingerprint
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
      canvas.width = 450;
      canvas.height = 450;
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

  // FIX Issue 1: Use credibility_score directly (stage_2_text_analysis.semantic_integrity doesn't exist)
  const semanticScore = result?.credibility_score ?? 0.5;
  const visualScore = result?.stage_1_image_analysis?.visual_authenticity ?? result?.image_score ?? 0.9;
  const fusionScore = result?.stage_3_multimodal_fusion?.mismatch_score ?? result?.fusion_score ?? 0.7;

  return (
    <div className="flex flex-col items-center gap-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
      <div className="relative overflow-hidden rounded-lg shadow-inner border border-zinc-700 w-[224px] h-[224px]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <div className="w-full max-w-[224px] space-y-1">
        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-widest">
          <div className="flex flex-col items-start text-zinc-500">
            <span>Low (Text)</span>
            <span className="text-emerald-400 font-bold lowercase mt-0.5">{(semanticScore * 100).toFixed(0)}%</span>
          </div>
          <div className="flex flex-col items-center text-zinc-500">
            <span>Medium (Fusion)</span>
            <span className="text-yellow-400 font-bold lowercase mt-0.5">{(fusionScore * 100).toFixed(0)}%</span>
          </div>
          <div className="flex flex-col items-end text-zinc-500">
            <span>High (Image)</span>
            <span className="text-rose-400 font-bold lowercase mt-0.5">{(visualScore * 100).toFixed(0)}%</span>
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
  const reportRef = useRef(null);

  const tabs = [
    { id: 'text', label: 'Text Only', icon: FileText },
    { id: 'image', label: 'Image Only', icon: ImageIcon },
    { id: 'multimodal', label: 'Text + Image', icon: Layers }
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => setPreviewUrl(evt.target?.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();

      if (activeTab === 'text' && textValue.trim()) {
        formData.append('text', textValue.trim());
      } else if (activeTab === 'image' && selectedFile) {
        formData.append('image', selectedFile);
      } else if (activeTab === 'multimodal') {
        if (textValue.trim()) formData.append('text', textValue.trim());
        if (selectedFile) formData.append('image', selectedFile);
      } else {
        alert('Please provide input');
        setLoading(false);
        return;
      }

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://inas-00-factfusion-backend.hf.space';
      const res = await axios.post(`${API_BASE}/api/v1/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(res.data);
    } catch (err) {
      console.error('Analysis failed:', err);
      alert(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result || !reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#020617',
        scale: 2,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      let imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let position = 0;

      while (position < imgHeight) {
        const pageHeight = pdfHeight - 10;
        const sourceY = (position * canvas.height) / imgHeight;
        const sourceHeight = (pageHeight * canvas.height) / imgHeight;

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const ctx = pageCanvas.getContext('2d');
        ctx?.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, canvas.width, sourceHeight
        );

        const pageImgData = pageCanvas.toDataURL('image/png');
        if (position > 0) pdf.addPage();
        pdf.addImage(pageImgData, 'PNG', 5, 5, pdfWidth - 10, pageHeight);

        position += pageHeight;
      }

      pdf.save('detection-report.pdf');
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('Failed to download PDF');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white selection:bg-blue-500/30 overflow-hidden relative font-sans">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20">
        {/* Header */}
        <header className="mb-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
          >
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-black tracking-[0.2em] text-blue-300 uppercase">
              AI-Powered Misinformation Detector
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl font-black tracking-tighter mb-6 leading-[0.9]"
          >
            Detection Engine
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/40 text-lg max-w-2xl font-light leading-relaxed"
          >
            Upload content for real-time multimodal analysis. Our system evaluates text credibility,
            image authenticity, and cross-modal consistency in seconds.
          </motion.p>
        </header>

        {/* Tab Navigation */}
        <div className="mb-12 border border-white/10 rounded-2xl p-2 bg-white/5 backdrop-blur-xl inline-flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-white/60 hover:text-white'
                }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'text' && (
            <motion.div
              key="text-input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-12 bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl"
            >
              <label className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4 block">
                Enter Text to Analyze
              </label>
              <textarea
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Paste the text claim or statement you'd like verified..."
                className="w-full h-48 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 resize-none"
              />
            </motion.div>
          )}

          {activeTab === 'image' && (
            <motion.div
              key="image-input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-12 bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl"
            >
              <label className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-6 block">
                Upload Image
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
              >
                {previewUrl ? (
                  <div className="flex flex-col items-center gap-4">
                    <img src={previewUrl} alt="Preview" className="max-h-48 rounded-xl" />
                    <p className="text-sm text-white/60">{selectedFile?.name}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <UploadCloud className="w-12 h-12 text-purple-400/40" />
                    <div>
                      <p className="font-bold text-white mb-1">Drag & drop or click to upload</p>
                      <p className="text-sm text-white/40">PNG, JPG, or WebP (max 5MB)</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </motion.div>
          )}

          {activeTab === 'multimodal' && (
            <motion.div
              key="multimodal-input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-12 grid md:grid-cols-2 gap-8"
            >
              {/* Text Input */}
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <label className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4 block">
                  Text Content
                </label>
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Paste the claim or statement..."
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 resize-none"
                />
              </div>

              {/* Image Input */}
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <label className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-4 block">
                  Image
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 rounded-2xl p-6 text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all h-40 flex flex-col items-center justify-center"
                >
                  {previewUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <img src={previewUrl} alt="Preview" className="max-h-24 rounded-lg" />
                      <p className="text-xs text-white/60">{selectedFile?.name}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-8 h-8 text-purple-400/40" />
                      <p className="text-xs font-bold text-white">Click to upload</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <div className="mb-12">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold uppercase tracking-[0.15em] rounded-2xl transition-all shadow-lg shadow-blue-900/40 hover:-translate-y-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                Analyzing...
              </span>
            ) : (
              'Analyze Content'
            )}
          </button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
              ref={reportRef}
            >
              {/* Summary Card */}
              <motion.div className="bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent border border-blue-500/30 rounded-[3rem] p-12 backdrop-blur-xl">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                      {classifyVerdict(result)?.label || 'UNCLASSIFIED'}
                    </h2>
                    <p className="text-white/60 text-lg max-w-2xl">
                      {result.verdict || 'Analysis complete. Review detailed findings below.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadPDF}
                      className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all"
                    >
                      <Download size={20} />
                    </button>
                    <button
                      className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {result.xai_insights && (
                  <XAIVisualizer
                    originalImageSrc={result.image_ref}
                    heatmapMatrix={result.xai_insights?.visual_heatmap}
                    result={result}
                  />
                )}
              </motion.div>

              {/* Analysis Details Grid */}
              <div className="grid md:grid-cols-3 gap-8">
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
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {result.active_modalities?.text ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-black uppercase ${result.stage_2_text_analysis?.text_label === 'Unverified Rumor'
                        ? 'bg-red-500/10 border-red-500/20 text-red-300'
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                        }`}>
                        {result.stage_2_text_analysis?.text_label === 'Unverified Rumor'
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
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {result.active_modalities?.image ? (
                      <>
                        <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20 text-blue-300 font-black">
                          {result.stage_1_image_analysis?.semantic_label || 'N/A'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 rounded border border-purple-500/20 text-purple-300 font-black">
                          {result.stage_1_image_analysis?.forensic_label || 'N/A'}
                        </span>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 text-center relative">
                  <h4 className="text-sm font-bold uppercase text-blue-400 tracking-widest mb-6">
                    Semantic Integrity
                  </h4>
                  <div className="h-56 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { value: result.credibility_score ?? 0 },
                            { value: 1 - (result.credibility_score ?? 0) },
                          ]}
                          innerRadius={80}
                          outerRadius={110}
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
                    <div className="absolute inset-0 flex items-center justify-center pt-12 text-5xl font-black">
                      {((result.credibility_score ?? 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {result.image_score != null && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-12 text-center relative">
                    <h4 className="text-sm font-bold uppercase text-purple-400 tracking-widest mb-10">
                      Visual Authenticity
                    </h4>
                    <div className="h-56 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: result.image_score ?? 0 },
                              { value: 1 - (result.image_score ?? 0) },
                            ]}
                            innerRadius={80}
                            outerRadius={110}
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
                      <div className="absolute inset-0 flex items-center justify-center pt-12 text-5xl font-black">
                        {((result.image_score ?? 0) * 100).toFixed(0)}%
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
                <button
                  onClick={() => navigate(`/xai?id=${result.id}`)}
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