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
            self.tokenizer = None
            self.model = None

    def predict(self, text):
        if not text:
            return None

        if self.model and self.tokenizer:
            # Pure model inference — no keyword overrides whatsoever
            inputs = self.tokenizer(
                text, return_tensors='pt',
                truncation=True, max_length=128, padding=True
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                probs   = torch.softmax(outputs.logits, dim=1)[0]

            # Model label order: 0=Non-Informative, 1=Informative, 2=OOD
            # Matches training notebook label2id mapping
            pred_idx         = probs.argmax().item()
            final_confidence = probs[pred_idx].item()

            label_map = {0: "Non-Informative", 1: "Informative", 2: "OOD"}
            final_label = label_map.get(pred_idx, "Non-Informative")

            explanation = {
                "Informative":     "The text contains useful, specific information about a disaster event.",
                "Non-Informative": "The text provides no actionable or useful disaster information.",
                "OOD":             "The text is unrelated to any crisis or disaster domain.",
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