import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/images/logo_000.png';
import { Github, Twitter, Linkedin, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full bg-black border-t border-white/10 pt-16 pb-8 relative overflow-hidden">
      
      {/* Glow adjusted to project colors (Red/Purple) */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-red-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* Column 1: Brand (Updated) */}
          <div className="col-span-1 md:col-span-2">
             <Link to="/" className="flex items-center gap-3 group">
                      {/* Logo glow updated to reflect the detection theme colors */}
                      <div className="relative w-10 h-10 overflow-hidden rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.5)] group-hover:shadow-[0_0_25px_rgba(239,68,68,0.8)] transition-all duration-300">
                        <img 
                          src={logo} 
                          alt="FactFusion Logo" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      
                      <span className="text-white font-bold text-2xl tracking-tight">
                        Fact<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400">Fusion</span> {/* Updated Brand Name */}
                      </span>
                    </Link>
                    <br />
            <p className="text-gray-400 max-w-sm leading-relaxed">
              Utilizing **Multimodal AI** to fuse **Text and Image** data for accurate misinformation detection, enhanced by transparent **Explainable AI (XAI)** insights.
            </p>
          </div>

          {/* Column 2: Quick Links (Updated to Project Features) */}
          <div>
            <h4 className="text-white font-bold mb-6">Features</h4>
            <ul className="space-y-4 text-gray-400">
              <li><Link to="/detection" className="hover:text-red-400 transition-colors">Multimodal Detection</Link></li>
              <li><Link to="/xai" className="hover:text-red-400 transition-colors">XAI Insights</Link></li>
              <li><Link to="/analysis-history" className="hover:text-red-400 transition-colors">Analysis History</Link></li>
            </ul>
          </div>

          {/* Column 3: Connect (Hover colors updated) */}
          <div>
            <h4 className="text-white font-bold mb-6">Connect</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all">
                <Github size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all">
                <Twitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-purple-600/20 hover:border-purple-600/50 transition-all">
                <Linkedin size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar (Copyright updated) */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-content-center items-center gap-4 text-sm text-gray-500">
          <p>© 2025 FactFusion. Multimodal Misinformation Detection using XAI.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;