import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, Zap, Search, MessageSquare, Image, Cpu, BarChart3, TrendingUp, X, FileText, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  // --- Configuration ---

  // 1. Floating Background Icons (Now related to AI/Data/Detection)
  const backgroundIcons = [
    { Icon: FileText, x: "10%", y: "20%", delay: 0, color: "text-red-500/20" },
    { Icon: Image, x: "85%", y: "15%", delay: 2, color: "text-blue-500/20" },
    { Icon: Bot, x: "15%", y: "75%", delay: 4, color: "text-cyan-500/20" },
    { Icon: Cpu, x: "80%", y: "60%", delay: 1, color: "text-purple-500/20" },
  ];

  // 2. Horizon Trees (Now Abstract Data Visuals)
  // Removed large icons to reduce clutter, focusing on data layers
  const horizonData = [
    { Icon: BarChart3, x: "-10%", y: "55%", size: 400, duration: 30, delay: 0 },
  ];

  // 3. Marquee Data (Technical Focus/Collaborators - Adjusted to project terms)
  const collaborators = [
    { name: "Multimodal Fusion", icon: Zap },
    { name: "Text BERT/Transformer", icon: FileText },
    { name: "Image CNN/Vision", icon: Image },
    { name: "Explainable AI (XAI)", icon: BarChart3 },
    { name: "Real-time Detection", icon: TrendingUp },
    // Duplicate for infinite loop
    { name: "Multimodal Fusion", icon: Zap },
    { name: "Text BERT/Transformer", icon: FileText },
    { name: "Image CNN/Vision", icon: Image },
    { name: "Explainable AI (XAI)", icon: BarChart3 },
    { name: "Real-time Detection", icon: TrendingUp },
  ];

  // 4. About Cards Data (Matching project pillars)
  const aboutCards = [
    { 
      title: "Multimodal Fusion", 
      desc: "Combines linguistic (Text) and visual (Image) cues for robust detection, overcoming unimodal limitations.",
      icon: MessageSquare,
      color: "from-blue-500 to-purple-500" // Text & Vision
    },
    { 
      title: "Explainable Decisions (XAI)", 
      desc: "Provides transparent insights into *why* a post is flagged, boosting user trust and model debuggability.",
      icon: BarChart3,
      color: "from-cyan-500 to-teal-500" // Explanation/Transparency
    },
    { 
      title: "Advanced Deep Learning", 
      desc: "Utilizes cutting-edge neural network architectures (CNNs, BERT) for complex feature extraction.",
      icon: Cpu,
      color: "from-red-500 to-pink-500" // ML Core
    }
  ];

  return (
    <div className="w-full bg-[#050505] text-white overflow-x-hidden">
      
      {/* =======================
          SECTION 1: HERO SCREEN
         ======================= */}
      <div className="relative w-full min-h-screen flex flex-col overflow-hidden pt-20">
        
        {/* --- Background Layers (Swapped to Cyber/Data Theme) --- */}
        <div 
          className="absolute inset-0 z-0 opacity-20 mix-blend-overlay pointer-events-none"
          style={{
            // Abstract Tech background
            backgroundImage: `url('https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2670&auto=format&fit=crop')`, 
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div 
          className="absolute inset-0 z-0 opacity-100 mix-blend-soft-light pointer-events-none blur-[2px]"
          style={{
            // Circuit/Data background (subtle pattern)
            backgroundImage: `url('https://images.unsplash.com/photo-1517430489246-042867c2162a?q=80&w=2670&auto=format&fit=crop')`, 
            backgroundSize: 'cover',
            backgroundPosition: 'bottom',
          }}
        />
        
        {/* Floating Icons (Updated Icons/Colors) */}
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

        {/* Central Glow (Changed to Blue/Purple) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none z-0" />

        {/* Data Visuals (Replaced Trees) */}
        {horizonData.map((item, index) => (
          <motion.div
            key={`data-large-${index}`}
            className="absolute z-0 text-gray-900/50 mix-blend-soft-light blur-[4px] pointer-events-none"
            style={{ left: item.x, top: item.y }}
            animate={{ x: ['-2%', '2%', '-2%'], rotate: [-1, 1, -1] }}
            transition={{ duration: item.duration, repeat: Infinity, delay: item.delay, ease: "easeInOut" }}
          >
            {/* Using an abstract icon to represent data volume or structure */}
            <item.Icon size={item.size} strokeWidth={1.5} /> 
          </motion.div>
        ))}
        
        {/* V-Shape Graphic (Changed Gradient to Blue/Red) */}
        <svg className="absolute bottom-0 left-0 w-full h-[50vh] pointer-events-none opacity-30 z-0" preserveAspectRatio="none">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#8B5CF6', stopOpacity: 0 }} /> {/* Purple */}
              <stop offset="50%" style={{ stopColor: '#EF4444', stopOpacity: 1 }} /> {/* Red */}
              <stop offset="100%" style={{ stopColor: '#8B5CF6', stopOpacity: 0 }} /> {/* Purple */}
            </linearGradient>
          </defs>
          <path d="M0,100 Q500,500 1000,100" stroke="url(#grad1)" strokeWidth="2" fill="none" className="w-full" />
          <path d="M-100,200 Q500,600 1100,200" stroke="url(#grad1)" strokeWidth="1" fill="none" className="w-full opacity-50" />
        </svg>
<br />
<br />
<br />

        {/* --- HERO CONTENT --- */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto px-4 pb-12">
          {/* Badge (Changed to Detection Focus) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md hover:bg-white/10 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-300">Final Year Project: Intelligent Verification System</span>
          </motion.div>

          {/* Title (Project Title) */}
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter mb-6 drop-shadow-2xl"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
              Fakenews
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-purple-400 to-blue-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.3)]">
               Detection
            </span>
          </motion.h1>

          {/* Subtitle (Project Description) */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            A <span className="text-white font-semibold">Multimodal AI approach</span> combining **Text and Image** analysis for robust misinformation detection,
            enhanced by **Explainable AI (XAI)**.
          </motion.p>

          {/* Buttons (Changed to Detection & XAI Insights) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(239, 68, 68, 0.5)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/detection')} // Direct to the core feature
              className="group relative px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 rounded-full font-bold text-white shadow-lg shadow-red-900/40 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <div className="relative flex items-center gap-2">
                <Search className="w-5 h-5 group-hover:rotate-6 transition-transform duration-500" />
                <span>Start Detection</span>
              </div>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/xai')} // Direct to XAI Insights
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-medium transition-colors backdrop-blur-sm"
            >
              <BarChart3 className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
              <span>View XAI Insights</span>
            </motion.button>
          </motion.div>
        </div>

        {/* --- CURVED GLASS MARQUEE (Updated Content) --- */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative w-full z-20 mt-auto" 
        >
          <div className="w-[140%] -ml-[20%] relative border-t border-white/10 bg-gradient-to-b from-white/5 to-black/90 backdrop-blur-sm rounded-t-[100%] pt-12 pb-8 flex flex-col items-center shadow-2xl shadow-red-900/20">
              
              <p className="text-xs font-bold text-red-500/60 uppercase tracking-widest mb-6">Technical Pillars</p>
              
              <motion.div 
                className="flex gap-12 w-full justify-center"
                animate={{ x: ["10%", "-10%"] }}
                transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              >
                 {collaborators.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer group">
                       <item.icon className="w-5 h-5 text-red-400 group-hover:text-white transition-colors"/> 
                       <span className="text-sm font-semibold text-gray-400 group-hover:text-white transition-colors">{item.name}</span>
                    </div>
                 ))}
              </motion.div>
          </div>
        </motion.div>

      </div>


      {/* =======================
          SECTION 2: PROJECT PILLARS
         ======================= */}
      <section className="relative py-32 bg-[#0a0a0a] overflow-hidden">
        
        {/* Background Elements (Changed to Red/Purple Glow) */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0a0a0a] to-[#0a0a0a] pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 z-10">
          
          {/* Header with Staggered Reveal */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.2 } }
            }}
            className="text-center mb-20"
          >
            <motion.h2 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
              Why <span className="relative inline-block">
                <span className="absolute -inset-2 bg-gradient-to-r from-red-500/20 to-purple-500/20 blur-lg rounded-lg"></span>
                <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-pink-300 to-purple-400">Multimodal XAI?</span>
              </span>
            </motion.h2>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="h-1 w-24 mx-auto bg-gradient-to-r from-red-500 to-purple-500 rounded-full mb-8" />
            <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-gray-300 max-w-3xl mx-auto text-xl leading-relaxed font-light">
              Fakenews often uses conflicting text and images. Our system leverages <strong className="text-white font-semibold">fusion and interpretability</strong>
              to provide a verifiable and transparent detection method.
            </motion.p>
          </motion.div>

          {/* Interactive 3D Tilt Cards (Updated Content) */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {aboutCards.map((card, idx) => (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 50, scale: 0.9 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.4, duration: 0.8 } }
                }}
                whileHover={{ y: -15, scale: 1.03, rotateX: 5, rotateY: 5, z: 50 }}
                initial={{ rotateX: 0, rotateY: 0, z: 0 }}
                style={{ perspective: 1000 }}
                className="group relative p-1 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-white/5 overflow-hidden transition-all duration-500 shadow-xl hover:shadow-red-500/20"
              >
                {/* Animated Border & Glow (Updated Colors) */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700 -z-10`} />
                <div className="absolute inset-[1px] rounded-[2.4rem] bg-[#0a0a0a] z-0" />
                
                <div className="relative z-10 h-full p-10 flex flex-col rounded-[2.4rem] overflow-hidden">
                  {/* Icon with Pulse and Rotate Animation (Updated Colors) */}
                  <motion.div 
                    whileHover={{ rotate: [0, -10, 10, -5, 5, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-8 shadow-lg shadow-${card.color.split('-')[1]}/30 relative`}
                  >
                    <div className="absolute inset-0 rounded-3xl bg-white/20 animate-ping opacity-30"></div>
                    <card.icon className="w-10 h-10 text-white relative z-10" strokeWidth={1.5} />
                  </motion.div>
                  
                  <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">{card.title}</h3>
                  <p className="text-gray-400 text-lg leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                    {card.desc}
                  </p>

                  {/* Corner Decoration (Updated Colors) */}
                  <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${card.color} opacity-10 rounded-tl-[100px] pointer-events-none group-hover:opacity-20 transition-opacity duration-500`} />
                </div>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </section>

    </div>
  );
};

export default Hero;