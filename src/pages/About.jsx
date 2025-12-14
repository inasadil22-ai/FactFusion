import React from 'react';

const About = () => {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-12 text-center">
        <h1 className="text-4xl font-bold mb-6">About the FactFusion Project</h1>
        <p className="text-lg text-gray-300 leading-relaxed mb-8">
          The <span className="text-red-400 font-semibold">FactFusion Project</span> addresses the critical problem of online misinformation by leveraging **Multimodal Deep Learning** to analyze and detect deceptive content across both **Text and Image** modalities. Our key focus is on verifiable and trustworthy AI.
        </p>

        {/* Project Pillars Section */}
        <div className="space-y-6 mb-12">
          {/* Pillar 1: Multimodal Fusion */}
          <div className="p-6 rounded-2xl bg-purple-900/10 border border-purple-500/20 text-left">
            <h3 className="text-purple-400 font-bold text-xl mb-2">Multimodal Data Fusion</h3>
            <p className="text-gray-400">
              We build a system that can simultaneously process and fuse information from disparate sources (Text and Image) using advanced transformer and CNN architectures. This approach significantly improves detection accuracy over single-modality models, especially when text and images contradict each other.
            </p>
          </div>

          {/* Pillar 2: Explainable AI (XAI) */}
          <div className="p-6 rounded-2xl bg-cyan-900/10 border border-cyan-500/20 text-left">
            <h3 className="text-cyan-400 font-bold text-xl mb-2">Transparency via Explainable AI (XAI)</h3>
            <p className="text-gray-400">
              Detection alone is not enough for critical applications. We integrate XAI techniques (such as attention maps or LIME) to highlight *which* words in the text and *which* regions in the image contributed most to the model’s final decision, ensuring the classification is transparent and verifiable.
            </p>
          </div>
        </div>

        {/* Project Goal/Summary (Updated) */}
        <div className="p-8 rounded-2xl bg-red-900/10 border border-red-500/20 mt-10">
          <h3 className="text-red-400 font-bold text-xl mb-2">Primary Project Goal</h3>
          <p className="text-gray-400">
            To develop a robust, high-accuracy, and interpretable Multimodal Misinformation Detector that provides clear evidence for its classification, advancing the state-of-the-art in digital forensics and AI safety.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;