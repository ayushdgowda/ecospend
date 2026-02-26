import os
import requests
from dotenv import load_dotenv

# Load your API key
load_dotenv()
API_KEY = os.getenv("GREENPT_API_KEY")

# Hit the models endpoint instead of the chat endpoint
url = "https://api.greenpt.ai/v1/models"
headers = {
    "Authorization": f"Bearer {API_KEY}"
}

print("Fetching available models from GreenPT...")
response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    print("\n✅ SUCCESS! Here are the exact model IDs you can use:\n")
    for model in data.get("data", []):
        print(f" - {model.get('id')}")
else:
    print(f"❌ Failed to fetch models: {response.text}")