import requests
import json
import re
import time

def get_model_info(modelo_id):
    url = "https://www.dieselogasolina.com/Itp/ModelosInfo"
    payload = {
        "modelo": modelo_id
    }
    
    try:
        response = requests.post(url, data=payload)
        if response.status_code == 200:
            return response.text
        else:
            print(f"Failed to get info for model {modelo_id}: {response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error getting info for model {modelo_id}: {e}")
        return None

def get_itp_models():
    # Define the endpoint URL
    url = "https://www.dieselogasolina.com/Itp/Modelos"
    
    # Define the payload
    payload = {
        "marca": "98",
        "anyo": "2014",
        "combustible": "G",
        "cc": "2.0"
    }
    
    try:
        # Make the POST request
        response = requests.post(url, data=payload)
        
        # Check if the request was successful
        if response.status_code == 200:
            # Extract JSON data from the HTML response using regex
            json_match = re.search(r'<div class="colA">\s*(\[.*?\])\s*</div>', response.text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                # Parse the JSON data
                models = json.loads(json_str)
                
                print(f"Found {len(models)} models. Getting details for each model...")
                
                # Get info for each model
                for model in models:
                    model_id = model['id_itp_modelo']
                    print(f"\nGetting info for model: {model['desc_modelo']} (ID: {model_id})")
                    
                    model_info = get_model_info(model_id)
                    if model_info:
                        print(f"Model info: {model_info}")
                    
                    # Add a small delay to avoid overwhelming the server
                    time.sleep(1)
            else:
                print("No JSON data found in the response")
        else:
            print(f"Request failed with status code: {response.status_code}")
            print("Response:", response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        print("JSON string that failed to parse:", json_str if 'json_str' in locals() else "Not available")

if __name__ == "__main__":
    get_itp_models() 