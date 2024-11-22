import json
import os
from groq import Groq
from dotenv import load_dotenv
import pandas as pd
from pathlib import Path

# Load environment variables
load_dotenv()
groq_api_key = os.getenv('GROQ_API_KEY')
client = Groq(api_key=groq_api_key)

def load_detailed_results():
    """Load the detailed results from JSON file"""
    with open('scripts/detailed_results.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def save_to_csv(listing_data, csv_path):
    """Save or append a single listing analysis to CSV"""
    df = pd.DataFrame([listing_data])
    
    if not Path(csv_path).exists():
        # Create new CSV with headers if it doesn't exist
        df.to_csv(csv_path, index=False, mode='w', encoding='utf-8')
    else:
        # Append without headers if file exists
        df.to_csv(csv_path, index=False, mode='a', header=False, encoding='utf-8')

def analyze_listing(listing, model_parameters):
    """Send listing to Groq for analysis"""
    
    prompt = f"""
    You are an expert car appraiser. Analyze this car listing and rate it from 0-100 based on the following criteria:
    - Price compared to reference ({model_parameters['price']})
    - Mileage compared to reference ({model_parameters['kilometers']})
    - Year within target range ({model_parameters['year_range']})
    - Overall condition and maintenance based on description
    - Seller type (private vs dealer)
    - Additional features and equipment
    
    Car listing details:
    {listing['info']}
    
    Respond in JSON format with:
    {{
        "score": <0-100>,
        "price_score": <0-100>,
        "mileage_score": <0-100>,
        "year_score": <0-100>,
        "condition_score": <0-100>,
        "seller_score": <0-100>,
        "features_score": <0-100>,
        "explanation": "<brief explanation of the rating>"
    }}
    """

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are an expert car appraiser who analyzes listings and provides numerical scores."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        model="mixtral-8x7b-32768",
        temperature=0.3,
        max_tokens=1000
    )

    try:
        response = json.loads(chat_completion.choices[0].message.content)
        return response
    except:
        print(f"Error parsing response for listing: {listing['url']}")
        return None

def rank_listings():
    """Analyze and rank all listings"""
    results = load_detailed_results()
    ranked_listings = []
    csv_path = 'scripts/ranked_listings.csv'
    
    # Initialize progress tracking
    total_listings = sum(len(data['listings']) for data in results.values())
    processed = 0

    for model, data in results.items():
        print(f"\nAnalyzing listings for {model}...")
        parameters = data['parameters']
        
        for listing in data['listings']:
            print(f"Analyzing listing: {listing['url']}")
            analysis = analyze_listing(listing, parameters)
            
            if analysis:
                ranked_listing = {
                    'model': model,
                    'url': listing['url'],
                    'score': analysis['score'],
                    'price_score': analysis['price_score'],
                    'mileage_score': analysis['mileage_score'],
                    'year_score': analysis['year_score'],
                    'condition_score': analysis['condition_score'],
                    'seller_score': analysis['seller_score'],
                    'features_score': analysis['features_score'],
                    'explanation': analysis['explanation'],
                    'reference_price': parameters['price'],
                    'reference_kilometers': parameters['kilometers'],
                    'reference_year_range': parameters['year_range']
                }
                
                # Save to CSV immediately
                save_to_csv(ranked_listing, csv_path)
                
                ranked_listings.append(ranked_listing)
                
                # Update and display progress
                processed += 1
                print(f"Progress: {processed}/{total_listings} ({(processed/total_listings)*100:.1f}%)")
    
    # Sort by score and save final JSON
    ranked_listings.sort(key=lambda x: x['score'], reverse=True)
    with open('scripts/ranked_listings.json', 'w', encoding='utf-8') as f:
        json.dump(ranked_listings, f, indent=2, ensure_ascii=False)
    
    return ranked_listings

def print_top_deals(ranked_listings, n=10):
    """Print the top N deals"""
    print(f"\nTop {n} Deals:")
    print("-" * 80)
    
    for i, listing in enumerate(ranked_listings[:n], 1):
        print(f"\n{i}. {listing['model']}")
        print(f"Score: {listing['score']}/100")
        print(f"URL: {listing['url']}")
        print(f"Explanation: {listing['explanation']}")
        print("-" * 40)

if __name__ == "__main__":
    print("Starting listing analysis...")
    ranked_listings = rank_listings()
    
    print("\nAnalysis complete!")
    print(f"Analyzed {len(ranked_listings)} listings")
    print("\nResults saved to:")
    print("- scripts/ranked_listings.json")
    print("- scripts/ranked_listings.csv")
    
    print_top_deals(ranked_listings) 