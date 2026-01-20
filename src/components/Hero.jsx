import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Search, MessageSquare, Image, Cpu, BarChart3, TrendingUp, FileText, Bot, Zap } from 'lucide-react';
import { AlertTriangle, Map, Radio, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  // --- Configuration ---

  // 1. Floating Background Icons (Blue & Purple Palette)
  // Add these from lucide-react


  const backgroundIcons = [
    { Icon: AlertTriangle, x: "10%", y: "20%", delay: 0, color: "text-red-500/20" }, // Red for alerts
    { Icon: Map, x: "85%", y: "15%", delay: 2, color: "text-blue-500/20" },           // Mapping data
    { Icon: Radio, x: "15%", y: "75%", delay: 4, color: "text-indigo-400/20" },      // Emergency broadcasts
    { Icon: Globe, x: "80%", y: "60%", delay: 1, color: "text-blue-500/20" },        // Global impact
  ];

  const horizonData = [
    { Icon: BarChart3, x: "-10%", y: "55%", size: 400, duration: 30, delay: 0 },
  ];

  const collaborators = [
    { name: "Multimodal Fusion", icon: Zap },
    { name: "Text (RoBERTa)", icon: FileText },
    { name: "Image (CNN/Vision)", icon: Image },
    { name: "Explainable AI (XAI)", icon: BarChart3 },
    { name: "Real-time Detection", icon: TrendingUp },
  ];

  // 2. About Cards Data (Consistency with Palette)
  const aboutCards = [
    {
      title: "Multimodal Fusion",
      desc: "Combines linguistic (Text) and visual (Image) cues for robust detection, overcoming unimodal limitations.",
      icon: MessageSquare,
      color: "from-blue-500 to-purple-500"
    },
    {
      title: "Explainable Decisions (XAI)",
      desc: "Provides transparent insights into why a post is flagged, boosting user trust and model debuggability.",
      icon: BarChart3,
      color: "from-blue-600 to-indigo-600"
    },
    {
      title: "Advanced Deep Learning",
      desc: "Utilizes cutting-edge neural network architectures (CNNs, RoBERTa) for complex feature extraction.",
      icon: Cpu,
      color: "from-indigo-500 to-purple-600"
    }
  ];

  return (
    <div className="w-full bg-[#020617] text-white overflow-x-hidden">

      {/* =======================
          SECTION 1: HERO SCREEN
          ======================= */}
      <div className="relative w-full min-h-screen flex flex-col overflow-hidden pt-20">

        {/* Background Layers */}
        <div
          className="absolute inset-0 z-0 opacity-10 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2670&auto=format&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Floating Icons */}
        {backgroundIcons.map((item, index) => (
          <motion.div
            key={`icon-${index}`}
            className={`absolute z-0 ${item.color} pointer-events-none`}
            style={{ left: item.x, top: item.y }}
            animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, delay: item.delay, ease: "easeInOut" }}
          >
            <item.Icon size={64} strokeWidth={1.5} />
          </motion.div>
        ))}

        {/* Central Glow (Blue-Purple Blend) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none z-0" />

        {/* Data Visuals */}
        {horizonData.map((item, index) => (
          <motion.div
            key={`data-large-${index}`}
            className="absolute z-0 text-blue-900/20 mix-blend-soft-light blur-[4px] pointer-events-none"
            style={{ left: item.x, top: item.y }}
            animate={{ x: ['-2%', '2%', '-2%'], rotate: [-1, 1, -1] }}
            transition={{ duration: item.duration, repeat: Infinity, delay: item.delay, ease: "easeInOut" }}
          >
            <item.Icon size={item.size} strokeWidth={1.5} />
          </motion.div>
        ))}

        {/* V-Shape Graphic (Blue to Purple Gradient) */}
        <svg className="absolute bottom-0 left-0 w-full h-[50vh] pointer-events-none opacity-30 z-0" preserveAspectRatio="none">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: '#8B5CF6', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#3B82F6', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path d="M0,100 Q500,500 1000,100" stroke="url(#grad1)" strokeWidth="2" fill="none" className="w-full" />
        </svg>

        {/* --- EXACT SPACING FROM IMAGE --- */}
        <br />
        <br />
        <br />

        {/* --- HERO CONTENT --- */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto px-4 pb-12">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8 backdrop-blur-md hover:bg-blue-500/20 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-100">Intelligent Verification System</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-7xl font-black tracking-tighter mb-6 leading-[0.9]"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-blue-200">
              Disaster
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-blue-200">
              Misinformation
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              Detection
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-md text-blue-100/60 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            A <span className="text-blue-400 font-semibold">Multimodal AI approach</span> combining Text and Image analysis,
            enhanced by <span className="text-purple-400">Explainable AI (XAI)</span>.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(59, 130, 246, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/detection')}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full font-bold text-white shadow-lg shadow-blue-900/40 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <div className="relative flex items-center gap-2">
                <Search className="w-5 h-5 group-hover:rotate-6 transition-transform duration-500" />
                <span>Start Detection</span>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "rgba(59, 130, 246, 0.1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/xai')}
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/5 border border-blue-500/20 text-blue-100 font-medium backdrop-blur-sm transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span>View XAI Insights</span>
            </motion.button>
          </motion.div>
        </div>

        {/* --- CURVED GLASS MARQUEE --- */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative w-full z-20 mt-auto"
        >
          <div className="w-[140%] -ml-[20%] relative border-t border-blue-500/20 bg-gradient-to-b from-blue-900/10 to-black/90 backdrop-blur-sm rounded-t-[100%] pt-12 pb-8 flex flex-col items-center shadow-2xl shadow-blue-900/20">
            <p className="text-xs font-bold text-blue-400/60 uppercase tracking-widest mb-6">Technical Pillars</p>
            <motion.div
              className="flex gap-12 w-full justify-center"
              animate={{ x: ["5%", "-5%"] }}
              transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            >
              {collaborators.map((item, i) => (
                <div key={i} className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-all duration-300 cursor-pointer group">
                  <item.icon className="w-5 h-5 text-blue-400 group-hover:text-purple-400 transition-colors" />
                  <span className="text-sm font-semibold text-blue-200 group-hover:text-white transition-colors">{item.name}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* =======================
          SECTION 2: PROJECT PILLARS
          ======================= */}
      <section className="relative py-32 bg-[#020617] overflow-hidden">

        {/* Deep background glow */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#020617] to-[#020617] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 z-10">

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-black mb-6 text-white tracking-tight">
              Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Multimodal XAI?</span>
            </h2>
            <div className="h-1 w-24 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-8" />
            <p className="text-blue-100/60 max-w-3xl mx-auto text-xl leading-relaxed font-light">
              Fakenews often uses conflicting text and images. Our system leverages <strong className="text-white font-semibold">fusion and interpretability </strong>
              to provide a transparent detection method.
            </p>
          </motion.div>

          {/* Pillar Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {aboutCards.map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -5, scale: 1.03 }}
                transition={{ duration: 0.25, delay: idx * 0.05, ease: "easeOut" }}
                className="group relative p-1 rounded-[2.5rem] bg-blue-900/10 border border-blue-500/20 overflow-hidden transition-all duration-500 shadow-xl hover:shadow-blue-500/20"
              >
                <div className="relative z-10 h-full p-10 flex flex-col rounded-[2.4rem] bg-[#020617]">
                  <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-8 relative shadow-lg shadow-blue-900/50`}>
                    <div className="absolute inset-0 rounded-3xl bg-white/10 animate-pulse"></div>
                    <card.icon className="w-10 h-10 text-white relative z-10" strokeWidth={1.5} />
                  </div>

                  <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors duration-300">{card.title}</h3>
                  <p className="text-blue-100/50 text-lg leading-relaxed group-hover:text-blue-100/70 transition-colors">
                    {card.desc}
                  </p>

                  {/* Corner Accent */}
                  <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl ${card.color} opacity-5 rounded-tl-[100px] pointer-events-none group-hover:opacity-10 transition-opacity duration-500`} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hero;