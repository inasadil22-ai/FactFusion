import torch
import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
import re

class ModelLoader:
    def __init__(self):
        print("Loading fine-tuned Text Model (RoBERTa)...")
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        # --- OOD domain gate ---
        # The fine-tuned model was trained as a STRICT BINARY classifier
        # (Informative vs Non-Informative) on disaster-domain text only — it has
        # no concept of "out of domain" and will always force any input, even
        # something like "I binge-watched a show last night", into one of those
        # two classes. OOD is therefore detected with a lightweight rule-based
        # domain check that runs BEFORE the model is asked anything, rather than
        # by a model-trained class. If the text shows no disaster-domain signal
        # at all, we short-circuit to OOD; otherwise we let the model classify
        # Informative vs Non-Informative as it was trained to do.
        self.disaster_keywords = [
            # events / hazards
            "earthquake", "flood", "flooding", "tsunami", "hurricane", "typhoon",
            "cyclone", "tornado", "landslide", "mudslide", "wildfire", "fire",
            "explosion", "blast", "eruption", "volcano", "drought", "famine",
            "storm", "avalanche", "collapse", "outbreak", "epidemic", "pandemic",
            "war", "attack", "bombing", "shooting", "crash", "derailment",
            # impact / response terms
            "disaster", "crisis", "emergency", "evacuate", "evacuation", "rescue",
            "relief", "casualties", "casualty", "fatalities", "fatality", "injured",
            "injuries", "victim", "victims", "death toll", "displaced", "shelter",
            "damage", "destroyed", "destruction", "collapsed", "rubble", "debris",
            "aftershock", "warning", "alert", "siren", "trapped", "missing",
            "humanitarian", "aid", "responders", "firefighters", "paramedics",
            "ambulance", "hospital", "wounded", "survivors", "looting", "curfew",
        ]
        # Soft/indirect disaster-reaction phrases — vague emotional language people
        # actually post about real disasters, without using clinical keywords above.
        # Multi-word phrases only, to avoid false-positives from unrelated contexts
        # (bare words like "scary" or "terrible" are deliberately excluded — they're
        # too common in non-disaster contexts like movies, sports, breakups, etc.)
        self.soft_disaster_phrases = [
            "pray for everyone", "thoughts and prayers", "sending love and strength",
            "sending love", "sending strength", "stay safe everyone", "please stay safe",
            "everyone affected", "our thoughts are with", "our hearts go out",
            "heartbroken", "condolences",
        ]
        self.uncertain_words = [
            "maybe", "rumor", "rumour", "unconfirmed", "allegedly", "claims",
            "reportedly", "unverified",
        ]

        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, 'models', 'text_model_v2')
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_path, local_files_only=True).to(self.device)
            self.model.eval()
            print("Successfully loaded local RoBERTa text model.")
        except Exception as e:
            print(f"Failed to load local text model: {e}")
            self.tokenizer = None
            self.model = None

    def _has_disaster_signal(self, text):
        """Cheap domain gate: does this text contain any disaster-domain keyword
        or soft/indirect disaster-reaction phrase?"""
        clean = re.sub(r'[^a-z\s]', ' ', text.lower())
        words = set(clean.split())
        has_keyword = any(kw in clean for kw in self.disaster_keywords) or bool(words & set(self.disaster_keywords))
        has_soft_phrase = any(phrase in clean for phrase in self.soft_disaster_phrases)
        return has_keyword or has_soft_phrase

    def predict(self, text):
        if not text:
            return None

        # --- OOD gate: runs before the model, since the model itself was
        # trained as binary Informative/Non-Informative only and cannot
        # represent "unrelated to disasters" on its own. ---
        if not self._has_disaster_signal(text):
            return {
                "label":      "OOD",
                "confidence": None,  # rule-based gate, not a model probability — don't fake precision
                "xai": {
                    "explanation":  "The text is unrelated to any crisis or disaster domain.",
                    "text_weights": ["ANALYSIS-COMPLETE"]
                }
            }

        if self.model and self.tokenizer:
            # Pure model inference — no keyword overrides whatsoever
            inputs = self.tokenizer(
                text, return_tensors='pt',
                truncation=True, max_length=128, padding=True
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                probs   = torch.softmax(outputs.logits, dim=1)[0]

            # Model is a strict binary classifier: 0=Non-Informative, 1=Informative.
            # (Confirmed by the saved config.json id2label/label2id mapping — there
            # is no third class. OOD is handled entirely by the domain gate above.)
            pred_idx         = probs.argmax().item()
            final_confidence = probs[pred_idx].item()

            label_map = {0: "Non-Informative", 1: "Informative"}
            final_label = label_map.get(pred_idx, "Non-Informative")

            explanation = {
                "Informative":     "The text contains useful, specific information about a disaster event.",
                "Non-Informative": "The text provides no actionable or useful disaster information.",
            }[final_label]

        else:
            # Model not loaded — neutral fallback
            final_label      = "Non-Informative"
            final_confidence = 0.5
            explanation      = "Model loading failed, using fallback."

        return {
            "label":      final_label,
            "confidence": round(float(final_confidence), 3),
            "xai": {
                "explanation":  explanation,
                "text_weights": ["ANALYSIS-COMPLETE"]
            }
        }