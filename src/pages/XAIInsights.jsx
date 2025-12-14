import React from 'react';
import { Eye, Zap, MessageSquare, Image } from 'lucide-react'; // Added icons for better context

const XAIInsights = () => {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
          <Eye size={36} className="text-purple-400" /> Explainable AI <span className="text-purple-400">Insights</span>
        </h1>
        <p className="text-gray-400 max-w-4xl mb-10">
          This section provides the core **verifiability** of our FactFusion model. See exactly *why* the AI made its decision by visualizing the most influential components of the text and image inputs.
        </p>
        
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Card 1: Text Feature Importance (Attention Mechanism) */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
            <h2 className="text-xl font-semibold mb-4 text-cyan-300 flex items-center gap-2">
                <MessageSquare size={20} /> Textual Feature Importance
            </h2>
            <p className="text-gray-400 text-sm mb-4">
                This visualization highlights the specific words or phrases in the input text that contributed most heavily to the model's final classification (Misinformation/Legitimate).
            </p>
            {/* Placeholder updated with context */}
            <div className="h-64 bg-black/40 rounded-lg flex items-center justify-center text-gray-600 border border-cyan-500/10">
                <p className="text-center p-4">
                    [Placeholder: Text input with **highlighted** (attention-weighted) words]
                </p>
            </div>
          </div>
          
          {/* Card 2: Image Heatmap Analysis (Visual Attention) */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
            <h2 className="text-xl font-semibold mb-4 text-red-300 flex items-center gap-2">
                <Image size={20} /> Image Visual Attention Heatmap
            </h2>
            <p className="text-gray-400 text-sm mb-4">
                This heatmap shows the regions of the image the AI model focused on. Suspicious objects or cropped areas often show high attention scores if they contribute to a misinformation prediction.
            </p>
            {/* Placeholder updated with context */}
            <div className="h-64 bg-black/40 rounded-lg flex items-center justify-center text-gray-600 border border-red-500/10">
                <p className="text-center p-4">
                    [Placeholder: Original Image overlayed with a **Grad-CAM or LIME** heatmap]
                </p>
            </div>
          </div>
        </div>
        
        {/* Summary/Key Takeaway */}
        <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-purple-500/20">
            <h3 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
                <Zap size={24} /> Multimodal Fusion Score
            </h3>
            <p className="text-gray-300 mt-2">
                The final decision is a weighted combination of these textual and visual insights. This unique fusion approach is what makes the FactFusion model highly robust.
            </p>
        </div>
      </div>
    </div>
  );
};

export default XAIInsights;