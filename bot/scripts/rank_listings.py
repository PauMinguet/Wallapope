import os
import json
from datetime import datetime

def safe_float(value, default=0.0):
    """Safely convert value to float."""
    try:
        return float(value) if value is not None else default
    except (ValueError, TypeError):
        return default

def safe_int(value, default=0):
    """Safely convert value to int."""
    try:
        return int(value) if value is not None else default
    except (ValueError, TypeError):
        return default

def analyze_listing(listing, model_data):
    """
    Analyzes a car listing and returns a score from 1-10 based on various factors.
    """
    score = 5.0  # Start with neutral score
    reasons = []
    
    # Get model parameters
    parameters = model_data.get("parameters", {})
    
    # Price analysis
    price = safe_float(listing.get("price", {}).get("amount", 0))
    max_price = safe_float(parameters.get("max_price", 0))
    
    if price <= max_price * 0.8:
        score += 1.5
        reasons.append(f"Great price: {price}€ vs max {max_price}€")
    elif price <= max_price:
        score += 0.5
        reasons.append(f"Price within budget: {price}€")
    else:
        score -= 1.5
        reasons.append(f"Price above budget: {price}€")

    # Mileage analysis
    km = safe_float(listing.get("car_specs", {}).get("kilometers", 0))
    max_km = safe_float(parameters.get("max_km", "0").replace(".", ""))
    
    if km <= max_km * 0.6:
        score += 2
        reasons.append(f"Low mileage: {int(km)}km")
    elif km <= max_km:
        score += 0.5
        reasons.append(f"Acceptable mileage: {int(km)}km")
    else:
        score -= 1
        reasons.append(f"High mileage: {int(km)}km")

    # Year analysis
    year = safe_int(listing.get("car_specs", {}).get("year", 0))
    min_year = safe_int(parameters.get("min_year", 0))
    max_year = safe_int(parameters.get("max_year", 0))
    
    if min_year <= year <= max_year:
        if year >= max_year - 1:
            score += 1.5
            reasons.append(f"Recent year: {year}")
        else:
            score += 0.5
            reasons.append(f"Acceptable year: {year}")
    else:
        score -= 1
        reasons.append(f"Year outside range: {year}")

    # Color analysis
    desired_colors = parameters.get("colors", [])
    description = (listing.get("description", "") or "").lower()
    
    for color in desired_colors:
        if color.lower() in description:
            score += 0.5
            reasons.append(f"Desired color: {color}")
            break
    
    # Maintenance and repairs analysis
    maintenance_level = parameters.get("maintenance", "")
    common_repairs = parameters.get("common_repairs", [])
    
    # Check for maintenance history
    maintenance_keywords = ["mantenimiento", "revisiones", "servicio"]
    for keyword in maintenance_keywords:
        if keyword in description:
            score += 0.5
            reasons.append("Has maintenance history")
            break
    
    # Check for mentioned repairs
    repairs_mentioned = []
    for repair in common_repairs:
        if repair and repair.lower() in description:
            repairs_mentioned.append(repair)
    
    if repairs_mentioned:
        score -= 0.25 * len(repairs_mentioned)
        reasons.append(f"Known issue areas mentioned: {', '.join(repairs_mentioned)}")

    # Equipment and features analysis
    positive_features = [
        ("clima", "Has climate control"),
        ("xenon", "Has xenon lights"),
        ("led", "Has LED lights"),
        ("navegador", "Has navigation"),
        ("sensor", "Has parking sensors"),
        ("camara", "Has backup camera"),
        ("libro", "Has service history"),
        ("garantia", "Has warranty"),
        ("bluetooth", "Has bluetooth"),
        ("automatico", "Has automatic transmission")
    ]
    
    for keyword, reason in positive_features:
        if keyword in description:
            score += 0.25
            reasons.append(reason)

    # Seller analysis
    seller = listing.get("seller", {}) or {}
    ratings_count = safe_int(seller.get("ratings_count"))
    sales = safe_int(seller.get("sales"))
    
    if ratings_count > 0:
        score += 0.25
        reasons.append("Verified seller with ratings")
    
    if sales > 50:
        score += 0.25
        reasons.append("Experienced seller")

    # Normalize score
    score = min(max(score, 1), 10)
    
    return {
        "score": round(score, 1),
        "reasons": reasons
    }

def rank_listings(processed_results_file):
    """
    Ranks all listings in the processed results file.
    """
    try:
        with open(processed_results_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        ranked_listings = []
        
        for model, model_data in data.items():
            listings = model_data.get("listings", [])
            
            for listing in listings:
                try:
                    analysis = analyze_listing(listing, model_data)
                    ranked_listings.append({
                        "model": model,
                        "url": listing.get("url", "No URL"),
                        "location": listing.get("location", "Unknown"),
                        "price": safe_float(listing.get("price", {}).get("amount", 0)),
                        "year": safe_int(listing.get("car_specs", {}).get("year", 0)),
                        "kilometers": safe_int(listing.get("car_specs", {}).get("kilometers", 0)),
                        "score": analysis["score"],
                        "reasons": analysis["reasons"]
                    })
                except Exception as e:
                    print(f"Error processing listing: {e}")
                    continue
        
        # Sort by score descending
        ranked_listings.sort(key=lambda x: x["score"], reverse=True)
        
        return ranked_listings
    except Exception as e:
        print(f"Error reading or processing file: {e}")
        return []

def save_rankings(rankings, output_file="rankings.json"):
    """
    Saves the rankings to a JSON file.
    """
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(rankings, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving rankings: {e}")

if __name__ == "__main__":
    # Process and rank all listings
    rankings = rank_listings("processed_results.json")
    
    if rankings:
        # Save rankings
        save_rankings(rankings)
        
        # Print top 5 deals
        print("\nTop 5 Best Deals:")
        print("-" * 50)
        for i, deal in enumerate(rankings[:5], 1):
            print(f"\n{i}. {deal['model']} ({deal['year']}) - Score: {deal['score']}")
            print(f"   Location: {deal['location']}")
            print(f"   Price: {deal['price']}€ | KM: {deal['kilometers']}")
            print("   Reasons:")
            for reason in deal['reasons']:
                print(f"   - {reason}")
            print(f"   URL: {deal['url']}")
    else:
        print("No rankings were generated.")