import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
import numpy as np
from PIL import Image
import albumentations as A
from albumentations.pytorch import ToTensorV2
import re
from datetime import datetime
from serpapi import GoogleSearch
from transformers import pipeline
import traceback

# Import the existing text model loader
from model_service import ModelLoader
from xai_service import XAIEngine

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

class DisasterDetector(nn.Module):
    def __init__(self, num_classes, dropout=0.4):
        super().__init__()
        self.backbone = timm.create_model(
            'efficientnet_b3', pretrained=False,
            num_classes=0, global_pool='avg'
        )
        feature_dim = self.backbone.num_features
        self.classifier = nn.Sequential(
            nn.BatchNorm1d(feature_dim),
            nn.Dropout(dropout),
            nn.Linear(feature_dim, 512),
            nn.SiLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(dropout / 2),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        return self.classifier(self.backbone(x))

class MultimodalService:
    def __init__(self):
        print(f"Loading Multimodal Models on {device}...")
        self.semantic_classes = ['Real Crisis / Disaster', 'Normal / Non-Crisis']
        self.forensic_classes = ['Authentic', 'Tampered']
        
        # Load text model
        self.text_model_service = ModelLoader()
        
        # Load CLIP for zero-shot image classification
        try:
            print("Loading CLIP zero-shot model (allow download if missing)...")
            self.clip = pipeline("zero-shot-image-classification", model="openai/clip-vit-base-patch32", device=0 if torch.cuda.is_available() else -1)
        except Exception as e:
            print(f"Failed to load CLIP: {e}")
            self.clip = None

        base_dir = os.path.dirname(os.path.abspath(__file__))
        semantic_model_path = os.path.join(base_dir, 'models', 'disaster_pro_model_BEST.pt')
        forensic_model_path = os.path.join(base_dir, 'models', 'forensic_v2_model_BEST.pt')

        try:
            # Semantic Model
            self.semantic_model = DisasterDetector(num_classes=2).to(device)
            self.semantic_model.load_state_dict(torch.load(semantic_model_path, map_location=device, weights_only=False)['model_state_dict'])
            self.semantic_model.eval()
            
            # Forensic Model
            self.forensic_model = DisasterDetector(num_classes=2, dropout=0.5).to(device)
            self.forensic_model.load_state_dict(torch.load(forensic_model_path, map_location=device, weights_only=False)['model_state_dict'])
            self.forensic_model.eval()
            print("Successfully loaded Semantic and Forensic PyTorch models.")
        except Exception as e:
            print(f"Failed to load PyTorch models: {e}")
            self.semantic_model = None
            self.forensic_model = None

        # ── SHAP background tensor (optional — enables SHAP over Grad-CAM) ──
        # Generate assets/shap_background.pt locally once and commit it.
        # If the file is missing, SHAP is skipped and Grad-CAM is used instead.
        background_tensor = None
        bg_path = os.path.join(base_dir, 'assets', 'shap_background.pt')
        if os.path.exists(bg_path):
            try:
                background_tensor = torch.load(bg_path, map_location='cpu')
                print(f"[XAI] Loaded SHAP background tensor: {background_tensor.shape}")
            except Exception as e:
                print(f"[XAI] Could not load SHAP background: {e}")

        # Instantiate XAI Engine — now passes tokenizer + background_tensor
        self.xai_engine = XAIEngine(
            text_model        = self.text_model_service.model     if self.text_model_service else None,
            image_model       = self.semantic_model,
            tokenizer         = self.text_model_service.tokenizer if self.text_model_service else None,
            background_tensor = background_tensor
        )

        self.preprocess = A.Compose([
            A.Resize(300, 300),
            A.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225]),
            ToTensorV2()
        ])
        
        self.serpapi_key = os.environ.get('SERPAPI_KEY') or "1906a92a843a10c1324d6dcb8e6ae3972d4291a0a3143f3ce3375ffecdba6094"

    def _generate_clip_heatmap(self, image_path, num_patches=7):
        """
        Generate a pseudo-heatmap by scoring image patches with CLIP for disaster content.
        Used as a fallback when the PyTorch Grad-CAM model is unavailable.
        """
        if self.clip is None:
            return None
        try:
            img = Image.open(image_path).convert('RGB')
            w, h = img.size
            patch_w = max(w // num_patches, 1)
            patch_h = max(h // num_patches, 1)
            scores = np.zeros((num_patches, num_patches), dtype=np.float32)
            disaster_label = 'a photo showing disaster, flood, fire, earthquake or crisis event'
            normal_label = 'a normal everyday photo with no emergency'
            for i in range(num_patches):
                for j in range(num_patches):
                    left  = max(0, j * patch_w - patch_w // 2)
                    upper = max(0, i * patch_h - patch_h // 2)
                    right = min(w, left + patch_w * 2)
                    lower = min(h, upper + patch_h * 2)
                    patch = img.crop((left, upper, right, lower))
                    result = self.clip(patch, candidate_labels=[disaster_label, normal_label])
                    score = next((r['score'] for r in result if r['label'] == disaster_label), 0.0)
                    scores[i, j] = score
            s_min, s_max = scores.min(), scores.max()
            if s_max > s_min:
                scores = (scores - s_min) / (s_max - s_min)
            heatmap_tensor   = torch.from_numpy(scores).unsqueeze(0).unsqueeze(0)
            heatmap_resized  = F.interpolate(heatmap_tensor, size=(224, 224), mode='bilinear', align_corners=False)
            return heatmap_resized.squeeze().numpy()
        except Exception as e:
            print(f"CLIP patch heatmap generation failed: {e}")
            return None

    def preprocess_image(self, image_path):
        img = np.array(Image.open(image_path).convert('RGB'))
        return self.preprocess(image=img)['image'].unsqueeze(0).to(device)

    def reverse_image_search(self, image_path):
        results = {'first_seen': None, 'sources': [], 'age_years': None, 'warning': None}
        if not self.serpapi_key: return results
        try:
            params = {'api_key': self.serpapi_key, 'engine': 'google_reverse_image', 'image_path': image_path}
            search = GoogleSearch(params)
            results_raw = search.get_dict()
            current_year = datetime.now().year
            earliest_year = current_year
            sources = []
            if 'image_results' in results_raw:
                for item in results_raw['image_results'][:5]:
                    source, date = item.get('source', ''), item.get('date', '')
                    if source: sources.append(source)
                    if date:
                        year_match = re.findall(r'\b(19|20)\d{2}\b', date)
                        if year_match:
                            found_year = int(year_match[0])
                            if found_year < earliest_year: earliest_year = found_year
            if 'knowledge_graph' in results_raw:
                kg = results_raw['knowledge_graph']
                if 'description' in kg:
                    year_match = re.findall(r'\b(19|20)\d{2}\b', kg['description'])
                    if year_match:
                        found_year = int(year_match[0])
                        if found_year < earliest_year: earliest_year = found_year
            age = current_year - earliest_year
            results['sources']    = sources[:3]
            results['age_years']  = age
            results['first_seen'] = earliest_year if earliest_year < current_year else None
            if age > 2: results['warning'] = f'Image first seen around {earliest_year} — {age} years old'
        except Exception as e:
            results['warning'] = f'Reverse search failed: {str(e)}'
        return results

    def temporal_check(self, image_path, caption):
        warnings = []
        if caption:
            years = re.findall(r'\b(19|20)\d{2}\b', caption)
            if years:
                cap_year = int(years[0])
                gap = datetime.now().year - cap_year
                if gap > 2: warnings.append(f'Caption mentions {cap_year} — {gap} years old')
        if image_path:
            search_res = self.reverse_image_search(image_path)
            if search_res['warning']: warnings.append(search_res['warning'])
        return warnings

    def analyze(self, image_path=None, caption=""):
        try:
            # --- MODALITY DETECTION ---
            has_image = image_path is not None and os.path.exists(image_path)
            has_text  = caption is not None and isinstance(caption, str) and len(caption.strip()) > 0

            # --- STAGE 2: INDEPENDENT IMAGE ANALYSIS ---
            image_analysis = {
                "semantic_label":    "N/A",
                "forensic_label":    "N/A",
                "combined_image_label": "N/A"
            }
            img_is_disaster    = False
            forensic_uncertain = False
            image_specific_label = None
            flags = []
            sem_conf_val = 0.5
            for_conf_val = 0.5

            if has_image:
                img_tensor = self.preprocess_image(image_path)
                
                if self.semantic_model is not None:
                    with torch.no_grad():
                        sem_probs = torch.softmax(self.semantic_model(img_tensor), dim=1)[0]
                    sem_pred     = sem_probs.argmax().item()
                    sem_conf_val = sem_probs[sem_pred].item()
                elif self.clip is not None:
                    try:
                        disaster_label = 'a photo showing disaster, flood, fire, earthquake or crisis event'
                        normal_label   = 'a normal everyday photo with no emergency'
                        clip_res = self.clip(Image.open(image_path).convert('RGB'), candidate_labels=[disaster_label, normal_label])
                        top = clip_res[0]
                        print(f"CLIP semantic result: {top['label'][:40]} — score={top['score']:.2f}")
                        sem_pred     = 0 if (top['label'] == disaster_label and top['score'] > 0.45) else 1
                        sem_conf_val = top['score']
                    except Exception as e:
                        print(f"CLIP fallback failed: {e}")
                        sem_pred = 1
                else:
                    sem_pred = 1

                image_analysis["semantic_label"] = self.semantic_classes[sem_pred]
                img_is_disaster = (sem_pred == 0)

                if img_is_disaster:
                    if self.forensic_model is not None:
                        with torch.no_grad():
                            for_probs = torch.softmax(self.forensic_model(img_tensor), dim=1)[0]
                        for_conf, for_pred = for_probs.max(0)
                        for_conf_val = for_conf.item()
                        image_analysis["forensic_label"] = self.forensic_classes[for_pred.item()]
                        forensic_uncertain = for_conf_val < 0.55
                    else:
                        image_analysis["forensic_label"] = "Authentic"
                        forensic_uncertain = False
                        for_conf_val = 0.5
                    
                    for_text = "Manipulated Image" if image_analysis["forensic_label"] == "Tampered" else "Authentic"
                    image_analysis["combined_image_label"] = f"Real Crisis / Disaster — {for_text}"
                    
                    if self.clip:
                        try:
                            candidate_labels = ['earthquake', 'flood', 'tsunami', 'hurricane', 'tornado', 'landslide', 'wildfire', 'storm', 'explosion', 'accident', 'building collapse']
                            clip_res = self.clip(Image.open(image_path).convert('RGB'), candidate_labels=candidate_labels)
                            image_specific_label = clip_res[0]['label']
                        except: pass
                else:
                    image_analysis["combined_image_label"] = "Normal / Non-Crisis"

            # --- STAGE 1: INDEPENDENT TEXT ANALYSIS ---
            text_analysis  = {"text_label": "N/A"}
            is_unverified_rumor = False
            text_result = {}
            if has_text:
                text_result = self.text_model_service.predict(caption)
                text_analysis["text_label"] = text_result["label"]
                is_unverified_rumor = (text_result.get("label") == "Unverified Rumor")

            # --- FINAL VERDICT LOGIC ---
            multimodal_label = "UNCERTAIN"
            reasoning = "Analysis was inconclusive based on the available signals."
            fusion_score = None
            
            if not has_image and not has_text:
                multimodal_label = "NO DATA"
                reasoning = "Please provide image or text input."
            elif has_image and not has_text:
                multimodal_label = image_analysis["combined_image_label"]
                reasoning = "Image-only audit completed. Results reflect visual signals only."
            elif has_text and not has_image:
                multimodal_label = text_analysis["text_label"]
                reasoning = "Text-only audit completed. Results reflect linguistic integrity only."
            else:
                temporal_warnings  = self.temporal_check(image_path, caption)
                has_temporal_issue = len(temporal_warnings) > 0
                
                cross_modal_mismatch = False
                if image_specific_label and caption and text_analysis["text_label"] == "Informative":
                    if image_specific_label.lower() not in caption.lower():
                        cross_modal_mismatch = True

                # img_text_mismatch covers ALL ways a content mismatch surfaces:
                # (a) cross_modal_mismatch — CLIP's specific label disagrees with the caption
                # (b) non-crisis image paired with informative disaster text
                # (c) [FIX] disaster image paired with non-informative/unrelated caption
                img_text_mismatch = (
                    cross_modal_mismatch
                    or (not img_is_disaster and text_analysis["text_label"] == "Informative")
                    or (img_is_disaster and text_analysis["text_label"] not in ("Informative", "N/A"))
                )

                flags = []
                if image_analysis["forensic_label"] == "Tampered":    flags.append("Manipulated Image")
                if has_temporal_issue:                                 flags.append("Old Content")
                if img_text_mismatch:                                  flags.append("Mismatch")
                if is_unverified_rumor:                                flags.append("Unverified Rumor")
                if forensic_uncertain:                                 flags.append("Forensic Uncertain")  # FIX

                if len(flags) >= 2:
                    multimodal_label = "HIGH RISK — Multiple Flags Detected"
                    reasoning = f"Multiple red flags detected: {', '.join(flags)}."
                elif has_temporal_issue:
                    multimodal_label = "MISINFORMATION — Old Content Recirculated as New"
                    reasoning = f"Temporal discrepancy detected: {temporal_warnings[0]}."
                elif image_analysis["forensic_label"] == "Tampered" and img_is_disaster:
                    multimodal_label = "MISINFORMATION — Manipulated Image"
                    reasoning = "Forensic analysis detected digital alterations in the crisis image."
                elif (is_unverified_rumor or text_analysis["text_label"] == "Unverified Rumor") and (img_is_disaster or text_analysis["text_label"] != "OOD"):
                    multimodal_label = "MISINFORMATION — Unverified Rumor"
                    reasoning = "Text contains specific crisis information but uses speculative or unverified language."
                elif cross_modal_mismatch:
                    multimodal_label = "SUSPICIOUS — Image and Text Mismatch"
                    reasoning = f"Visual content depicts {image_specific_label} but text describes a different context."
                elif img_is_disaster and text_analysis["text_label"] != "Informative":
                    multimodal_label = "SUSPICIOUS — Disaster Image with Unrelated Caption"
                    reasoning = "The image shows a real disaster, but the caption is unrelated or non-informative."
                elif img_is_disaster and forensic_uncertain:
                    multimodal_label = "UNCERTAIN — Manipulation Status Unclear"
                    reasoning = "Crisis detected, but forensic analysis is inconclusive regarding authenticity."
                elif not img_is_disaster and text_analysis["text_label"] != "Informative":
                    multimodal_label = "NOT RELEVANT"
                    reasoning = "Both image and text are classified as non-crisis content."
                elif not img_is_disaster and text_analysis["text_label"] == "Informative":
                    multimodal_label = "SUSPICIOUS — Image and Text Mismatch"
                    reasoning = "Visual content is non-crisis, but the text describes a disaster event, indicating a potential mismatch."
                elif img_is_disaster and image_analysis["forensic_label"] == "Authentic" and text_analysis["text_label"] == "Informative":
                    multimodal_label = "CREDIBLE — Real Disaster, Authentic"
                    reasoning = "Consistent, authentic evidence from both visual and textual modalities."

                fusion_score = round(max(0.0, 1.0 - 0.25 * len(flags)), 3)

            # --- SCORES from real model confidences ---
            if has_image:
                if img_is_disaster:
                    image_score = for_conf_val if image_analysis.get("forensic_label") == "Authentic" else round(1.0 - for_conf_val, 3)
                else:
                    image_score = round(1.0 - sem_conf_val, 3)
            else:
                image_score = 0.0

            text_conf = text_result.get("confidence", 0.5) if has_text else None
            if has_image and has_text:
                img_contrib  = for_conf_val if img_is_disaster else sem_conf_val
                credibility_score = round((img_contrib + (text_conf or 0.5)) / 2.0, 3)
            elif has_image:
                credibility_score = round(for_conf_val if img_is_disaster else sem_conf_val, 3)
            elif has_text:
                credibility_score = round(text_conf or 0.5, 3)
            else:
                credibility_score = 0.5

            if any(tag in multimodal_label for tag in ("MISINFORMATION", "HIGH RISK", "SUSPICIOUS")):
                credibility_score = round(1.0 - credibility_score, 3)

            model_keywords     = text_result.get("xai", {}).get("text_weights", []) if has_text else []
            flags_global       = []
            if has_image and image_analysis.get("forensic_label") in ("Tampered", "Manipulated"):
                flags_global.append("Manipulated Image")
            if has_text and text_result.get("is_disaster"):
                flags_global.append("Crisis Mention")
            combined_text_weights = list(dict.fromkeys(flags_global + model_keywords))[:6]

            explanation_text = reasoning
            audit_path_text  = f"[Image: {image_analysis['combined_image_label']}] → [Text: {text_analysis['text_label']}] → [Final: {multimodal_label}]"

            # ── XAI ENGINE ────────────────────────────────────────────────────
            xai_payload = {
                "text_attributions": [],
                "visual_heatmap":    None,
                "heatmap_status":    "UNAVAILABLE",
                "heatmap_method":    None,
                "dominant_modality": None,
            }

            if has_text:
                if self.text_model_service and self.text_model_service.tokenizer:
                    token_weights = self.xai_engine.extract_text_attributions(
                        caption,
                        self.text_model_service.tokenizer
                    )
                    xai_payload["text_attributions"] = token_weights
                else:
                    fallback_keywords = getattr(self.text_model_service, 'disaster_keywords', []) + \
                                        getattr(self.text_model_service, 'uncertain_words', [])
                    words = caption.lower().split()
                    keyword_attrs = []
                    for word in words:
                        clean = re.sub(r'[^a-z]', '', word)
                        if clean in [k.lower() for k in fallback_keywords]:
                            keyword_attrs.append({"token": clean, "weight": 0.85})
                        elif len(clean) > 4:
                            keyword_attrs.append({"token": clean, "weight": 0.3})
                    xai_payload["text_attributions"] = keyword_attrs[:10]

            if has_image:
                if img_is_disaster and self.semantic_model:
                    target_layer = self.semantic_model.backbone.conv_head
                    heatmap_matrix, status, method = self.xai_engine.get_visual_explanation(
                        img_tensor, target_layer
                    )
                    if heatmap_matrix is not None:
                        xai_payload["visual_heatmap"] = heatmap_matrix.tolist()
                        xai_payload["heatmap_status"] = status
                        xai_payload["heatmap_method"] = method
                    else:
                        xai_payload["heatmap_status"] = status
                elif self.clip is not None:
                    try:
                        heatmap_matrix = self._generate_clip_heatmap(image_path)
                        if heatmap_matrix is not None:
                            xai_payload["visual_heatmap"] = heatmap_matrix.tolist()
                            xai_payload["heatmap_status"] = "AVAILABLE"
                            xai_payload["heatmap_method"] = "clip"
                        else:
                            xai_payload["heatmap_status"] = "CLIP HEATMAP FAILED"
                    except Exception as e:
                        xai_payload["heatmap_status"] = f"CLIP HEATMAP FAILED: {str(e)}"

            img_score_xai  = float(np.mean(np.abs(xai_payload["visual_heatmap"])))  \
                             if xai_payload["visual_heatmap"] else 0.0
            txt_score_xai  = float(np.mean([abs(t["weight"]) for t in xai_payload["text_attributions"]])) \
                             if xai_payload["text_attributions"] else 0.0
            if img_score_xai > 0 or txt_score_xai > 0:
                xai_payload["dominant_modality"] = "image" if img_score_xai >= txt_score_xai else "text"

            return {
                "active_modalities": {"image": has_image, "text": has_text},
                "stage_1_image_analysis": image_analysis,
                "stage_2_text_analysis":  text_analysis,
                "stage_3_multimodal_fusion": {
                    "multimodal_label": multimodal_label,
                    "reasoning":        reasoning,
                    "fusion_score":     fusion_score
                },
                "verdict":           multimodal_label,
                "credibility_score": credibility_score,
                "image_score":       image_score,
                "fusion_score":      fusion_score,
                "xai_insights": {
                    "explanation":       explanation_text,
                    "audit_path":        audit_path_text,
                    "text_weights":      combined_text_weights,
                    "text_attributions": xai_payload["text_attributions"],
                    "visual_heatmap":    xai_payload["visual_heatmap"],
                    "heatmap_status":    xai_payload["heatmap_status"],
                    "heatmap_method":    xai_payload["heatmap_method"],
                    "dominant_modality": xai_payload["dominant_modality"],
                }
            }
        except Exception as e:
            traceback.print_exc()
            return {"error": str(e)}