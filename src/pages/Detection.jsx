import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  UploadCloud, Zap, FileText, Image as ImageIcon,
  Layers, ShieldCheck, X, Fingerprint,
  Activity, Target, AlertTriangle, Download, ShieldAlert
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const XAIVisualizer = ({ originalImageSrc, heatmapMatrix }) => {
  const canvasRef = useRef(null);
  const [opacity, setOpacity] = useState(0.6);

  useEffect(() => {
    if (!heatmapMatrix || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = originalImageSrc;

    img.onload = () => {
      // Establish uniform canvas coordinate boundaries
      canvas.width = 224;
      canvas.height = 224;

      // Stage 1: Draw underlying source image frame
      ctx.drawImage(img, 0, 0, 224, 224);

      // Stage 2: Construct alpha-mapped pixel array based on heatmap weights
      const imgData = ctx.getImageData(0, 0, 224, 224);
      const data = imgData.data;

      // Map out 224x224 data spatial dimensions
      for (let y = 0; y < 224; y++) {
        for (let x = 0; x < 224; x++) {
          const pixelIdx = (y * 224 + x) * 4;
          // Extract the direct coordinate scalar score generated from PyTorch Grad-CAM
          const weight = heatmapMatrix[y]?.[x] || 0;

          if (weight > 0.1) {
            // Hotspot mapping: Interpolate red spectrum intensity based on XAI node values
            data[pixelIdx] = 239;     // Red Channel
            data[pixelIdx + 1] = 68;  // Green Channel
            data[pixelIdx + 2] = 68;  // Blue Channel
            data[pixelIdx + 3] = Math.floor(weight * opacity * 255); // Alpha Opacity Mapping
          }
        }
      }
      // Commit modified pixel arrays back down onto Canvas viewport context
      ctx.putImageData(imgData, 0, 0);
    };
  }, [originalImageSrc, heatmapMatrix, opacity]);

  return (
    <div className="flex flex-col items-center gap-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
      <div className="relative overflow-hidden rounded-lg shadow-inner border border-zinc-700 w-[224px] h-[224px]">
        <canvas ref={canvasRef} className="absolute inset-0 block" />
      </div>
      <div className="w-full max-w-[224px] space-y-1">
        <label className="text-xs font-semibold text-zinc-400 flex justify-between">
          <span>Heatmap Intensity:</span>
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

const Detection = () => {
  const navigate = useNavigate();
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('multimodal');
  const [textValue, setTextValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const reportRef = useRef(null);

  const tabs = [
    { id: 'text', label: 'Text Only', icon: FileText },
    { id: 'image', label: 'Image Only', icon: ImageIcon },
    { id: 'multimodal', label: 'Multimodal', icon: Layers },
  ];

  // --- HELPER: DYNAMIC COLOR LOGIC ---
  const getScoreColor = (score, verdict) => {
    const val = score || 0;
    if (verdict === 'OOD') return '#94a3b8'; // Gray-400 for OOD
    if (val >= 0.75) return '#10b981'; // Emerald
    if (val >= 0.45) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  // --- PDF EXPORT HANDLER ---
  const downloadPDF = async () => {
    if (!reportRef.current) return;
    const element = reportRef.current;
    const canvas = await html2canvas(element, {
      backgroundColor: "#020617",
      scale: 2,
      useCORS: true
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`FactFusion_Forensic_Report_${new Date().getTime()}.pdf`);
  };

  // --- FILE HANDLERS ---
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- API CALL ---
  const handleAnalyze = async () => {
    // --- FIX: Issue 4 (Modality States Ignored on Tab Switch) ---
    // Constrain inputs strictly to what the active tab allows
    const hasText = activeTab !== 'image' && !!(textValue && textValue.trim());
    const hasImage = activeTab !== 'text' && !!selectedFile;

    if (!hasText && !hasImage) {
      alert("Please provide text or an image for the selected analysis mode.");
      return;
    }
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    if (hasText) formData.append('text', textValue.trim());
    if (hasImage) formData.append('file', selectedFile);

    // Append user_id if logged in
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        if (user && user.id) {
          formData.append('user_id', user.id);
        }
      } catch (e) {
        console.error("Error parsing user context:", e);
      }
    }

    try {
      const response = await axios.post('http://127.0.0.1:5000/api/v1/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Backend never sends active_modalities — inject it from what we submitted
      setResult({
        ...response.data,
        active_modalities: { text: hasText, image: hasImage }
      });
    } catch (error) {
      console.error("API Error:", error);
      alert("Failed to connect to AI server. Ensure Flask is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pt-32 pb-20 px-6 relative font-sans">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] tracking-[0.2em] text-blue-300 uppercase font-black">Fusion Intelligence Engine v2.5</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-[0.9]"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-blue-200">
              Crisis <span className="text-blue-500 inline-block drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">Integrity</span> Gate
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-blue-100/60 mb-10 max-w-2xl mx-auto leading-relaxed"
          >

          </motion.p>
        </header>

        {/* Tabs */}
        <nav className="flex flex-wrap gap-4 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setResult(null); }}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm transition-all border ${activeTab === tab.id ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                }`}
            >
              <tab.icon size={20} /> {tab.label}
            </button>
          ))}
        </nav>

        {/* Input UI */}
        <section className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-10 backdrop-blur-3xl shadow-2xl mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {(activeTab === 'text' || activeTab === 'multimodal') && (
              <div className="lg:col-span-2">
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Paste disaster description..."
                  className="w-full h-72 p-8 rounded-[2.5rem] bg-[#020617]/50 border border-white/5 focus:border-blue-500/50 text-blue-100 text-lg outline-none transition-all"
                />
              </div>
            )}

            {(activeTab === 'image' || activeTab === 'multimodal') && (
              <div className="lg:col-span-1">
                <div onClick={() => fileInputRef.current?.click()} className="h-72 border-2 border-dashed border-white/10 rounded-[2.5rem] bg-[#020617]/50 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  {!previewUrl ? (
                    <div className="text-center">
                      <UploadCloud size={56} className="text-blue-400/50 mx-auto mb-4" />
                      <p className="text-xs font-black text-white/40 uppercase tracking-widest">Upload Media</p>
                    </div>
                  ) : (
                    <div className="relative h-full w-full p-4">
                      <img src={previewUrl} className="h-full w-full object-cover rounded-3xl" alt="Preview" />
                      <button onClick={removeFile} className="absolute top-8 right-8 p-3 bg-red-500 text-white rounded-full"><X size={20} /></button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="mt-12 flex justify-center">
            <button onClick={handleAnalyze} disabled={loading} className="px-20 py-6 rounded-full bg-blue-600 text-white font-black uppercase tracking-[0.3em] disabled:opacity-50">
              {loading ? "Neural Core Processing..." : "Initiate Detection"}
            </button>
          </div>
        </section>

        {/* Result UI */}
        <AnimatePresence>
          {result && (
            <motion.div ref={reportRef} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">

              {/* Main Verdict Card */}
              {(() => {
                // --- FIX: Issue 2 (Main Verdict Card Color and Icon Mismatches) ---
                const verdictStr = result?.verdict || '';
                const isCredible = verdictStr.includes('CREDIBLE') || verdictStr === 'Informative';
                const isHighRisk = verdictStr.includes('HIGH RISK') || verdictStr.includes('MISINFORMATION') || verdictStr === 'Non-Informative';
                const isSuspicious = verdictStr.includes('SUSPICIOUS') || verdictStr.includes('UNCERTAIN');

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

                return (
                  <div className={`p-6 rounded-[2.5rem] border-2 flex items-center justify-between gap-8 ${cardStyles}`}>
                    <div className="flex items-center gap-6">
                      <div className={`p-5 rounded-[1.5rem] ${iconContainerStyles}`}>
                        {isCredible ? <ShieldCheck size={40} /> : isHighRisk ? <AlertTriangle size={40} /> : <ShieldAlert size={40} />}
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold">{result.verdict || "Analysis Result"}</h3>
                        <p className="text-white/40 font-bold uppercase text-xs">Score: {((result.credibility_score || 0) * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    <button onClick={downloadPDF} className="p-4 bg-white/10 rounded-2xl"><Download /></button>
                  </div>
                );
              })()}

              {/* Pipeline Tracking Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Stage 1: Text Analysis — highlighted when text is active */}
                <div className={`border p-8 rounded-[2rem] relative overflow-hidden transition-all duration-500 ${result.active_modalities?.text
                    ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.15)]'
                    : 'bg-white/[0.03] border-white/10 opacity-40'
                  }`}>
                  <div className="absolute top-0 right-0 p-4 opacity-10"><FileText size={40} /></div>
                  <h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-4">Stage 1: Text Analysis</h4>
                  <p className="text-lg font-bold text-white leading-tight">
                    {result.stage_2_text_analysis?.text_label || 'N/A'}
                  </p>
                  <div className="mt-4">
                    {result.active_modalities?.text ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-black uppercase ${result.stage_2_text_analysis?.text_label === "Unverified Rumor"
                          ? "bg-red-500/10 border-red-500/20 text-red-300"
                          : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
                        }`}>
                        {result.stage_2_text_analysis?.text_label === "Unverified Rumor" ? "Integrity Audit Flagged" : "Integrity Audit Passed"}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-gray-500/10 rounded border border-gray-500/20 text-gray-400 font-black uppercase">
                        No Text Provided
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage 2: Image Analysis — highlighted when image is active */}
                <div className={`border p-8 rounded-[2rem] relative overflow-hidden transition-all duration-500 ${result.active_modalities?.image
                    ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.15)]'
                    : 'bg-white/[0.03] border-white/10 opacity-40'
                  }`}>
                  <div className="absolute top-0 right-0 p-4 opacity-10"><ImageIcon size={40} /></div>
                  <h4 className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-4">Stage 2: Image Analysis</h4>
                  <p className="text-lg font-bold text-white leading-tight">
                    {result.stage_1_image_analysis?.combined_image_label || 'N/A'}
                  </p>
                  <div className="mt-4 flex gap-2">
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

                {/* Stage 3: Multimodal Fusion — highlighted only when both active */}
                <div className={`border p-8 rounded-[2rem] relative overflow-hidden transition-all duration-500 ${result.active_modalities?.image && result.active_modalities?.text
                    ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                    : 'bg-white/[0.03] border-white/10 opacity-40'
                  }`}>
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={40} /></div>
                  <h4 className="text-[10px] text-purple-400 font-black uppercase tracking-[0.2em] mb-4">Stage 3: Multimodal Fusion</h4>
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
                      {(result.active_modalities?.image && result.active_modalities?.text) ? 'Final Verdict' : 'Requires Both Modalities'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Gauges Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Gauge 1 */}
                <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 text-center relative">
                  <h4 className="text-sm font-bold uppercase text-blue-400 tracking-widest mb-6">Semantic Integrity</h4>
                  <div className="h-56 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { value: result.credibility_score || 0 },
                            { value: 1 - (result.credibility_score || 0) }
                          ]}
                          innerRadius={80}
                          outerRadius={110}
                          startAngle={180}
                          endAngle={0}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell key="cell-score" fill={getScoreColor(result.credibility_score, result.verdict)} />
                          <Cell key="cell-empty" fill="#ffffff05" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pt-12 text-5xl font-black">
                      {((result.credibility_score || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Gauge 2 - Visual Authenticity (Only if image analyzed) */}
                {result.image_score !== undefined && result.image_score !== null && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-12 text-center relative">
                    <h4 className="text-sm font-bold uppercase text-purple-400 tracking-widest mb-10">Visual Authenticity</h4>
                    <div className="h-56 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: (result.image_score || 0) },
                              { value: 1 - (result.image_score || 0) }
                            ]}
                            innerRadius={80}
                            outerRadius={110}
                            startAngle={180}
                            endAngle={0}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell key="img-score" fill={getScoreColor(result.image_score || 0, result.verdict)} />
                            <Cell key="img-empty" fill="#ffffff05" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pt-12 text-5xl font-black">
                        {((result.image_score || 0) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Deep XAI Call to Action */}
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
                    <h4 className="text-xl font-black mb-1 italic tracking-tight">Neural Evidence Trace Available</h4>
                    <p className="text-blue-100/40 text-sm max-w-md font-medium leading-relaxed">
                      Deep explainable AI insights (including visual Grad-CAM focus heatmaps and keyword attributions) are ready for inspection.
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
