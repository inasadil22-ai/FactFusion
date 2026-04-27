
import torch
from transformers import pipeline
import numpy as np

class ModelLoader:
    def __init__(self):
        print("Loading Model...")
        # Use the model specified in the notebook: distilbert-base-uncased-finetuned-sst-2-english
        # The notebook used pipeline("text-classification", model=...)
        self.classifier = pipeline("text-classification", model="distilbert-base-uncased-finetuned-sst-2-english")
        
        # Keyword lists from the notebook (Cell 22)
        # Expanded keywords to catch "shaking", "dam", etc.
        self.disaster_keywords = [
            'earthquake', 'flood', 'tsunami', 'hurricane', 'cyclone', 'tornado', 'monsoon',
            'landslide', 'avalanche', 'wildfire', 'drought', 'quake', 'storm', 'rain',
            'emergency', 'rescue', 'evacuate', 'evacuation', 'shelter', 'trapped', 'missing',
            'relief', 'aid', 'medical', 'hospital', 'ambulance', 'paramedic', '1122', 'ndma',
            'casualty', 'dead', 'death', 'died', 'injured', 'injury', 'blood', 'victim',
            'survivor', 'bodies', 'debris', 'collapsed', 'destroyed', 'damage', 'shattered',
            'fire', 'explosion', 'blast', 'smoke', 'terrorist', 'shooting', 'hostage',
            'alert', 'warning', 'critical', 'urgent', 'disaster', 'catastrophe',
            'shaking', 'shook', 'tremor', 'jolts', 'ground', 'dam', 'burst', 'breach', 'overflow'
        ]

        self.uncertain_words = [
            'think', 'maybe', 'was it', 'perhaps', 'not sure', 'guessing',
            'anyone else', 'did you feel', 'is it true', 'confirm?', 'rumor',
            'heard that', 'could be', 'seems like', 'probably', 'can someone check',
            'is there any news', 'allegedly', 'supposedly', 'vibration?', 'did i dream',
            'checking', 'asking', 'any updates?', 'what happened', 'was that a'
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

        self.subjective_indicators = [
            'scary', 'terrifying', 'horrible', 'omg', 'wow', 'crazy', 'insane',
            'everyone', 'talking about', 'social media', 'twitter', 'facebook',
            'felt', 'feel', 'panicked', 'ran out',
            'safe', 'prayers', 'god', 'bless', 'hope', 'wish', 'sad', 'crying'
        ]

    def predict(self, text):
        if not text:
            return None

        input_lower = text.lower()
        
        # 1. Feature Extraction
        # Count keyword matches for density scoring
        disaster_matches = [word for word in self.disaster_keywords if word in input_lower]
        uncertain_matches = [word for word in self.uncertain_words if word in input_lower]
        alarmist_matches = [word for word in self.alarmist_indicators if word in input_lower]
        exaggeration_matches = [word for word in self.exaggeration_words if word in input_lower]
        subjective_matches = [word for word in self.subjective_indicators if word in input_lower]

        has_context = len(disaster_matches) > 0
        
        # 2. Logic Gates for Classification
        final_label = ""
        explanation = ""
        
        # Gate 1: OOD (Out of Distribution)
        if not has_context:
            final_label = "OOD"
            explanation = "Input implies no relevance to disaster events."
            final_confidence = 0.0
            xai_weights = ["no-context"]
        
        else:
            # Context Exists -> Check for disqualifiers
            
            # STRICT Rules: Uncertainty (Rumors) or Alarmist content is an immediate disqualifier
            is_strict_noise = (len(uncertain_matches) > 0) or (len(alarmist_matches) > 0) or (len(exaggeration_matches) > 0)
            
            # LENIENT Rule: Subjective/Emotional language is okay IF context is strong (multiple keywords)
            # E.g. "I felt the earthquake, it was scary!" (Informative)
            # E.g. "It was scary." (Non-Informative)
            is_subjective_noise = False
            if len(subjective_matches) > 0:
                # Require 2+ disaster words to override subjectivity
                if len(disaster_matches) < 2:
                    is_subjective_noise = True
                    
            if is_strict_noise or is_subjective_noise:
                final_label = "Non-Informative"
                if len(uncertain_matches) > 0: explanation = "Text contains uncertainty or questions."
                elif len(alarmist_matches) > 0: explanation = "Text matches alarmist/panic patterns."
                elif len(exaggeration_matches) > 0: explanation = "Text contains exaggerated claims."
                elif len(subjective_matches) > 0: explanation = "Text is primarily subjective/emotional."
                else: explanation = "Content contains noise."
                
                # Heuristic Score: 0.30 to 0.70
                # Base 0.40 + bonus for context
                # Strict noise penalizes more
                penalty = 0.1 if is_strict_noise else 0.05
                score = 0.40 + (len(disaster_matches) * 0.1) - penalty
                final_confidence = max(0.20, min(0.70, score))
                
                xai_weights = (uncertain_matches + alarmist_matches + exaggeration_matches + subjective_matches)[:3]

            else:
                # Clean Context (or Subjective + Strong Context) -> Informative
                final_label = "Informative"
                explanation = "High-confidence verifiable disaster content detected."
                
                # Heuristic Score: 0.80 to 0.99
                # Base 0.85
                score = 0.85 + (len(disaster_matches) * 0.05)
                final_confidence = max(0.85, min(0.99, score))
                
                xai_weights = disaster_matches[:3]

        return {
            "label": final_label,
            "confidence": final_confidence, 
            "credibility_score": final_confidence, 
            "probabilities": {
                "Informative": final_confidence if final_label == "Informative" else (1-final_confidence)/2,
                "Non-Informative": final_confidence if final_label == "Non-Informative" else (1-final_confidence)/2,
                "OOD": 0.0 
            },
            "xai": {
                "explanation": explanation,
                "text_weights": xai_weights or ["analysis-complete"]
            }
        }
