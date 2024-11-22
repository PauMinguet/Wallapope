import json

def process_listing_info(info_list):
    """Process a single listing's info list into structured data"""
    data = {
        'location': None,
        'seller': {
            'name': None,
            'rating': None,
            'sales': None,
            'ratings_count': None
        },
        'price': {
            'amount': None,
            'financing_available': False,
            'financing_price': None
        },
        'car_specs': {
            'body_type': None,
            'seats': None,
            'doors': None,
            'fuel': None,
            'power': None,
            'transmission': None,
            'brand': None,
            'model': None,
            'year': None,
            'kilometers': None
        },
        'description': None,
        'stats': {
            'views': None,
            'favorites': None
        },
        'last_edited': None,
        'sustainability': None
    }
    
    # Process the info list sequentially
    for i, item in enumerate(info_list):
        # Skip "Inicio" which is always first
        if i == 0 and item == "Inicio":
            continue
            
        # Location is usually second
        if i == 1:
            data['location'] = item
            continue
            
        # Look for seller info
        if "ventas" in item:
            try:
                data['seller']['sales'] = int(item.split()[0])
            except:
                pass
        if "valoraciones" in item:
            try:
                data['seller']['ratings_count'] = int(item.split()[0])
            except:
                pass
            
        # Look for price info
        if "€" in item:
            try:
                price = float(item.replace("€", "").replace(".", "").replace(",", ".").strip())
                if not data['price']['amount']:
                    data['price']['amount'] = price
                elif "financiado" in info_list[i-1]:
                    data['price']['financing_available'] = True
                    data['price']['financing_price'] = price
            except:
                pass
                
        # Car specifications
        specs_mapping = {
            'Pequeño': ('body_type', 'body_type'),
            'Sedán': ('body_type', 'body_type'),
            'Familiar': ('body_type', 'body_type'),
            'plazas': ('seats', lambda x: int(x.split()[0])),
            'puertas': ('doors', lambda x: int(x.split()[0])),
            'Diésel': ('fuel', 'fuel'),
            'Gasolina': ('fuel', 'fuel'),
            'caballos': ('power', lambda x: int(x.split()[0])),
            'Manual': ('transmission', 'transmission'),
            'Automático': ('transmission', 'transmission'),
            'Marca': ('brand', lambda x: info_list[i+1]),
            'Modelo': ('model', lambda x: info_list[i+1]),
            'Año': ('year', lambda x: int(info_list[i+1])),
            'Kilómetros': ('kilometers', lambda x: int(info_list[i+1].replace(".", "")))
        }
        
        for key, (field, processor) in specs_mapping.items():
            if item.endswith(key) or item == key:
                if callable(processor):
                    data['car_specs'][field] = processor(item)
                else:
                    data['car_specs'][field] = item
                    
        # Description - usually the longest text
        if len(item) > 100:
            data['description'] = item
            
        # Stats
        if item.isdigit():
            next_item = info_list[i+1] if i+1 < len(info_list) else None
            if next_item == "views":
                data['stats']['views'] = int(item)
            elif next_item == "favorites":
                data['stats']['favorites'] = int(item)
                
        # Last edited
        if "Editado hace" in item:
            data['last_edited'] = item
            
        # Sustainability info
        if "De media" in item:
            data['sustainability'] = item
            
    return data

def process_detailed_results(input_file='detailed_results.json', output_file='processed_results.json'):
    """Process the entire detailed_results.json file"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    processed_data = {}
    
    for model, model_data in data.items():
        processed_data[model] = {
            'parameters': model_data['parameters'],
            'listings': []
        }
        
        for listing in model_data['listings']:
            processed_listing = {
                'url': listing['url'],
                'images': listing['images'],
                **process_listing_info(listing['info'])
            }
            processed_data[model]['listings'].append(processed_listing)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(processed_data, f, indent=2, ensure_ascii=False)
        
    return processed_data

if __name__ == "__main__":
    processed_data = process_detailed_results()
    print("Processing complete! Data saved to processed_results.json")
    
    # Print some statistics
    for model, data in processed_data.items():
        print(f"\n{model}:")
        print(f"- Total listings: {len(data['listings'])}")
        avg_price = sum(l['price']['amount'] for l in data['listings'] if l['price']['amount']) / len(data['listings'])
        print(f"- Average price: {avg_price:.2f}€")
        avg_km = sum(l['car_specs']['kilometers'] for l in data['listings'] if l['car_specs']['kilometers']) / len(data['listings'])
        print(f"- Average kilometers: {avg_km:.0f}km") 