# FactFusion — Crisis Integrity Gate 🛡️

A **multimodal AI pipeline** for disaster information verification. It analyzes text, images, or both to determine whether crisis content is **Informative**, **Non-Informative**, or **Out-of-Distribution (OOD)** using a 3-stage deep learning pipeline.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Python + Flask |
| ML Models | PyTorch, HuggingFace Transformers, CLIP |
| Database | MongoDB Atlas |

---

## ⚠️ Model Setup (Required Before Running)

The model files are **too large for GitHub** and are hosted on Google Drive. You must download them manually and place them in the correct folders.

### Download Links

| Model | Size | Download |
|---|---|---|
| Semantic Model (`disaster_pro_model_BEST.pt`) | ~132 MB | [Download from Google Drive](https://drive.google.com/file/d/1bn0nNm0GPKfEZ-wZ9DC8Ngov_7AXFC06/view?usp=sharing) |
| Forensic Model (`forensic_v2_model_BEST.pt`) | ~132 MB | [Download from Google Drive](https://drive.google.com/file/d/1gUnvMpDenDIMbe_4apTFhvbhZGEEUkeo/view?usp=sharing) |
| Text Model (`text_model/` folder) | ~475 MB | [Download from Google Drive](https://drive.google.com/file/d/1QKbVGsz4jSgrojLV83OqP_y_C5oxDIsK/view?usp=sharing) |

> 📌 Replace the Text Model link above with your actual Google Drive folder link after uploading the `text_model/` directory.

### Where to Place the Files

After downloading, create this structure inside the `backend/` folder:

```
backend/
└── models/
    ├── disaster_pro_model_BEST.pt
    ├── forensic_v2_model_BEST.pt
    └── text_model/
        ├── config.json
        ├── model.safetensors
        ├── tokenizer.json
        ├── tokenizer_config.json
        ├── vocab.json
        ├── merges.txt
        └── special_tokens_map.json
```

---

## 🛠️ Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/FactFusion.git
cd FactFusion
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside `backend/` with:

```env
MONGO_URI=your_mongodb_atlas_connection_string
```

Then download and place the models as described above, and start the server:

```bash
python server.py
```

The Flask API will run at `http://127.0.0.1:5000`

### 3. Frontend Setup

```bash
# From the root FactFusion/ directory
npm install
npm run dev
```

The React app will run at `http://localhost:5173`

---

## 🧠 Pipeline Overview

```
Input (Text / Image / Both)
        │
        ▼
┌───────────────────┐
│  Stage 1          │  Text Analysis (RoBERTa fine-tuned)
│  Text Analysis    │  → Informative / Non-Informative / OOD
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Stage 2          │  Image Analysis
│  Image Analysis   │  → Semantic (ResNet) + Forensic (EfficientNet)
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Stage 3          │  Multimodal Fusion (CLIP cross-modal)
│  Fusion           │  → Final Verdict + XAI Explanation
└───────────────────┘
```

---

## 📁 Project Structure

```
FactFusion/
├── backend/
│   ├── models/          ← Place downloaded models here (git-ignored)
│   ├── uploads/         ← Runtime image uploads (git-ignored)
│   ├── multimodal_service.py
│   ├── server.py
│   ├── requirements.txt
│   └── .env             ← Your secrets (git-ignored)
├── src/
│   ├── components/
│   └── pages/
├── .gitignore
└── README.md
```

---

## 📄 License

MIT
