import os
import requests
import zipfile

def download_file_from_google_drive(file_id, destination):
    URL = "https://docs.google.com/uc?export=download"
    session = requests.Session()
    response = session.get(URL, params={'id': file_id}, stream=True)
    token = get_confirm_token(response)
    if token:
        params = {'id': file_id, 'confirm': token}
        response = session.get(URL, params=params, stream=True)
    save_response_content(response, destination)

def get_confirm_token(response):
    for key, value in response.cookies.items():
        if key.startswith('download_warning'):
            return value
    return None

def save_response_content(response, destination):
    CHUNK_SIZE = 32768
    with open(destination, "wb") as f:
        for chunk in response.iter_content(CHUNK_SIZE):
            if chunk:
                f.write(chunk)

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)

    targets = {
        'disaster_pro_model_BEST.pt': ('1bn0nNm0GPKfEZ-wZ9DC8Ngov_7AXFC06', os.path.join(models_dir, 'disaster_pro_model_BEST.pt')),
        'forensic_v2_model_BEST.pt': ('1gUnvMpDenDIMbe_4apTFhvbhZGEEUkeo', os.path.join(models_dir, 'forensic_v2_model_BEST.pt')),
        'text_model.zip': ('1QKbVGsz4jSgrojLV83OqP_y_C5oxDIsK', os.path.join(models_dir, 'text_model.zip'))
    }

    # Check if models are present
    for filename, (file_id, dest_path) in targets.items():
        # For text model, we look for text_model folder
        if filename == 'text_model.zip':
            folder_path = os.path.join(models_dir, 'text_model')
            if os.path.exists(folder_path) and len(os.listdir(folder_path)) > 0:
                print(f"[*] Text model folder '{folder_path}' already exists. Skipping download.")
                continue
        elif os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000000:
            print(f"[*] Model file '{dest_path}' already exists. Skipping download.")
            continue

        print(f"[+] Downloading {filename} from Google Drive...")
        download_file_from_google_drive(file_id, dest_path)
        print(f"[+] Successfully downloaded {filename}.")

        if filename == 'text_model.zip':
            print("[+] Extracting text_model.zip...")
            with zipfile.ZipFile(dest_path, 'r') as zip_ref:
                zip_ref.extractall(models_dir)
            print("[+] Extraction complete.")
            if os.path.exists(dest_path):
                os.remove(dest_path)
                print("[+] Cleaned up text_model.zip archive.")

if __name__ == '__main__':
    main()
