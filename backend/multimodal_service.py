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
        self.semantic_classes = []
        self.forensic_classes = []
        
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
            sem_ckpt = torch.load(semantic_model_path, map_location=device)
            self.semantic_model = DisasterDetector(num_classes=2).to(device)
            self.semantic_model.load_state_dict(sem_ckpt['model_state_dict'])
            self.semantic_model.eval()
            self.semantic_classes = sem_ckpt['class_names']
            
            # Forensic Model
            for_ckpt = torch.load(forensic_model_path, map_location=device)
            self.forensic_model = DisasterDetector(num_classes=2, dropout=0.5).to(device)
            self.forensic_model.load_state_dict(for_ckpt['model_state_dict'])
            self.forensic_model.eval()
            self.forensic_classes = for_ckpt['class_names']
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
        
        self.serpapi_key = os.environ.get('SERPAPI_KEY')

    def preprocess_image(self, image_path):
        img = np.array(Image.open(image_path).convert('RGB'))
        return self.preprocess(image=img)['image'].unsqueeze(0).to(device)

    def reverse_image_search(self, image_path):
        results = {
            'first_seen' : None,
            'sources'    : [],
            'age_years'  : None,
            'warning'    : None
        }

        if not self.serpapi_key:
            results['warning'] = 'SerpAPI key not configured.'
            return results

        try:
            params = {
                'api_key'    : self.serpapi_key,
                'engine'     : 'google_reverse_image',
                'image_path' : image_path,
            }

            search = GoogleSearch(params)
            results_raw = search.get_dict()

            current_year  = datetime.now().year
            earliest_year = current_year
            sources       = []

            if 'image_results' in results_raw:
                for item in results_raw['image_results'][:5]:
                    source = item.get('source', '')
                    date   = item.get('date', '')

                    if source:
                        sources.append(source)

                    if date:
                        year_match = re.findall(r'\b(19|20)\d{2}\b', date)
                        if year_match:
                            found_year = int(year_match[0])
                            if found_year < earliest_year:
                                earliest_year = found_year

            if 'knowledge_graph' in results_raw:
                kg = results_raw['knowledge_graph']
                if 'description' in kg:
                    year_match = re.findall(r'\b(19|20)\d{2}\b', kg['description'])
                    if year_match:
                        found_year = int(year_match[0])
                        if found_year < earliest_year:
                            earliest_year = found_year

            age = current_year - earliest_year
            results['sources']    = sources[:3]
            results['age_years']  = age
            results['first_seen'] = earliest_year if earliest_year < current_year else None

            if age > 2:
                results['warning'] = f'Image first seen around {earliest_year} — {age} years old'

        except Exception as e:
            results['warning'] = f'Reverse search failed: {str(e)}'

        return results

    def temporal_check(self, image_path, caption):
        warnings = []
        if caption:
            years_in_caption = re.findall(r'\b(19|20)\d{2}\b', caption)
            if years_in_caption:
                caption_year = int(years_in_caption[0])
                gap = datetime.now().year - caption_year
                if gap > 2:
                    warnings.append(f'Caption mentions {caption_year} — {gap} years old')

        # Limit reverse search to only when needed to save API calls
        if image_path:
            search_result = self.reverse_image_search(image_path)
            if search_result['warning']:
                warnings.append(search_result['warning'])

        return warnings

    def analyze(self, image_path=None, caption=""):
        try:
            # 1. Text Analysis
            text_result = None
            txt_is_informative = False
            txt_informative_conf = 0.0
            
            if caption:
                text_result = self.text_model_service.predict(caption)
                if text_result:
                    txt_is_informative = text_result['label'] == 'Informative'
                    txt_informative_conf = text_result['confidence']
            
            if not image_path:
                # Text Only
                if not text_result:
                    return {"verdict": "OOD", "credibility_score": 0.0, "xai_insights": {"explanation": "No content provided."}}
                return {
                    "verdict": text_result['label'],
                    "credibility_score": text_result['confidence'] if text_result['label'] != 'OOD' else 0.0,
                    "xai_insights": {
                        "explanation": text_result['xai']['explanation'],
                        "text_weights": text_result['xai']['text_weights'],
                        "heatmap_status": "N/A"
                    }
                }

            # 2. Image Analysis
            if not self.semantic_model or not self.forensic_model:
                raise Exception("Image models failed to load properly.")

            img_tensor = self.preprocess_image(image_path)
            
            with torch.no_grad():
                sem_probs = torch.softmax(self.semantic_model(img_tensor), dim=1)[0]
            img_disaster_conf = sem_probs[0].item()  # Assuming 0 is Disaster based on notebook
            # Get max pred
            sem_conf, sem_pred = sem_probs.max(0)
            sem_label = self.semantic_classes[sem_pred.item()] if self.semantic_classes else ('Disaster' if sem_pred.item()==0 else 'Not Disaster')
            img_is_disaster = img_disaster_conf > 0.55

            # 3. Forensic Analysis
            forensic_label = None
            for_conf = 0.0
            if img_is_disaster:
                with torch.no_grad():
                    for_probs = torch.softmax(self.forensic_model(img_tensor), dim=1)[0]
                for_conf_t, for_pred_t = for_probs.max(0)
                for_conf = for_conf_t.item()
                for_pred = for_pred_t.item()
                forensic_label = self.forensic_classes[for_pred] if self.forensic_classes else ('Authentic' if for_pred==0 else 'Tampered')
            
            # 3.5 Cross-Modal Verification (CLIP)
            image_specific_label = None
            cross_modal_mismatch = False
            text_disaster_types = []
            
            if self.clip and img_is_disaster:
                try:
                    candidate_labels = [
                        'earthquake', 'flood', 'tsunami', 'hurricane', 'tornado', 
                        'landslide', 'wildfire', 'storm', 'explosion', 'accident', 'building collapse'
                    ]
                    clip_res = self.clip(Image.open(image_path).convert('RGB'), candidate_labels=candidate_labels)
                    image_specific_label = clip_res[0]['label']
                    img_clip_conf = clip_res[0]['score']
                    
                    if caption and txt_is_informative:
                        text_lower = caption.lower()
                        synonyms = {
                            'wildfire': ['wildfire', 'fire', 'burn', 'blaze'],
                            'flood': ['flood', 'water', 'submerged', 'drowning', 'rain'],
                            'earthquake': ['earthquake', 'quake', 'shaking', 'tremor'],
                            'explosion': ['explosion', 'blast', 'bomb'],
                            'hurricane': ['hurricane', 'cyclone', 'typhoon'],
                            'storm': ['storm', 'wind'],
                            'building collapse': ['collapse', 'destroyed', 'debris', 'rubble'],
                            'accident': ['accident', 'crash', 'collision'],
                            'tsunami': ['tsunami', 'wave'],
                            'landslide': ['landslide', 'mudslide', 'avalanche']
                        }
                        
                        for k, v_list in synonyms.items():
                            if any(v in text_lower for v in v_list):
                                text_disaster_types.append(k)
                        
                        # Mismatch logic: Text explicitly states a disaster, but CLIP says the image is a DIFFERENT disaster
                        if len(text_disaster_types) > 0 and image_specific_label not in text_disaster_types:
                            # Only flag if CLIP is confident
                            if img_clip_conf > 0.15: 
                                cross_modal_mismatch = True
                except Exception as e:
                    print(f"CLIP verification failed: {e}")

            # 4. Temporal Check
            temporal_warnings = self.temporal_check(image_path, caption)
            has_temporal_issue = len(temporal_warnings) > 0

            # 5. Fusion Verdict
            verdict = ""
            explanation = ""
            
            if caption:
                conflict = img_is_disaster != txt_is_informative
                if not img_is_disaster and not txt_is_informative:
                    verdict = 'Non-Informative'
                    explanation = 'Neither image nor text indicate a disaster.'
                elif has_temporal_issue:
                    verdict = 'Non-Informative'
                    explanation = 'MISINFORMATION — Old content recirculated as new. ' + " ".join(temporal_warnings)
                elif forensic_label == 'Tampered':
                    verdict = 'Non-Informative'
                    explanation = 'MISINFORMATION — Manipulated Image Detected.'
                elif cross_modal_mismatch:
                    verdict = 'Non-Informative'
                    expected_types = "/".join([t.capitalize() for t in text_disaster_types])
                    detected_type = image_specific_label.capitalize() if image_specific_label else "Other"
                    explanation = f'SUSPICIOUS — Mismatch! Text mentions [{expected_types}] but Image depicts [{detected_type}].'
                elif conflict:
                    verdict = 'Non-Informative'
                    explanation = 'SUSPICIOUS — Image and Text Mismatch.'
                elif forensic_label == 'Tampered':
                    verdict = 'Non-Informative'
                    explanation = 'MISINFORMATION — Manipulated Image Detected.'
                elif img_is_disaster and txt_is_informative:
                    verdict = 'Informative'
                    explanation = 'CREDIBLE — Real Disaster, Authentic Image and Text.'
                else:
                    verdict = 'Non-Informative'
                    explanation = 'UNCERTAIN — Results are inconclusive.'
            else:
                # Image Only
                if not img_is_disaster:
                    verdict = 'OOD'
                    explanation = 'Image does not depict a disaster.'
                elif forensic_label == 'Tampered':
                    verdict = 'Non-Informative'
                    explanation = 'MISINFORMATION — Manipulated Image Detected.'
                elif has_temporal_issue:
                    verdict = 'Non-Informative'
                    explanation = 'MISINFORMATION — Old content recirculated as new. ' + " ".join(temporal_warnings)
                else:
                    verdict = 'Informative'
                    explanation = 'CREDIBLE — Real Disaster, Authentic Image.'

            # Compile scores
            text_score = txt_informative_conf if caption else 0.0
            image_score = img_disaster_conf
            
            # Penalize credibility if manipulated or old
            credibility_score = 0.0
            if verdict == 'Informative':
                credibility_score = (text_score + image_score) / 2 if caption else image_score
            elif verdict == 'Non-Informative':
                # Map to something low but > 0.0 (OOD)
                credibility_score = max(0.1, min(0.4, (text_score + image_score) / 2 if caption else image_score))
                if forensic_label == 'Tampered':
                    image_score = 1.0 - for_conf # Fake means low visual authenticity
                if cross_modal_mismatch:
                    credibility_score = 0.15 # Severely penalize mismatched content

            if verdict == 'OOD':
                credibility_score = 0.0

            # Combine text weights with image label for frontend display
            combined_weights = text_result['xai']['text_weights'] if text_result else []
            if image_specific_label:
                combined_weights.insert(0, f"IMG: {image_specific_label.upper()}")
            
            response = {
                "verdict": verdict,
                "credibility_score": credibility_score,
                "image_score": image_score,
                "xai_insights": {
                    "explanation": explanation,
                    "text_weights": combined_weights,
                    "heatmap_status": f"Rendered ({forensic_label})" if forensic_label else "Rendered"
                }
            }
            return response

        except Exception as e:
            traceback.print_exc()
            return {
                "verdict": "Error",
                "credibility_score": 0.0,
                "xai_insights": {
                    "explanation": f"Failed to analyze: {str(e)}",
                    "text_weights": [],
                    "heatmap_status": "Failed"
                }
            }
