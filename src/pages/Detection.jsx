import React from 'react';
import { UploadCloud, Zap } from 'lucide-react'; // Imports necessary icons

const Detection = () => {
  return (

    <div className="min-h-screen bg-neutral-950 text-white selection:bg-red-500/30">
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            {/* Using Red/Pink gradient for branding */}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400">
              Multimodal Misinformation Detection
            </span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Upload an image **with its accompanying text** to initiate the Multimodal Analysis. Our system will assess credibility and provide XAI insights.
          </p>
        </div>

        {/* Detection and Input Area - Layout for Multimodal Input */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 1. Input Card for Text (2/3 width on large screens) */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-semibold text-white mb-4">1. Enter Text Content</h3>
            <textarea
              placeholder="Paste the text from the social media post or article here..."
              rows="10"
              className="w-full p-6 rounded-xl bg-white/5 border border-white/10 focus:border-red-500 focus:ring-red-500/50 text-gray-300 transition-colors resize-none"
            />
          </div>

          {/* 2. Input Card for Image (1/3 width on large screens) */}
          <div className="lg:col-span-1">
            <h3 className="text-xl font-semibold text-white mb-4">2. Upload Image</h3>
            {/* Dropzone/Placeholder - Colors updated to red */}
            <div className="border-2 border-dashed border-red-500/20 rounded-2xl bg-white/5 h-64 flex flex-col items-center justify-center group hover:border-red-500/50 transition-all cursor-pointer">
               <div className="p-4 rounded-full bg-red-500/10 mb-4 group-hover:bg-red-500/20 transition-all">
                 <UploadCloud size={32} className="text-red-400" /> 
               </div>
               <p className="text-lg font-medium text-red-400">Drag & Drop or Click to Upload</p>
               <p className="text-sm text-gray-500 mt-2">Supports .jpg, .png</p>
            </div>
          </div>
        </div>
        
        {/* Action Button */}
        <div className="mt-10 flex justify-center">
          {/* Button gradient updated to Red/Pink */}
          <button className="flex items-center gap-3 px-8 py-3 rounded-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold text-lg shadow-xl shadow-red-900/40 transition-all transform hover:scale-[1.02] active:scale-95">
            <Zap size={20} />
            Run Multimodal Analysis
          </button>
        </div>

      </div>
    </div>
  );
};

export default Detection;