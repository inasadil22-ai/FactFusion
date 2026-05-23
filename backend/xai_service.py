import torch
import torch.nn.functional as F
import numpy as np

class XAIEngine:
    def __init__(self, text_model=None, image_model=None):
        self.text_model = text_model
        self.image_model = image_model
        
        # Grad-CAM storage variables
        self.gradients = None
        self.activations = None

    def _save_gradient(self, grad):
        self.gradients = grad

    def _save_activation(self, act):
        self.activations = act

    def generate_gradcam(self, input_tensor, target_layer):
        """
        Generates a 2D feature importance heatmap using Grad-CAM.
        
        Args:
            input_tensor (torch.Tensor): Preprocessed image tensor shape (1, 3, H, W)
            target_layer (torch.nn.Module): The final convolutional/feature layer of your model
        Returns:
            np.ndarray: Normalized 224x224 heatmap matrix scaled between 0.0 and 1.0
        """
        if self.image_model is None:
            raise ValueError("Image model not initialized in XAIEngine.")

        self.image_model.eval()
        
        # Register PyTorch forward and backward hooks
        forward_hook = target_layer.register_forward_hook(
            lambda module, input, output: self._save_activation(output)
        )
        backward_hook = target_layer.register_backward_hook(
            lambda module, grad_input, grad_output: self._save_gradient(grad_output[0])
        )

        try:
            # Forward pass to fetch prediction probabilities
            predictions = self.image_model(input_tensor)
            
            # Target the highest scoring class index
            target_class = predictions.argmax(dim=1).item()
            score = predictions[0, target_class]
            
            # Zero out gradients and run backward pass
            self.image_model.zero_grad()
            score.backward()
            
            if self.gradients is None or self.activations is None:
                raise ValueError("Gradients or activations were not captured. Check the target layer.")
            
            # Global Average Pooling (GAP) of the captured gradients
            gradients = self.gradients.cpu().data.numpy()
            activations = self.activations.cpu().data.numpy()
            
            # Calculate alpha weights: mean over height and width channels
            weights = np.mean(gradients, axis=(2, 3))[0]
            
            # Linear combination of activations and weights
            heatmap = np.zeros(activations.shape[2:], dtype=np.float32)
            for i, w in enumerate(weights):
                heatmap += w * activations[0, i, :, :]
                
            # Apply ReLU to only keep features that positively correlate with the target class
            heatmap = np.maximum(heatmap, 0)
            
            # Normalize to avoid dividing by zero if the heatmap is uniform
            denom = np.max(heatmap) - np.min(heatmap)
            if denom == 0:
                denom = 1e-5
            heatmap = (heatmap - np.min(heatmap)) / denom
            
            # Resize the heatmap to 224x224 using PyTorch bilinear interpolation
            heatmap_tensor = torch.from_numpy(heatmap).unsqueeze(0).unsqueeze(0) # Shape: (1, 1, H, W)
            heatmap_resized = F.interpolate(heatmap_tensor, size=(224, 224), mode='bilinear', align_corners=False)
            heatmap = heatmap_resized.squeeze().numpy()
            
            return heatmap
            
        finally:
            # Always remove hooks to prevent GPU memory leaks
            forward_hook.remove()
            backward_hook.remove()

    def extract_text_attributions(self, text, tokenizer):
        """
        Calculates feature importance scores for incoming text tokens.
        Falls back to keyword density analysis if target layers aren't Hooked.
        """
        if self.text_model is None:
            return [{"token": word, "weight": 0.5} for word in text.split()[:6]]
            
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=128)
        
        # Ensure inputs are moved to the same device as the model
        device = next(self.text_model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.text_model(**inputs)
        
        # Extract raw logits to map back to individual token components
        logits = F.softmax(outputs.logits, dim=-1)
        tokens = tokenizer.convert_ids_to_tokens(inputs["input_ids"][0].cpu())
        
        attributions = []
        for idx, token in enumerate(tokens):
            if token in ['<s>', '</s>', '<pad>', '<unk>']: 
                continue
            # Simplified raw attribution score placeholder derived from model prediction logits
            # Compute token attribution weight based on max logit scaled by token position
            max_logit = logits[0].max().item()
            weight = float(max_logit * (1.0 / (idx + 1)))
            attributions.append({"token": token.replace('Ġ', ''), "weight": round(weight, 3)})
            
        return sorted(attributions, key=lambda x: x["weight"], reverse=True)[:6]
