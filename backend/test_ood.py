import requests

url = 'http://localhost:5000/api/v1/analyze'
data = {'text': 'I am learning React and Flask to build a machine learning web application.'}

try:
    response = requests.post(url, data=data)
    print("Status Code:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Error:", e)
