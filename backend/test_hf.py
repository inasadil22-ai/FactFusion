import requests, json

HF_URL = "https://inas-00-factfusion-backend.hf.space"

r = requests.post(f"{HF_URL}/api/v1/analyze", data={
    "text": "Massive earthquake hits Lahore, rescue teams deployed, hundreds trapped",
    "user_id": "test123"
})
print(json.dumps(r.json(), indent=2))