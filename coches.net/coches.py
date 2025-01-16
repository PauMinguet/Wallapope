import requests
from bs4 import BeautifulSoup
import time
import socket

def get_car_listings():
    url = "https://www.coches.net/segunda-mano/?MaxKms=200000&MinPrice=2000&MaxPrice=6000&priceRank=3%7C4%7C5&arrProvince=8%7C17%7C25%7C43&MakeIds%5B0%5D=47&ModelIds%5B0%5D=89&MinYear=2006"
    
    # Headers to exactly match browser request
    headers = {
        'authority': 'www.coches.net',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-US,en;q=0.9,es-ES;q=0.8,es;q=0.7',
        'cache-control': 'max-age=0',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
    
    try:
        # Try to resolve the domain first
        print("Attempting to resolve www.coches.net...")
        ip = socket.gethostbyname('www.coches.net')
        print(f"Successfully resolved to IP: {ip}")
        
        # Add a small delay to be respectful to the server
        time.sleep(1)
        
        print(f"Making request to {url}")
        # Make the request with a timeout
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Response status code: {response.status_code}")
        
        response.raise_for_status()
        
        # Parse the HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Save the HTML for inspection
        with open('response.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("Saved raw HTML to response.html for inspection")
        
        # Find the main list container
        content = soup.find(class_='mt-ListAds')
        
        if content:
            # Find all ads using data-ad-position attribute
            ads = content.find_all(attrs={'data-ad-position': True})
            
            if ads:
                for ad in ads:
                    # Only print non-empty ads
                    if ad.get_text(strip=True):
                        position = ad.get('data-ad-position')
                        print(f"\n--- Ad Position {position} ---")
                        print(ad.get_text(strip=True, separator='\n'))
            else:
                print("No individual ads found")
        else:
            print("No content found with class mt-ListAds")
            print("Available classes in the HTML:")
            for element in soup.find_all(class_=True):
                print(element.get('class'))
            
    except socket.gaierror as e:
        print(f"DNS Resolution Error: Could not resolve www.coches.net")
        print(f"Error details: {e}")
    except requests.RequestException as e:
        print(f"Request Error: {e}")
        if hasattr(e, 'response'):
            print(f"Response Status Code: {e.response.status_code}")
            print(f"Response Headers: {e.response.headers}")
    except Exception as e:
        print(f"Unexpected Error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    get_car_listings()
