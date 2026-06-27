import os
import zipfile
from huggingface_hub import hf_hub_download

REPO_ID = "Inas-00/factfusion-weights"

# Use absolute paths relative to this file so it works regardless of cwd
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET_DIR = os.path.join(BASE_DIR, "models")

MODELS_TO_PROCESS = [
    # NEW: text_model_v2 — fine-tuned RoBERTa (better accuracy, replaces text_model)
    {"zip_name": "text_model_v2.zip", "extract_to": os.path.join(TARGET_DIR, "text_model_v2")},
    # Image models
    {"zip_name": "disaster_pro_model_BEST.pt.zip", "extract_to": TARGET_DIR},
    {"zip_name": "forensic_v2_model_BEST.pt.zip",  "extract_to": TARGET_DIR},
]

def download_weights():
    print(f"[*] Initializing connection to Hugging Face: {REPO_ID}...")
    print(f"[*] Target model directory: {TARGET_DIR}")
    os.makedirs(TARGET_DIR, exist_ok=True)

    for model in MODELS_TO_PROCESS:
        zip_name    = model["zip_name"]
        extract_dir = model["extract_to"]
        zip_path    = os.path.join(TARGET_DIR, zip_name)

        # Sentinel file — if it exists, skip download
        if zip_name == "text_model_v2.zip":
            sentinel = os.path.join(extract_dir, "config.json")
        elif zip_name == "disaster_pro_model_BEST.pt.zip":
            sentinel = os.path.join(TARGET_DIR, "disaster_pro_model_BEST.pt")
        else:
            sentinel = os.path.join(TARGET_DIR, "forensic_v2_model_BEST.pt")

        if os.path.exists(sentinel):
            print(f"[OK] {zip_name} already extracted — skipping download.")
            continue

        print(f"[+] Pulling {zip_name} from Hub...")
        try:
            hf_hub_download(
                repo_id=REPO_ID,
                filename=zip_name,
                local_dir=TARGET_DIR,
                repo_type="dataset"
            )
            print(f"[+] Extracting {zip_name} into {extract_dir}...")
            os.makedirs(extract_dir, exist_ok=True)
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            print(f"[+] Cleanly extracted {zip_name}!")

            # Delete the archive to save container disk space
            if os.path.exists(zip_path):
                os.remove(zip_path)

        except Exception as e:
            print(f"[ERROR] Error processing {zip_name}: {e}")
            raise e

    print("[DONE] All multimodal weights successfully loaded and extracted!")

if __name__ == "__main__":
    download_weights()