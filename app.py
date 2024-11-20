import streamlit as st
import json
import webbrowser
from main import get_search_results

def load_results():
    try:
        with open('search_results.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def main():
    st.set_page_config(
        page_title="Wallapop Car Search",
        page_icon="🚗",
        layout="wide"
    )

    st.title("🚗 Wallapop Car Search")

    # Search controls
    col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
    with col1:
        keywords = st.text_input("Search", value="coche")
    with col2:
        latitude = st.number_input("Latitude", value=41.224151)
    with col3:
        longitude = st.number_input("Longitude", value=1.7255678)
    with col4:
        distance = st.number_input("Distance (km)", value=100) * 1000

    if st.button("Search"):
        with st.spinner("Searching..."):
            get_search_results(keywords, latitude, longitude, distance)
        st.success("Search completed!")
        st.rerun()

    # Load and display results
    results = load_results()
    
    # Filters
    col1, col2 = st.columns(2)
    with col1:
        min_price = st.number_input("Min Price", value=0)
    with col2:
        max_price = st.number_input("Max Price", value=1000000)

    # Filter results
    filtered_results = [
        r for r in results 
        if r.get('price') is not None 
        and min_price <= r['price'] <= max_price
    ]

    st.write(f"Found {len(filtered_results)} cars")

    # Display results in a grid
    cols = st.columns(3)
    for idx, item in enumerate(filtered_results):
        with cols[idx % 3]:
            # Create a card-like container
            with st.container():
                st.markdown("""
                    <style>
                    .car-card {
                        border: 1px solid #ddd;
                        padding: 10px;
                        border-radius: 5px;
                        margin-bottom: 20px;
                    }
                    </style>
                """, unsafe_allow_html=True)
                
                st.markdown('<div class="car-card">', unsafe_allow_html=True)
                
                # Image with click handler
                if item['image_url']:
                    st.image(
                        item['image_url'],
                        use_container_width=True,
                        caption=item['title']
                    )
                
                # Price and title
                price_str = item['price_raw'] if item['price_raw'] else 'Price not available'
                st.markdown(f"### {price_str}")
                st.markdown(f"**{item['title']}**")
                
                # Location if available
                if item.get('location'):
                    st.markdown(f"📍 {item['location']}")
                
                # Highlighted badge
                if item.get('highlighted'):
                    st.markdown("🌟 **Featured**")
                
                # Link button
                if st.button("View Details", key=f"btn_{idx}"):
                    webbrowser.open_new_tab(item['url'])
                
                st.markdown('</div>', unsafe_allow_html=True)

if __name__ == "__main__":
    main() 