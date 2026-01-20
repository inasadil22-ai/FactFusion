import React, { useState, useRef } from 'react';
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

const Detection = () => {
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
    if (!textValue && !selectedFile) {
      alert("Please provide text or an image.");
      return;
    }
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('text', textValue);
    if (selectedFile) formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://localhost:5000/api/v1/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
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
              {/* Main Verdict Card */}
              <div className={`p-6 rounded-[2.5rem] border-2 flex items-center justify-between gap-8 ${result.verdict === 'Informative' ? 'bg-emerald-500/5 border-emerald-500/20' :
                result.verdict === 'Non-Informative' ? 'bg-red-500/5 border-red-500/20' : 'bg-gray-500/5 border-gray-500/20'
                }`}>
                <div className="flex items-center gap-6">
                  <div className={`p-5 rounded-[1.5rem] ${result.verdict === 'Informative' ? 'bg-emerald-500/20 text-emerald-400' :
                    result.verdict === 'Non-Informative' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                    {result.verdict === 'Informative' ? <ShieldCheck size={40} /> : result.verdict === 'Non-Informative' ? <AlertTriangle size={40} /> : <ShieldAlert size={40} />}
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold">{result.verdict || "Analysis Result"}</h3>
                    <p className="text-white/40 font-bold uppercase text-xs">Score: {((result.credibility_score || 0) * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <button onClick={downloadPDF} className="p-4 bg-white/10 rounded-2xl"><Download /></button>
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

              {/* XAI Details */}
              {/* XAI Details */}
              {/* XAI Details */}
              <div className={`grid gap-8 ${result.image_score !== undefined && result.image_score !== null ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                {result.image_score !== undefined && result.image_score !== null && (
                  <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-10">
                    <h5 className="text-sm font-bold text-blue-400 mb-8 uppercase tracking-widest">Neural Focus (Grad-CAM)</h5>
                    <div className="aspect-video rounded-[2rem] overflow-hidden bg-black/50 relative">
                      {previewUrl && <img src={previewUrl} className="w-full h-full object-cover opacity-30" alt="XAI Base" />}
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-transparent mix-blend-overlay" />
                    </div>
                    <p className="mt-4 text-[10px] text-white/40 uppercase font-mono">Status: {result.xai_insights?.heatmap_status || "Rendered"}</p>
                  </div>
                )}

                <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-10">
                  <div className="mb-8">
                    <h5 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Logic Transparency</h5>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">Why was this verdict chosen?</p>
                  </div>
                  <p className="text-lg italic text-white/80 mb-6">"{result.xai_insights?.explanation || "No automated explanation generated."}"</p>
                  <div className="flex flex-wrap gap-2">
                    {result.xai_insights?.text_weights?.map((word, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs uppercase font-bold text-blue-300">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Detection;