import os
import torch
import torch.nn as nn
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
            print("Loading CLIP zero-shot model...")
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

        self.preprocess = A.Compose([
            A.Resize(300, 300),
            A.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225]),
            ToTensorV2()
        ])
        
        self.serpapi_key = os.environ.get('SERPAPI_KEY') or "1906a92a843a10c1324d6dcb8e6ae3972d4291a0a3143f3ce3375ffecdba6094"

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
            results['sources'] = sources[:3]
            results['age_years'] = age
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
            has_text = caption is not None and isinstance(caption, str) and len(caption.strip()) > 0

            # --- STAGE 1: INDEPENDENT IMAGE ANALYSIS ---
            image_analysis = {
                "semantic_label": "N/A",
                "forensic_label": "N/A",
                "combined_image_label": "N/A"
            }
            img_is_disaster = False
            forensic_uncertain = False
            image_specific_label = None
            flags = [] # Initialize flags here

            if has_image:
                img_tensor = self.preprocess_image(image_path)
                with torch.no_grad():
                    sem_probs = torch.softmax(self.semantic_model(img_tensor), dim=1)[0]
                sem_pred = sem_probs.argmax().item()
                image_analysis["semantic_label"] = self.semantic_classes[sem_pred]
                img_is_disaster = (sem_pred == 0) # Real Crisis / Disaster

                if img_is_disaster:
                    with torch.no_grad():
                        for_probs = torch.softmax(self.forensic_model(img_tensor), dim=1)[0]
                    for_conf, for_pred = for_probs.max(0)
                    image_analysis["forensic_label"] = self.forensic_classes[for_pred.item()]
                    forensic_uncertain = for_conf.item() < 0.70
                    
                    # Combined Label Logic
                    for_text = "Manipulated Image" if image_analysis["forensic_label"] == "Tampered" else "Authentic"
                    image_analysis["combined_image_label"] = f"Real Crisis / Disaster — {for_text}"
                    
                    # CLIP for Mismatch Detection
                    if self.clip:
                        try:
                            candidate_labels = ['earthquake', 'flood', 'tsunami', 'hurricane', 'tornado', 'landslide', 'wildfire', 'storm', 'explosion', 'accident', 'building collapse']
                            clip_res = self.clip(Image.open(image_path).convert('RGB'), candidate_labels=candidate_labels)
                            image_specific_label = clip_res[0]['label']
                        except: pass

            # --- STAGE 2: INDEPENDENT TEXT ANALYSIS ---
            text_analysis = {"text_label": "N/A"}
            is_unverified_rumor = False
            if has_text:
                text_result = self.text_model_service.predict(caption)
                text_analysis["text_label"] = text_result["label"]
                is_unverified_rumor = (text_result.get("label") == "Unverified Rumor")

            # --- FINAL VERDICT LOGIC (SINGLE vs MULTI) ---
            multimodal_label = "UNCERTAIN"
            reasoning = "Analysis was inconclusive based on the available signals."
            
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
                # Full Multimodal Fusion
                temporal_warnings = self.temporal_check(image_path, caption)
                has_temporal_issue = len(temporal_warnings) > 0
                
                # Cross-modal check
                cross_modal_mismatch = False
                if image_specific_label and caption and text_analysis["text_label"] == "Informative":
                    if image_specific_label.lower() not in caption.lower():
                        cross_modal_mismatch = True

                flags = []
                if image_analysis["forensic_label"] == "Tampered": flags.append("Manipulated Image")
                if has_temporal_issue: flags.append("Old Content")
                if cross_modal_mismatch: flags.append("Mismatch")
                if is_unverified_rumor: flags.append("Unverified Rumor")

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
            
            return {
                "active_modalities": {"image": has_image, "text": has_text},
                "stage_1_image_analysis": image_analysis,
                "stage_2_text_analysis": text_analysis,
                "stage_3_multimodal_fusion": {
                    "multimodal_label": multimodal_label,
                    "reasoning": reasoning
                },
                "verdict": multimodal_label,
                "credibility_score": 0.9 if "CREDIBLE" in multimodal_label else (0.1 if "MISINFORMATION" in multimodal_label else 0.5),
                "image_score": 0.9 if img_is_disaster else 0.1,
                "xai_insights": {
                    "explanation": f"Audit Path: [Image: {image_analysis['combined_image_label']}] -> [Text: {text_analysis['text_label']}] -> [Final: {multimodal_label}]",
                    "text_weights": flags if flags else ([text_analysis["text_label"]] if has_text else ["IMAGE-ONLY"]),
                    "heatmap_status": "Rendered" if has_image else "N/A"
                }
            }
        except Exception as e:
            traceback.print_exc()
            return {"error": str(e)}
