import pandas as pd
import logging

logger = logging.getLogger(__name__)

def score_listing(title, target_model, brand):
    """
    Score how likely a listing is to actually be for the target model.
    
    Args:
        title (str): The listing title
        target_model (str): The model we're looking for (e.g. "Duke 390")
        brand (str): The manufacturer (e.g. "KTM")
        
    Returns:
        float: Score between 0 and 1, higher means more likely to be legitimate
    """
    title = title.upper()
    target_model = target_model.upper()
    brand = brand.upper()
    
    score = 0
    
    # Extract model letters and numbers
    target_letters = ''.join(c for c in target_model if c.isalpha())
    target_number = ''.join(c for c in target_model if c.isdigit())
    title_numbers = [int(''.join(c for c in word if c.isdigit())) 
                    for word in title.split() 
                    if any(c.isdigit() for c in word)]
    
    # Exact model match at start of title (after brand) is strongest signal
    if brand in title and target_model in title[title.index(brand):]:
        score += 0.6
    # Exact model match anywhere is good signal
    elif target_model in title:
        score += 0.4
        
    # Brand match is important
    if brand in title:
        score += 0.3
        
    # Check for model letters without number
    if target_letters and target_letters in title:
        score += 0.3
        
    # Check for number within 30 of target
    if target_number and title_numbers:
        target_num = int(target_number)
        for num in title_numbers:
            if abs(num - target_num) <= 30:
                score += 0.3
                break
        
    # Competing model mentions reduce confidence
    competing_models = {
        'DUKE': ['MT', 'Z', 'GSX', 'CBR'],
        'MT': ['DUKE', 'Z', 'GSX', 'CBR'],
        'Z': ['MT', 'DUKE', 'GSX', 'CBR'],
        'GSX': ['MT', 'DUKE', 'Z', 'CBR'],
        'CBR': ['MT', 'DUKE', 'Z', 'GSX'],
        'FORZA': ['XMAX', 'TMAX', 'NMAX'],
        'XMAX': ['FORZA', 'TMAX', 'NMAX'],
        'TMAX': ['XMAX', 'FORZA', 'NMAX'],
    }
    
    base_model = target_model.split()[0]  # Get base model name like "DUKE"
    if base_model in competing_models:
        for competing in competing_models[base_model]:
            if competing in title:
                score -= 0.3
                
    return min(max(score, 0), 1)  # Clamp between 0 and 1

def get_brand_and_model(model):
    """
    Returns the brand and model based on the model name.
    """
    brand_models = {
        'Duke 950': ('KTM', 'DUKE 950'),
        'Duke 890R': ('KTM', 'DUKE 890R'),
        'Duke 890': ('KTM', 'DUKE 890'),
        'Duke 790': ('KTM', 'DUKE 790'),
        'Duke 690': ('KTM', 'DUKE 690'),
        'Duke 390': ('KTM', 'DUKE 390'),
        'Duke 125': ('KTM', 'DUKE 125'),
        'MT-07': ('YAMAHA', 'MT-07'),
        'MT-03': ('YAMAHA', 'MT-03'),
        'Z900': ('KAWASAKI', 'Z900'),
        'Z800': ('KAWASAKI', 'Z800'),
        'Z750': ('KAWASAKI', 'Z750'),
        'Z650': ('KAWASAKI', 'Z650'),
        'Z400': ('KAWASAKI', 'Z400'),
        'Z1000': ('KAWASAKI', 'Z1000'),
        'CBR 125 R': ('HONDA', 'CBR 125'),
        'CB500F': ('HONDA', 'CB500F'),
        'GSX-R 125': ('SUZUKI', 'GSX-R 125'),
        'Ninja 125': ('KAWASAKI', 'NINJA 125'),
        'YZF-R125': ('YAMAHA', 'YZF-R125'),
        'Forza 300': ('HONDA', 'FORZA 300'),
        'XMAX 300': ('YAMAHA', 'XMAX 300'),
        'TMAX 560': ('YAMAHA', 'TMAX 560'),
        'TMAX 530': ('YAMAHA', 'TMAX 530'),
        'TMAX 500': ('YAMAHA', 'TMAX 500'),
    }
    
    return brand_models.get(model, ('UNKNOWN', model))

def filter_listings(listings, target_model, threshold=0.5):
    """
    Filter a list of listings to remove likely incorrect models.
    
    Args:
        listings (list): List of listing dictionaries from Wallapop
        target_model (str): The model we're looking for (e.g. "Duke 390")
        threshold (float): Minimum score to keep listing (default 0.5)
        
    Returns:
        list: Filtered list of listings
    """
    brand, model = get_brand_and_model(target_model)
    
    filtered_listings = []
    rejected_listings = []
    
    for listing in listings:
        score = score_listing(listing['title'], model, brand)
        listing['model_match_score'] = score
        
        if score >= threshold:
            filtered_listings.append(listing)
        else:
            rejected_listings.append(listing)
            logger.debug(f"Rejected listing (score {score:.2f}): {listing['title']}")
    
    logger.info(f"Filtered {len(rejected_listings)} listings from {len(listings)} total")
    return filtered_listings