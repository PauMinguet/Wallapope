import streamlit as st
import json
from PIL import Image
import requests
from io import BytesIO

def load_data():
    with open('detailed_search_results.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_car_info(title):
    """Extract structured information from the listing title"""
    lines = title.split('\n')
    info = {
        'price': lines[1] if len(lines) > 1 else '',
        'model_year': lines[2] if len(lines) > 2 else '',
        'fuel': lines[3] if len(lines) > 3 else '',
        'transmission': lines[4] if len(lines) > 4 else '',
        'power': lines[5] if len(lines) > 5 else '',
        'year': lines[6] if len(lines) > 6 else '',
        'km': lines[7] if len(lines) > 7 else '',
        'description': lines[8] if len(lines) > 8 else ''
    }
    return info

def main():
    st.set_page_config(layout="wide", page_title="Car Listings Viewer")
    
    # Custom CSS for better card styling
    st.markdown("""
        <style>
        .stImage {
            border-radius: 10px;
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Load data
    data = load_data()
    
    # Create two columns for the listings
    left_col, right_col = st.columns(2)
    
    # Get all listings from all searches
    all_listings = []
    for search in data:
        all_listings.extend(search['listings'])
    
    # Split listings between columns
    for idx, listing in enumerate(all_listings):
        col = left_col if idx % 2 == 0 else right_col
        
        with col:
            # Create a card-like container
            st.markdown('<div class="listing-card">', unsafe_allow_html=True)
            
            # Display image
            if listing['images']:
                try:
                    response = requests.get(listing['images'][0])
                    img = Image.open(BytesIO(response.content))
                    st.image(img, use_container_width=True)
                except:
                    st.error("Could not load image")
            
            # Extract and display car information
            info = extract_car_info(listing['title'])
            
            # Price in large text
            st.markdown(f"### {info['price']}")
            
            # Car details in two columns
            specs_col1, specs_col2 = st.columns(2)
            with specs_col1:
                st.write(f"📅 {info['year']}")
                st.write(f"⚡ {info['power']}")
                st.write(f"⛽ {info['fuel']}")
            
            with specs_col2:
                st.write(f"🛣️ {info['km']}")
                st.write(f"🔄 {info['transmission']}")
            
            # Description
            st.markdown('<div class="description">', unsafe_allow_html=True)
            st.write(info['description'] if info['description'] else "No description available")
            st.markdown('</div>', unsafe_allow_html=True)
            
            # Link to listing
            st.markdown(f"[View on Wallapop]({listing['url']})")
            
            st.markdown('</div>', unsafe_allow_html=True)

if __name__ == "__main__":
    main() 