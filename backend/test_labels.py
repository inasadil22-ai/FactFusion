import requests

tests = [
    "I think maybe there was an earthquake? did anyone feel it? not sure",
    "The weather is nice today, going for a walk",
    "BREAKING!! NASA confirms toxic gas leak, billions affected, government hiding truth!!"
]

for text in tests:
    r = requests.post("http://127.0.0.1:7860/api/v1/analyze", data={"text": text})
    d = r.json()
    print("Text:", text[:50])
    print("  Label:", d["stage_2_text_analysis"]["text_label"], "| Credibility:", d["credibility_score"])
    print()