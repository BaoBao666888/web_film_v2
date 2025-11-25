import requests

url = "http://127.0.0.1:5002/api/moderate"

payload = {
    "text": "phim rẻ tiền"
}

res = requests.post(url, json=payload)
print("Status:", res.status_code)
print("Response:", res.json())
