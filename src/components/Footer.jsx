import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/images/logo_00.png';
import { Shield, Database, Code2, Server, GraduationCap } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full bg-[#020617] border-t border-blue-500/10 pt-16 pb-8 relative overflow-hidden font-sans">
      
      {/* --- Ambient Glows --- */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* --- Column 1: Project Identity --- */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 group cursor-default">
              <div className="relative w-12 h-12 flex items-center justify-center transition-all duration-500">
                <img 
                  src={logo} 
                  alt="FactFusion Logo" 
                  className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" 
                />
              </div>
              
              <div className="flex flex-col">
                <span className="text-white font-bold text-2xl tracking-tight leading-none">
                  Fact<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Fusion</span>
                </span>
                <span className="text-[10px] text-blue-400/50 font-mono tracking-[0.2em] mt-1 uppercase">AI-Powered Verification</span>
              </div>
            </div>

            <p className="mt-6 text-blue-100/40 max-w-sm leading-relaxed text-sm">
              A Final Year Project focused on <span className="text-blue-400 font-medium">Multimodal Misinformation Detection</span>. 
              Utilizing Explainable AI (XAI) to bridge the gap between complex neural networks and user trust.
            </p>
          </div>

          {/* --- Column 2: Navigation --- */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
              <Shield className="w-4 h-4 text-blue-500" />
              Sitemap
            </h4>
            <ul className="space-y-4 text-blue-100/40 text-sm font-medium">
              <li><Link to="/detection" className="hover:text-blue-400 transition-all duration-300">Detection Engine</Link></li>
              <li><Link to="/xai" className="hover:text-purple-400 transition-all duration-300">Explainability Hub</Link></li>
              <li><Link to="/about" className="hover:text-blue-400 transition-all duration-300">Project Thesis</Link></li>
            </ul>
          </div>

          {/* --- Column 3: Technical Stack (FYP Focus) --- */}
          <div>
            <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              Project Info
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[11px] text-blue-100/40 font-mono">
                <Code2 size={14} className="text-blue-500" />
                <span>React / Tailwind CSS</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-blue-100/40 font-mono">
                <Database size={14} className="text-blue-500" />
                <span>Python / PyTorch / XAI</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-blue-100/40 font-mono">
                <Server size={14} className="text-blue-500" />
                <span>Node.js / MongoDB</span>
              </div>
              
              <div className="pt-2">
                <div className="flex justify-between text-[9px] text-blue-400/60 uppercase mb-1 font-bold">
                  <span>Development Phase</span>
                  <span>60%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="w-[60%] h-full bg-gradient-to-r from-blue-600 to-indigo-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Bottom Bar --- */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100/20">
          <p>© 2026 FactFusion </p>
          <div className="flex items-center gap-2">
            Developed for <span className="text-blue-500/60">Szabist</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;