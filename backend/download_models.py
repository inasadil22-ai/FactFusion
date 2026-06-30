import os
import zipfile
from huggingface_hub import hf_hub_download

REPO_ID = "Inas-00/factfusion-weights"

# Use absolute paths relative to this file so it works regardless of cwd
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET_DIR = os.path.join(BASE_DIR, "models")

def download_weights():
    print(f"[*] Initializing connection to Hugging Face: {REPO_ID}...")
    print(f"[*] Target model directory: {TARGET_DIR}")
    os.makedirs(TARGET_DIR, exist_ok=True)

    # --- text_model_v2: real zip archive (multiple files: config, tokenizer, weights) ---
    text_model_dir = os.path.join(TARGET_DIR, "text_model_v2")
    sentinel = os.path.join(text_model_dir, "config.json")
    if os.path.exists(sentinel):
        print("[OK] text_model_v2 already extracted — skipping download.")
    else:
        print("[+] Pulling text_model_v2.zip from Hub...")
        try:
            zip_path = hf_hub_download(
                repo_id=REPO_ID,
                filename="text_model_v2.zip",
                local_dir=TARGET_DIR,
                repo_type="dataset"
            )
            print(f"[+] Extracting text_model_v2.zip into {text_model_dir}...")
            os.makedirs(text_model_dir, exist_ok=True)
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(text_model_dir)
            print("[+] Cleanly extracted text_model_v2.zip!")
            if os.path.exists(zip_path):
                os.remove(zip_path)
        except Exception as e:
            print(f"[ERROR] Error processing text_model_v2.zip: {e}")
            raise e

    # --- semantic + forensic: raw .pt files, no zip wrapping ---
    # NOTE: .pt files are already internally zip-formatted (PyTorch's own
    # serialization format). Wrapping them in an additional .zip and then
    # extracting with zipfile silently unpacks their internal contents
    # (data/0, data/1, ..., version, .data/serialization_id) instead of
    # producing a usable .pt file. So these are stored and pulled as raw
    # files on the Hub — no extraction step needed.
    for pt_filename in ["disaster_pro_model_BEST.pt", "forensic_v2_model_BEST.pt"]:
        target_path = os.path.join(TARGET_DIR, pt_filename)
        if os.path.exists(target_path):
            print(f"[OK] {pt_filename} already present — skipping download.")
            continue
        print(f"[+] Pulling {pt_filename} from Hub...")
        try:
            downloaded_path = hf_hub_download(
                repo_id=REPO_ID,
                filename=pt_filename,
                local_dir=TARGET_DIR,
                repo_type="dataset"
            )
            print(f"[+] {pt_filename} downloaded to {downloaded_path}")
        except Exception as e:
            print(f"[ERROR] Error downloading {pt_filename}: {e}")
            raise e

    print("[DONE] All multimodal weights successfully loaded!")

if __name__ == "__main__":
    download_weights()