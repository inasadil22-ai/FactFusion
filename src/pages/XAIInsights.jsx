import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import {
  Fingerprint, MessageSquare, Image as ImageIcon,
  Cpu, Target, Zap, Activity, ShieldCheck, ChevronDown,
  FileText, Layers, AlertTriangle, Clock, ArrowRight, Download
} from 'lucide-react';
import { XAIVisualizer } from './Detection';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://inas-00-factfusion-backend.hf.space';

import { classifyVerdict, getVerdictColor, getVerdictBg } from '../utils/verdict';

// ---------------------------------------------------------------------------
// Verdict helpers imported from ../utils/verdict
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Heatmap method label
// ---------------------------------------------------------------------------
// FIX 2: Case-insensitive matching — no longer breaks if backend sends
//         'GradCAM', 'Grad-CAM+', 'SHAP', etc.
//         Unknown methods show as-is (uppercased) instead of defaulting to CLIP.

const getHeatmapMethodLabel = (method) => {
  if (!method) return null;
  const m = method.toLowerCase();
  if (m.includes('shap')) return '⚡ SHAP';
  if (m.includes('grad')) return '🔥 Grad-CAM';
  if (m.includes('clip')) return '🔍 CLIP';
  return method.toUpperCase(); // unknown method: show raw value
};

// ---------------------------------------------------------------------------
// XAIInsights Component
// ---------------------------------------------------------------------------

const XAIInsights = () => {
  const [searchParams] = useSearchParams();
  const scanId = searchParams.get('id');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadFullReport = async () => {
    if (!selected) return;
    setIsDownloading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 16;
      const contentW = pageW - margin * 2;
      let y = margin;

      const accent = [59, 130, 246];    // blue
      const purple = [168, 85, 247];
      const indigo = [99, 102, 241];
      const emerald = [16, 185, 129];
      const amber = [245, 158, 11];
      const red = [239, 68, 68];
      const dark = [2, 6, 23];
      const cardBg = [10, 17, 40];
      const textWhite = [255, 255, 255];
      const textMuted = [148, 163, 184];

      const checkNewPage = (needed = 20) => {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
          drawPageHeader();
        }
      };

      const drawPageHeader = () => {
        doc.setFillColor(...dark);
        doc.rect(0, 0, pageW, pageH, 'F');
        doc.setFillColor(accent[0], accent[1], accent[2], 0.05);
        doc.rect(0, 0, pageW, 8, 'F');
        doc.setFontSize(7);
        doc.setTextColor(...textMuted);
        doc.text('FactFusion · Forensic Intelligence Report', margin, 5.5);
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 5.5, { align: 'right' });
      };

      const drawSectionLabel = (label, color = accent) => {
        checkNewPage(14);
        doc.setFontSize(7);
        doc.setTextColor(...color);
        doc.setFont(undefined, 'bold');
        doc.text(label.toUpperCase(), margin, y);
        y += 4;
        doc.setDrawColor(...color);
        doc.setLineWidth(0.3);
        doc.line(margin, y, margin + contentW * 0.4, y);
        y += 5;
        doc.setFont(undefined, 'normal');
      };

      const drawCard = (height, fillColor = cardBg, borderColor = [30, 41, 70]) => {
        checkNewPage(height + 4);
        doc.setFillColor(...fillColor);
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, contentW, height, 3, 3, 'FD');
      };

      const verdictColorArr = () => {
        const v = (selected?.verdict || '').toLowerCase();
        if (v.includes('credible') || v.includes('real')) return emerald;
        if (v.includes('fake') || v.includes('misinformation')) return red;
        if (v.includes('suspicious') || v.includes('rumor')) return amber;
        return textMuted;
      };

      // ── Page 1 ────────────────────────────────────────────────────────────
      drawPageHeader();
      y = 16;

      // Title block
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.roundedRect(margin, y, contentW, 24, 3, 3, 'F');
      doc.setFontSize(18);
      doc.setTextColor(...textWhite);
      doc.setFont(undefined, 'bold');
      doc.text('FactFusion', margin + 6, y + 9);
      doc.setFontSize(9);
      doc.setTextColor(200, 220, 255);
      doc.setFont(undefined, 'normal');
      doc.text('Forensic Intelligence Report', margin + 6, y + 16);
      doc.setFontSize(7);
      doc.setTextColor(180, 210, 255);
      const recordLabel = selected?.text_snippet
        ? selected.text_snippet.split(' ').slice(0, 8).join(' ') + '…'
        : selected?.image_ref || 'Analysis Report';
      doc.text(`Scan: ${recordLabel}`, pageW - margin - 2, y + 16, { align: 'right' });
      y += 30;

      // ── Verdict Banner ──────────────────────────────────────────────────
      drawSectionLabel('Final Verdict', verdictColorArr());
      const vColor = verdictColorArr();
      doc.setFillColor(vColor[0], vColor[1], vColor[2], 0.08);
      doc.setDrawColor(...vColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentW, 22, 3, 3, 'FD');

      doc.setFontSize(14);
      doc.setTextColor(...vColor);
      doc.setFont(undefined, 'bold');
      doc.text(selected?.verdict || 'N/A', margin + 6, y + 9);

      const credScore = ((selected?.credibility_score ?? 0) * 100).toFixed(1);
      const imgScore = selected?.image_score != null ? ((selected.image_score ?? 0) * 100).toFixed(1) : null;
      doc.setFontSize(8);
      doc.setTextColor(...textMuted);
      doc.setFont(undefined, 'normal');
      doc.text(`Credibility: ${credScore}%${imgScore ? `  ·  Visual Auth: ${imgScore}%` : ''}`, margin + 6, y + 16);
      y += 27;

      // ── Detection Summary ───────────────────────────────────────────────
      drawSectionLabel('Detection Summary', indigo);

      const stages = [
        {
          label: 'Stage 1 — Text Analysis',
          value: selected?.stage_2_text_analysis?.text_label || 'N/A',
          active: hasText,
          color: indigo,
          badge: ['Non-Informative', 'OOD'].includes(selected?.stage_2_text_analysis?.text_label) ? 'FLAGGED' : 'PASSED',
          badgeColor: ['Non-Informative', 'OOD'].includes(selected?.stage_2_text_analysis?.text_label) ? red : emerald,
        },
        {
          label: 'Stage 2 — Image Analysis',
          value: selected?.stage_1_image_analysis?.combined_image_label || 'N/A',
          sub: selected?.stage_1_image_analysis
            ? `Semantic: ${selected.stage_1_image_analysis.semantic_label || 'N/A'}  ·  Forensic: ${selected.stage_1_image_analysis.forensic_label || 'N/A'}`
            : null,
          active: hasImage,
          color: accent,
          badge: hasImage ? (selected?.stage_1_image_analysis?.semantic_label || 'N/A') : 'NO IMAGE',
          badgeColor: hasImage ? accent : textMuted,
        },
        {
          label: 'Stage 3 — Multimodal Fusion',
          value: (hasText && hasImage) ? (selected?.stage_3_multimodal_fusion?.multimodal_label || 'N/A') : 'N/A — Single Modality',
          active: hasText && hasImage,
          color: purple,
          badge: (hasText && hasImage) ? 'FINAL VERDICT' : 'SINGLE MODE',
          badgeColor: (hasText && hasImage) ? purple : textMuted,
        },
      ];

      for (const stage of stages) {
        checkNewPage(22);
        const alpha = stage.active ? 1 : 0.35;
        doc.setFillColor(...cardBg);
        doc.setDrawColor(stage.active ? stage.color[0] : 40, stage.active ? stage.color[1] : 50, stage.active ? stage.color[2] : 80);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, contentW, stage.sub ? 20 : 16, 2, 2, 'FD');

        doc.setFontSize(6.5);
        doc.setTextColor(...(stage.active ? stage.color : textMuted));
        doc.setFont(undefined, 'bold');
        doc.text(stage.label, margin + 4, y + 5.5);

        doc.setFontSize(8.5);
        doc.setTextColor(...(stage.active ? textWhite : textMuted));
        doc.setFont(undefined, stage.active ? 'bold' : 'normal');
        doc.text(stage.value, margin + 4, y + 11.5);

        if (stage.sub) {
          doc.setFontSize(6.5);
          doc.setTextColor(...textMuted);
          doc.setFont(undefined, 'normal');
          doc.text(stage.sub, margin + 4, y + 17);
        }

        // badge
        doc.setFontSize(6);
        doc.setTextColor(...stage.badgeColor);
        doc.setFont(undefined, 'bold');
        doc.text(stage.badge, pageW - margin - 4, y + 5.5, { align: 'right' });

        y += (stage.sub ? 20 : 16) + 3;
      }

      y += 4;

      // ── XAI Insights ───────────────────────────────────────────────────
      checkNewPage(10);
      drawSectionLabel('XAI Evidence — Text Attribution', indigo);

      if (xai.text_attributions && xai.text_attributions.length > 0) {
        const maxW2 = Math.max(...xai.text_attributions.map(a => Math.abs(a.weight)), 0.001);
        const barH = 5;
        const labelW = 30;
        const barAreaW = contentW - labelW - 22;

        for (const attr of xai.text_attributions) {
          checkNewPage(barH + 3);
          const pct = Math.abs(attr.weight) / maxW2;
          const isPos = attr.weight >= 0;
          const barColor = isPos ? red : accent;

          doc.setFontSize(7);
          doc.setTextColor(...textWhite);
          doc.setFont(undefined, 'normal');
          doc.text(attr.token, margin + labelW - 2, y + barH - 1, { align: 'right' });

          doc.setFillColor(20, 30, 60);
          doc.roundedRect(margin + labelW, y, barAreaW, barH, 1, 1, 'F');

          doc.setFillColor(...barColor);
          doc.roundedRect(margin + labelW, y, barAreaW * pct, barH, 1, 1, 'F');

          doc.setFontSize(6.5);
          doc.setTextColor(...(isPos ? red : accent));
          doc.text(`${isPos ? '+' : ''}${attr.weight.toFixed(3)}`, margin + labelW + barAreaW + 2, y + barH - 1);

          y += barH + 2;
        }

        y += 3;
        doc.setFontSize(6);
        doc.setTextColor(...textMuted);
        doc.text('Red = pushes toward disaster · Blue = pushes against · Bar length = relative importance', margin, y);
        y += 7;
      } else if (xai.text_weights && xai.text_weights.length > 0) {
        checkNewPage(14);
        drawCard(12);
        doc.setFontSize(7.5);
        doc.setTextColor(...textWhite);
        doc.text('Keyword Signals: ' + xai.text_weights.join(', '), margin + 4, y + 7);
        y += 16;
      } else {
        checkNewPage(12);
        drawCard(10);
        doc.setFontSize(7.5);
        doc.setTextColor(...textMuted);
        doc.text('No text attributions available for this scan.', margin + 4, y + 6.5);
        y += 14;
      }

      // ── Logic Transparency ─────────────────────────────────────────────
      checkNewPage(10);
      drawSectionLabel('Logic Transparency', purple);

      const expLines = doc.splitTextToSize(`"${explanationText}"`, contentW - 8);
      const expH = expLines.length * 4.5 + 10;
      checkNewPage(expH);
      drawCard(expH);
      doc.setFontSize(8);
      doc.setTextColor(200, 210, 240);
      doc.setFont(undefined, 'italic');
      doc.text(expLines, margin + 4, y + 6);
      doc.setFont(undefined, 'normal');
      y += expH + 4;

      // Text evidence summary
      if (xai.text_attributions && xai.text_attributions.length > 0) {
        const top = [...xai.text_attributions].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)).slice(0, 3);
        const forDisaster = top.filter(t => t.weight > 0);
        const against = top.filter(t => t.weight < 0);

        checkNewPage(16);
        drawCard(14, cardBg, indigo);
        doc.setFontSize(6.5);
        doc.setTextColor(...indigo);
        doc.setFont(undefined, 'bold');
        doc.text('📝 TEXT EVIDENCE', margin + 4, y + 5);
        doc.setFont(undefined, 'normal');
        let lineY = y + 10;
        if (forDisaster.length > 0) {
          doc.setTextColor(...red);
          doc.text('Disaster: ', margin + 4, lineY);
          doc.setTextColor(...textWhite);
          doc.text(forDisaster.map(t => `"${t.token}" (+${t.weight.toFixed(2)})`).join(', '), margin + 20, lineY);
          lineY += 4;
        }
        if (against.length > 0) {
          doc.setTextColor(...accent);
          doc.text('Against: ', margin + 4, lineY);
          doc.setTextColor(...textWhite);
          doc.text(against.map(t => `"${t.token}" (${t.weight.toFixed(2)})`).join(', '), margin + 20, lineY);
        }
        y += 18;
      }

      if (hasImage) {
        checkNewPage(14);
        drawCard(12, cardBg, purple);
        doc.setFontSize(6.5);
        doc.setTextColor(...purple);
        doc.setFont(undefined, 'bold');
        doc.text('🖼 IMAGE EVIDENCE', margin + 4, y + 5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...textWhite);
        doc.text(
          `Semantic: ${selected?.stage_1_image_analysis?.semantic_label || 'N/A'}   ·   Forensic: ${selected?.stage_1_image_analysis?.forensic_label || 'N/A'}   ·   Auth Score: ${imgScore}%`,
          margin + 4, y + 10
        );
        y += 16;
      }

      if (xai.dominant_modality) {
        checkNewPage(12);
        const dColor = xai.dominant_modality.toLowerCase() === 'image' ? red : purple;
        drawCard(10, cardBg, dColor);
        doc.setFontSize(6.5);
        doc.setTextColor(...dColor);
        doc.setFont(undefined, 'bold');
        doc.text('⚡ DECISION DRIVER', margin + 4, y + 5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...textWhite);
        doc.text(`The ${xai.dominant_modality} modality had stronger evidence and primarily drove this verdict.`, margin + 4, y + 9);
        y += 14;
      }

      // ── Heatmap Info ──────────────────────────────────────────────────
      if (hasHeatmap) {
        y += 4;
        checkNewPage(10);
        drawSectionLabel('Visual Saliency Analysis', accent);

        checkNewPage(22);
        drawCard(20);
        doc.setFontSize(8);
        doc.setTextColor(...textWhite);
        doc.setFont(undefined, 'bold');
        doc.text('Grad-CAM / SHAP Visual Heatmap', margin + 4, y + 7);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...textMuted);
        const heatDesc = [
          `Method: ${getHeatmapMethodLabel(xai.heatmap_method) || 'N/A'}`,
          `Status: ${xai.heatmap_status || 'N/A'}`,
          `Dominant Modality: ${xai.dominant_modality || 'N/A'}`,
        ].join('   ·   ');
        doc.text(heatDesc, margin + 4, y + 13);
        doc.setFontSize(6.5);
        doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text('Red regions in heatmap = high-evidence disaster zones · Boxes = top decision areas', margin + 4, y + 18);
        y += 24;
      }

      // ── Pipeline Audit Trail ──────────────────────────────────────────
      y += 2;
      checkNewPage(10);
      drawSectionLabel('Pipeline Audit Trail', purple);

      checkNewPage(58);
      drawCard(56, cardBg, [50, 30, 80]);
      const pipeStages = [
        { label: 'Stage 1 — Text Analysis (RoBERTa)', result: selected?.stage_2_text_analysis?.text_label || 'N/A', active: hasText, color: indigo },
        { label: 'Stage 2 — Image Analysis (EfficientNet + Forensic)', result: selected?.stage_1_image_analysis?.combined_image_label || 'N/A', active: hasImage, color: accent },
        { label: 'Stage 3 — Multimodal Fusion (CLIP Cross-Modal)', result: (hasText && hasImage) ? selected?.stage_3_multimodal_fusion?.multimodal_label || 'N/A' : 'N/A — Single Modality', active: hasText && hasImage, color: purple },
      ];

      let pipeY = y + 6;
      for (let i = 0; i < pipeStages.length; i++) {
        const ps = pipeStages[i];
        doc.setFillColor(ps.active ? ps.color[0] : 40, ps.active ? ps.color[1] : 50, ps.active ? ps.color[2] : 80);
        doc.circle(margin + 8, pipeY + 3, 2.5, 'F');
        doc.setFontSize(6.5);
        doc.setTextColor(...(ps.active ? ps.color : textMuted));
        doc.setFont(undefined, 'bold');
        doc.text(ps.label, margin + 14, pipeY + 2);
        doc.setFontSize(8);
        doc.setTextColor(...(ps.active ? textWhite : textMuted));
        doc.setFont(undefined, ps.active ? 'bold' : 'normal');
        doc.text(ps.result, margin + 14, pipeY + 7);
        if (i < pipeStages.length - 1) {
          doc.setDrawColor(...textMuted);
          doc.setLineWidth(0.2);
          doc.line(margin + 8, pipeY + 5.5, margin + 8, pipeY + 14);
        }
        pipeY += 17;
      }
      y += 60;

      // ── Score Summary ─────────────────────────────────────────────────
      checkNewPage(28);
      drawSectionLabel('Score Summary', emerald);
      drawCard(22);

      const scores = [
        { label: 'Credibility Score', value: credScore + '%', color: emerald },
        imgScore ? { label: 'Visual Authenticity', value: imgScore + '%', color: purple } : null,
        selected?.stage_3_multimodal_fusion?.fusion_score != null
          ? { label: 'Fusion Score', value: ((selected.stage_3_multimodal_fusion.fusion_score ?? 0) * 100).toFixed(1) + '%', color: accent }
          : null,
      ].filter(Boolean);

      const colW = contentW / scores.length;
      scores.forEach((s, i) => {
        const cx = margin + colW * i + colW / 2;
        doc.setFontSize(6.5);
        doc.setTextColor(...s.color);
        doc.setFont(undefined, 'bold');
        doc.text(s.label.toUpperCase(), cx, y + 7, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(...textWhite);
        doc.text(s.value, cx, y + 17, { align: 'center' });
      });
      y += 26;

      // ── Footer ────────────────────────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(6.5);
        doc.setTextColor(...textMuted);
        doc.text(
          `FactFusion Forensic Report  ·  Page ${p} of ${totalPages}  ·  Powered by RoBERTa + EfficientNet + CLIP`,
          pageW / 2, pageH - 5, { align: 'center' }
        );
      }

      doc.save(`FactFusion_Report_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Report generation failed:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Block A: Fetch history once on mount
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const fetchRecords = async () => {
      try {
        setLoading(true);
        const userString = localStorage.getItem('user');
        let url = `${API_BASE}/api/v1/analysis-history`;

        if (userString) {
          try {
            const user = JSON.parse(userString);
            if (user?.id && user?.role !== 'admin') {
              url += `?user_id=${user.id}&limit=15`;
            } else if (user?.role === 'admin') {
              url += `?limit=15`;
            }
          } catch (e) {
            console.error('Error parsing user for XAI query:', e);
          }
        }

        const res = await axios.get(url, { signal: controller.signal });
        if (cancelled) return;

        const rawData = Array.isArray(res.data) ? res.data : [];
        const hasXai = (r) => r && r.xai_insights && Object.keys(r.xai_insights).length > 0;
        const withXai = rawData.filter(hasXai).slice(0, 15);

        if (rawData.filter(hasXai).length > 15) {
          console.warn(`[XAIInsights] ${rawData.length} records received — showing latest 15 only.`);
        }

        setRecords(withXai);
      } catch (err) {
        if (axios.isCancel(err) || err?.name === 'CanceledError') return;
        console.error('Failed to fetch analysis history:', err);
        setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRecords();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Block B: Select the right record when scanId or records change
  useEffect(() => {
    if (records.length > 0) {
      let defaultIdx = 0;
      if (scanId) {
        const idx = records.findIndex(r => r.id === scanId || r._id === scanId);
        if (idx !== -1) defaultIdx = idx;
      }
      setSelectedIdx(defaultIdx);
    } else {
      setSelectedIdx(null);
    }
  }, [scanId, records]);

  const selected = selectedIdx !== null ? (records[selectedIdx] || null) : null;
  const xai = selected?.xai_insights || {};

  // FIX 4: image_score check — use != null (covers undefined too) so score=0 still shows image panel
  const hasImage = !!(selected?.image_ref && selected?.image_score != null);
  const hasText = !!selected?.text_snippet;
  const hasHeatmap = Array.isArray(xai.visual_heatmap) && xai.visual_heatmap.length > 0;

  // FIX 5: dominant_modality — case-insensitive compare throughout
  const dominantModality = xai.dominant_modality?.toLowerCase();

  // FIX 6: explanation — split on ' | Audit Path: ' is documented and guarded;
  //         if the separator isn't found, [0] safely returns the full string.
  //         Backend should ideally send separate `explanation` + `audit_path` fields.
  const explanationText = (xai.explanation || '').split(' | Audit Path: ')[0] || 'No automated explanation generated.';

  // FIX 7: verdict in dropdown — split on em-dash OR hyphen via regex
  const getShortVerdict = (verdict) =>
    verdict?.split(/\s*[—-]\s*/)[0]?.trim() || 'N/A';

  const getRecordLabel = (record, idx) => {
    if (!record) return 'Select a scan to inspect...';
    if (record.text_snippet) {
      const words = record.text_snippet.split(' ');
      return words.length > 5 ? words.slice(0, 5).join(' ') + '…' : record.text_snippet;
    }
    if (record.image_ref) return `Image: ${record.image_ref}`;
    return `Analysis #${idx + 1}`;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-hidden relative font-sans">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20">

        {/* Header */}
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
          >
            <Fingerprint className="text-blue-400 w-4 h-4" />
            <span className="text-[10px] font-black tracking-[0.2em] text-blue-300 uppercase">Neural Interpretability Layer</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-[0.9]"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-blue-200">
              Explainable AI{' '}
              <span className="text-blue-500 inline-block drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                Evidence
              </span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-blue-100/60 max-w-2xl leading-relaxed"
          >
            FactFusion provides explainable evidence for every detection. We use SHAP attributions and Grad-CAM heatmaps to reveal which tokens and image regions triggered each verdict.
          </motion.p>
        </header>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <Activity size={40} className="text-blue-500/40 mx-auto mb-4 animate-pulse" />
              <p className="text-xs font-black text-white/20 uppercase tracking-widest">
                Synchronizing Neural Archive...
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && records.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-24 h-24 rounded-[2rem] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-8">
              <Fingerprint size={40} className="text-blue-400/40" />
            </div>
            <h3 className="text-2xl font-black mb-3 tracking-tight">No Analyses Yet</h3>
            <p className="text-white/40 max-w-md mb-8 font-medium">
              Run your first detection to generate XAI evidence. Token attributions, heatmaps, and
              audit trails will appear here.
            </p>
            <Link
              to="/detection"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-sm hover:bg-blue-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all duration-300"
            >
              Go to Detection <ArrowRight size={16} />
            </Link>
          </motion.div>
        )}

        {/* Main Content */}
        {!loading && records.length > 0 && (
          <div className="space-y-10">

            {/* Selector + Download Row */}
            <div className="flex items-center gap-4">
              <div className="relative max-w-2xl flex-1">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between gap-4 px-8 py-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-500/30 hover:bg-white/[0.05] hover:shadow-[0_0_25px_rgba(59,130,246,0.1)] transition-all duration-300 text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2.5 rounded-xl bg-blue-500/10">
                      <Cpu size={18} className="text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                        Inspecting Analysis
                      </p>
                      <p className="text-sm font-bold text-white truncate">
                        {getRecordLabel(selected, selectedIdx)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black uppercase px-3 py-1 rounded-lg border ${getVerdictBg(selected)} ${getVerdictColor(selected)}`}>
                      {selected?.verdict || 'N/A'}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-white/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute z-50 w-full mt-2 rounded-2xl bg-[#0a1128] border border-white/10 shadow-2xl overflow-hidden max-h-72 overflow-y-auto"
                    >
                      {records.map((record, idx) => (
                        <button
                          key={record.id || record._id || idx}
                          onClick={() => { setSelectedIdx(idx); setDropdownOpen(false); }}
                          className={`w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-blue-500/10 transition-all border-b border-white/5 last:border-b-0 ${idx === selectedIdx ? 'bg-blue-500/10' : ''}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex gap-1.5">
                              <FileText size={14} className={record.text_snippet ? 'text-blue-400' : 'text-white/10'} />
                              <ImageIcon size={14} className={record.image_ref ? 'text-indigo-400' : 'text-white/10'} />
                            </div>
                            <span className="text-sm text-white/80 font-medium truncate">
                              {getRecordLabel(record, idx)}
                            </span>
                          </div>
                          {/* FIX 7: regex split handles em-dash and regular hyphen */}
                          <span className={`text-[10px] font-black uppercase ${getVerdictColor(record)}`}>
                            {getShortVerdict(record.verdict)}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Download Report Button */}
              {selected && (
                <button
                  onClick={downloadFullReport}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase tracking-[0.15em] text-xs transition-all shadow-lg shadow-blue-900/30 hover:-translate-y-0.5 flex-shrink-0"
                  title="Download Full Forensic Report (PDF)"
                >
                  <Download size={16} />
                  {isDownloading ? 'Generating…' : 'Download Report'}
                </button>
              )}
            </div>
            <AnimatePresence mode="wait">
              {selectedIdx !== null && (
                <motion.div
                  key={selectedIdx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {/* Row 1: Attributions & Heatmap */}
                  <div className={`grid gap-8 ${hasHeatmap ? 'md:grid-cols-2' : 'grid-cols-1'}`}>

                    {/* Text Attributions Card */}
                    <div className="flex flex-col p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl hover:border-blue-500/20 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(59,130,246,0.05)] transition-all duration-300">
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                          <MessageSquare size={24} className="text-blue-400" /> Textual Attention
                        </h2>
                        <Cpu size={20} className="text-blue-500/40" />
                      </div>

                      <div className="flex-1">
                        {xai.text_attributions && xai.text_attributions.length > 0 ? (() => {
                          const maxW = Math.max(...xai.text_attributions.map(a => Math.abs(a.weight)), 0.001);
                          const hasNeg = xai.text_attributions.some(a => a.weight < 0);
                          return (
                            <div className="mb-8">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                  SHAP Token Attribution
                                </p>
                                <div className="flex gap-3 text-[9px] font-bold uppercase">
                                  <span className="flex items-center gap-1 text-red-400">
                                    <span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />
                                    Disaster signal
                                  </span>
                                  {hasNeg && (
                                    <span className="flex items-center gap-1 text-blue-400">
                                      <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />
                                      Against Disaster
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                {xai.text_attributions.map((attr, idx) => {
                                  const pct = (Math.abs(attr.weight) / maxW) * 100;
                                  const isPos = attr.weight >= 0;
                                  return (
                                    <div key={idx} className="flex items-center gap-3">
                                      <span className="w-20 text-right text-xs font-bold text-white/80 shrink-0 truncate">
                                        {attr.token}
                                      </span>
                                      <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
                                        <div
                                          className={`h-full rounded transition-all duration-500 ${isPos ? 'bg-red-500' : 'bg-blue-500'}`}
                                          style={{ width: `${pct}%`, opacity: 0.85 }}
                                        />
                                      </div>
                                      <span className={`w-14 text-xs font-mono font-bold shrink-0 ${isPos ? 'text-red-400' : 'text-blue-400'}`}>
                                        {isPos ? '+' : ''}{attr.weight.toFixed(3)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-[9px] text-white/30 mt-3">
                                Red = pushes toward disaster · Blue = pushes against disaster · Length = relative importance
                              </p>
                            </div>
                          );
                        })() : xai.text_weights && xai.text_weights.length > 0 ? (
                          <div className="mb-8">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">
                              Keyword Signals
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {xai.text_weights.map((word, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs uppercase font-bold text-blue-300"
                                >
                                  {word}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mb-8 p-6 bg-black/40 rounded-[2rem] border border-white/5 flex items-center justify-center h-28">
                            <span className="text-xs font-black text-white/20 uppercase tracking-widest">
                              No Text Attributions Available
                            </span>
                          </div>
                        )}

                        {hasText && (
                          <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5 font-mono text-sm leading-relaxed relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500/40 animate-[scan_4s_linear_infinite]" />
                            <p className="text-blue-100/60 italic line-clamp-3">"{selected.text_snippet}"</p>
                          </div>
                        )}

                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-relaxed mt-6">
                          Transformer Weights • Token Risk Analysis • Sentiment Mapping
                        </p>
                      </div>
                    </div>

                    {/* Visual Saliency Card */}
                    {hasHeatmap && (
                      <div className="flex flex-col p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl hover:border-indigo-500/20 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(99,102,241,0.05)] transition-all duration-300">
                        <div className="flex items-center justify-between mb-8">
                          <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                            <ImageIcon size={24} className="text-indigo-400" /> Visual Saliency
                          </h2>
                          <Target size={20} className="text-indigo-500/40" />
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center">
                          {/* FIX: image URL — ideally backend sends image_url directly;
                              constructing it here as fallback only */}
                          <XAIVisualizer
                            originalImageSrc={selected.image_url || `${API_BASE}/uploads/${selected.image_ref}`}
                            heatmapMatrix={xai.visual_heatmap}
                            result={selected}
                          />

                          <div className="mt-4 flex flex-wrap items-center gap-2 justify-center">
                            {/* FIX 8: heatmap_status — case-insensitive check */}
                            <span className={`text-[10px] px-3 py-1 rounded-lg border font-black uppercase ${xai.heatmap_status?.toUpperCase().includes('AVAILABLE')
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                              }`}>
                              {xai.heatmap_status || 'UNKNOWN'}
                            </span>

                            {/* FIX 2: heatmap_method — case-insensitive via helper */}
                            {xai.heatmap_method && (
                              <span className="text-[10px] px-3 py-1 rounded-lg border font-black uppercase bg-blue-500/10 border-blue-500/20 text-blue-300">
                                {getHeatmapMethodLabel(xai.heatmap_method)}
                              </span>
                            )}

                            {/* FIX 5: dominant_modality — lowercase compare */}
                            {dominantModality && (
                              <span className={`text-[10px] px-3 py-1 rounded-lg border font-black uppercase ${dominantModality === 'image'
                                ? 'bg-red-500/10 border-red-500/20 text-red-300'
                                : 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                                }`}>
                                {dominantModality === 'image' ? '🖼 Image drove decision' : '📝 Text drove decision'}
                              </span>
                            )}
                          </div>

                          <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-relaxed mt-4 text-center">
                            Red regions = disaster evidence · Boxes = top decision zones
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Logic + Pipeline Audit Trail */}
                  <div className="grid md:grid-cols-2 gap-8">

                    {/* Logic Transparency Card */}
                    <div className="p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl hover:border-indigo-500/20 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(99,102,241,0.05)] transition-all duration-300">
                      <div className="mb-6">
                        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">
                          Logic Transparency
                        </h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">
                          Why was this verdict chosen?
                        </p>
                      </div>

                      {/* FIX 6: explanation split documented & guarded */}
                      <p className="text-lg italic text-white/80 mb-6 leading-relaxed">
                        "{explanationText}"
                      </p>

                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-sm uppercase ${getVerdictBg(selected)} ${getVerdictColor(selected)}`}>
                        <ShieldCheck size={16} />
                        {selected?.verdict || 'N/A'}
                      </div>

                      <div className="mt-6 space-y-3">
                        {xai.text_attributions && xai.text_attributions.length > 0 && (() => {
                          const top = [...xai.text_attributions].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)).slice(0, 3);
                          const forDisaster = top.filter(t => t.weight > 0);
                          const against = top.filter(t => t.weight < 0);
                          return (
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">
                                📝 Text Evidence
                              </p>
                              {forDisaster.length > 0 && (
                                <p className="text-xs text-white/70">
                                  <span className="text-red-400 font-bold">Disaster signals: </span>
                                  {forDisaster.map(t => `"${t.token}" (+${t.weight.toFixed(2)})`).join(', ')}
                                </p>
                              )}
                              {against.length > 0 && (
                                <p className="text-xs text-white/70 mt-1">
                                  <span className="text-blue-400 font-bold">Against: </span>
                                  {against.map(t => `"${t.token}" (${t.weight.toFixed(2)})`).join(', ')}
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {hasImage && (
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">
                              🖼 Image Evidence
                            </p>
                            <p className="text-xs text-white/70">
                              <span className="text-purple-400 font-bold">Semantic: </span>
                              {selected?.stage_1_image_analysis?.semantic_label || 'N/A'}
                              {' · '}
                              <span className="text-purple-400 font-bold">Forensic: </span>
                              {selected?.stage_1_image_analysis?.forensic_label || 'N/A'}
                            </p>
                          </div>
                        )}

                        {/* FIX 5: dominantModality already lowercased above */}
                        {dominantModality && (
                          <div className={`p-4 rounded-2xl border ${dominantModality === 'image'
                            ? 'bg-red-500/5 border-red-500/20'
                            : 'bg-purple-500/5 border-purple-500/20'
                            }`}>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1">
                              ⚡ Decision Driver
                            </p>
                            <p className="text-xs text-white/70">
                              The{' '}
                              <span className="font-bold text-white">{dominantModality}</span>{' '}
                              modality had stronger evidence and primarily drove this verdict.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex gap-4">
                        <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-center">
                          <p className="text-[9px] font-black text-blue-400 tracking-widest mb-1">CREDIBILITY</p>
                          {/* FIX 4: ?? 0 instead of || 0 — intent-clear nullish coalescing */}
                          <p className="text-lg font-mono font-black">
                            {((selected?.credibility_score ?? 0) * 100).toFixed(0)}%
                          </p>
                        </div>
                        {hasImage && (
                          <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-center">
                            <p className="text-[9px] font-black text-purple-400 tracking-widest mb-1">IMAGE AUTH</p>
                            <p className="text-lg font-mono font-black">
                              {((selected?.image_score ?? 0) * 100).toFixed(0)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pipeline Audit Trail Card */}
                    <div className="p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl hover:border-purple-500/20 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(168,85,247,0.05)] transition-all duration-300">
                      <div className="mb-8">
                        <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest">
                          Pipeline Audit Trail
                        </h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">
                          3-Stage Multimodal Detection Pipeline
                        </p>
                      </div>

                      <div className="space-y-4">

                        {/* Stage 1 */}
                        <div className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${hasText
                          ? 'bg-indigo-500/5 border-indigo-500/20'
                          : 'bg-white/[0.02] border-white/5 opacity-40'
                          }`}>
                          <div className={`p-2 rounded-lg ${hasText ? 'bg-indigo-500/20' : 'bg-white/10'}`}>
                            <FileText size={16} className={hasText ? 'text-indigo-400' : 'text-white/30'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                              Stage 1 — Text Analysis
                            </p>
                            <p className="text-sm font-bold text-white truncate">
                              {selected?.stage_2_text_analysis?.text_label || 'N/A'}
                            </p>
                          </div>
                          {hasText && (
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${['Non-Informative', 'OOD'].includes(selected?.stage_2_text_analysis?.text_label)
                              ? 'bg-red-500/10 border-red-500/20 text-red-300'
                              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                              }`}>
                              {['Non-Informative', 'OOD'].includes(selected?.stage_2_text_analysis?.text_label)
                                ? 'Flagged' : 'Passed'}
                            </span>
                          )}
                        </div>

                        {/* Stage 2 */}
                        <div className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${hasImage
                          ? 'bg-blue-500/5 border-blue-500/20'
                          : 'bg-white/[0.02] border-white/5 opacity-40'
                          }`}>
                          <div className={`p-2 rounded-lg ${hasImage ? 'bg-blue-500/20' : 'bg-white/10'}`}>
                            <ImageIcon size={16} className={hasImage ? 'text-blue-400' : 'text-white/30'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                              Stage 2 — Image Analysis
                            </p>
                            <p className="text-sm font-bold text-white truncate">
                              {selected?.stage_1_image_analysis?.combined_image_label || 'N/A'}
                            </p>
                          </div>
                          {hasImage && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded border bg-blue-500/10 border-blue-500/20 text-blue-300">
                              {selected?.stage_1_image_analysis?.semantic_label || 'N/A'}
                            </span>
                          )}
                        </div>

                        <div className="flex justify-center py-1">
                          <ArrowRight size={14} className="text-white/10 rotate-90" />
                        </div>

                        {/* Stage 3 */}
                        <div className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${hasText && hasImage
                          ? 'bg-purple-500/5 border-purple-500/20'
                          : 'bg-white/[0.02] border-white/5 opacity-40'
                          }`}>
                          <div className={`p-2 rounded-lg ${hasText && hasImage ? 'bg-purple-500/20' : 'bg-white/10'}`}>
                            <Zap size={16} className={hasText && hasImage ? 'text-purple-400' : 'text-white/30'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">
                              Stage 3 — Multimodal Fusion
                            </p>
                            <p className="text-sm font-bold text-white truncate">
                              {(hasText && hasImage)
                                ? selected?.stage_3_multimodal_fusion?.multimodal_label || 'N/A'
                                : 'N/A — Single Modality'}
                            </p>
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${hasText && hasImage
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                            : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                            }`}>
                            {hasText && hasImage ? 'Final Verdict' : 'Single Mode'}
                          </span>
                        </div>

                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}
      </div>
    </div>
  );
};

export default XAIInsights;