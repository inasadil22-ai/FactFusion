import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from PIL import Image
from backend.multimodal_service import MultimodalService

# 1. Create a valid test image
print("Creating temporary test image...")
img = Image.new('RGB', (300, 300), color = 'red')
img.save('temp_test.jpg')

# 2. Initialize service
print("Initializing MultimodalService...")
service = MultimodalService()

# 3. Analyze image + caption
print("Running multimodal analysis...")
try:
    res = service.analyze(image_path='temp_test.jpg', caption='There is a massive flood in California and buildings are submerged.')
    print("Analysis Completed Successfully! ✅")
    print("Verdict:", res.get("verdict"))
    print("Stage 1 (Image):", res.get("stage_1_image_analysis"))
    print("Stage 2 (Text):", res.get("stage_2_text_analysis"))
    print("Stage 3 (Fusion):", res.get("stage_3_multimodal_fusion"))
    print("Heatmap status:", res.get("xai_insights", {}).get("heatmap_status"))
    print("Heatmap present:", res.get("xai_insights", {}).get("visual_heatmap") is not None)
except Exception as e:
    print("Analysis FAILED! ❌")
    import traceback
    traceback.print_exc()

# 4. Cleanup
if os.path.exists('temp_test.jpg'):
    os.remove('temp_test.jpg')
