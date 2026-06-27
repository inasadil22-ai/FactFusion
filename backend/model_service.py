import torch
import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
import re

class ModelLoader:
    def __init__(self):
        print("Loading fine-tuned Text Model (RoBERTa)...")
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, 'models', 'text_model_v2')
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_path, local_files_only=True).to(self.device)
            self.model.eval()
            print("Successfully loaded local RoBERTa text model.")
        except Exception as e:
            print(f"Failed to load local text model: {e}")
            # Fallback (optional, but requested to use provided files)
            self.tokenizer = None
            self.model = None

        # Keyword lists from the notebook (Text-analysis code.ipynb)
        self.disaster_keywords = [
            'earthquake', 'flood', 'tsunami', 'hurricane', 'cyclone', 'tornado', 'monsoon',
            'landslide', 'avalanche', 'wildfire', 'drought', 'quake', 'storm', 'rain',
            'emergency', 'rescue', 'evacuate', 'evacuation', 'shelter', 'trapped', 'missing',
            'relief', 'aid', 'medical', 'hospital', 'ambulance', 'paramedic', '1122', 'ndma',
            'casualty', 'dead', 'death', 'died', 'injured', 'injury', 'blood', 'victim',
            'survivor', 'bodies', 'debris', 'collapsed', 'destroyed', 'damage', 'shattered',
            'fire', 'explosion', 'blast', 'smoke', 'terrorist', 'shooting', 'hostage',
            'alert', 'warning', 'critical', 'urgent', 'disaster', 'catastrophe'
        ]

        self.uncertain_words = [
            'think', 'maybe', 'was it', 'perhaps', 'not sure', 'guessing',
            'anyone else', 'did you feel', 'is it true', 'confirm?', 'rumor',
            'heard that', 'could be', 'seems like', 'probably', 'can someone check',
            'is there any news', 'allegedly', 'supposedly', 'vibration?', 'did i dream',
            'checking', 'asking', 'any updates?', 'what happened', 'was that a',
            'unverified', 'unconfirmed', 'suspect', 'reportedly', 'according to'
        ]

        self.alarmist_indicators = [
            'announced', 'nasa', 'who', 'must share', 'toxic gas', 'leak',
            'aliens', 'mystery', 'secret', 'hiding', 'conspiracy', 'official warning',
            'breaking news!!', 'spread this', 'warning!', 'unbelievable', 'shocking',
            'forwarded as received', 'emergency alert!', 'broadcast', 'click here',
            'save your family', 'urgent notice', 'government hiding', 'viral',
            'exclusive', 'don\'t drink', 'gas mask', 'radiation'
        ]

        self.exaggeration_words = [
            'end of world', 'entire continent', 'no one survived', '10.', '11.', '12.',
            'billion dead', 'everything destroyed', 'wiped out', 'total annihilation',
            'doomsday', 'armageddon', 'all died', 'millions trapped', 'city gone',
            'history\'s biggest', 'wiped off map', 'apocalypse', 'extinction',
            'billions affected', 'complete chaos', 'no hope', 'deadly wave'
        ]

    def predict(self, text):
        if not text:
            return None

        input_lower = text.lower()
        
        # 1. Feature Extraction (Keyword density)
        has_context = any(word in input_lower for word in self.disaster_keywords)
        is_uncertain = any(word in input_lower for word in self.uncertain_words)
        is_alarmist = any(word in input_lower for word in self.alarmist_indicators)
        is_exaggerated = any(word in input_lower for word in self.exaggeration_words)

        # 2. Model Inference (if available)
        final_label = ""
        final_confidence = 0.0
        explanation = ""
        xai_weights = []

        if self.model and self.tokenizer:
            inputs = self.tokenizer(text, return_tensors='pt', truncation=True, max_length=128, padding=True).to(self.device)
            with torch.no_grad():
                outputs = self.model(**inputs)
                probs = torch.softmax(outputs.logits, dim=1)[0]

            # Label 0: Non-Informative, Label 1: Informative (based on notebook)
            inf_conf     = probs[1].item()
            non_inf_conf = probs[0].item()
            model_says_informative = inf_conf > 0.55

            # --- Decision logic: RoBERTa is the primary signal ---
            # Keywords only override when the model is confident AND they add
            # clear semantic evidence (uncertain phrasing, alarmism, OOD topic).

            if not has_context:
                # Model sees no disaster topic → out-of-domain regardless of score
                final_label      = "OOD"
                final_confidence = max(non_inf_conf, 1.0 - inf_conf)
                explanation      = "The text is entirely unrelated to any crisis or disaster domain."

            elif is_uncertain and model_says_informative:
                # RoBERTa thinks it's informative BUT uncertain language detected →
                # downgrade to Unverified Rumor (speculative disaster claim)
                final_label      = "Unverified Rumor"
                final_confidence = inf_conf
                explanation      = "Text contains disaster-related content but uses speculative or unverified language."
                xai_weights.append("UNCERTAIN-SIGNAL")

            elif (is_alarmist or is_exaggerated) and model_says_informative:
                # RoBERTa thinks informative BUT alarmist/exaggerated phrasing →
                # downgrade to Non-Informative (sensationalist, not actionable)
                final_label      = "Non-Informative"
                final_confidence = inf_conf
                explanation      = "Text uses alarmist or exaggerated language with no actionable disaster information."
                if is_alarmist:   xai_weights.append("ALARMIST")
                if is_exaggerated: xai_weights.append("EXAGGERATED")

            elif model_says_informative:
                # RoBERTa confident → Informative (no overriding red flags)
                final_label      = "Informative"
                final_confidence = inf_conf
                explanation      = "The text contains useful, specific information about a disaster event."

            elif is_uncertain:
                # Model not confident AND uncertain language → Unverified Rumor
                final_label      = "Unverified Rumor"
                final_confidence = non_inf_conf
                explanation      = "Disaster context detected but language is speculative and model confidence is low."
                xai_weights.append("UNCERTAIN-SIGNAL")

            else:
                # Model not confident, no special flags → Non-Informative
                final_label      = "Non-Informative"
                final_confidence = non_inf_conf
                explanation      = "The text provides no actionable or useful disaster information."

            # Collect keyword evidence for XAI
            found_keywords = [w.upper() for w in self.disaster_keywords if w in input_lower]
            xai_weights    = (found_keywords + xai_weights)[:5]
        else:
            # Simple heuristic fallback
            if not has_context:
                final_label = "OOD"
            elif is_uncertain or is_alarmist or is_exaggerated:
                final_label = "Non-Informative"
            else:
                final_label = "Informative"
            final_confidence = 0.5
            explanation = "Model loading failed, using heuristic fallback."

        return {
            "label": final_label,
            "confidence": final_confidence,
            "is_uncertain": is_uncertain, # For Fusion Stage
            "is_disaster": has_context, # Added to support multimodal_service.py flags
            "xai": {
                "explanation": explanation,
                "text_weights": xai_weights or ["ANALYSIS-COMPLETE"]
            }
        }