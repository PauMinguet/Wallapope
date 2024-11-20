import streamlit as st
import json
import webbrowser
from main import get_search_results
import folium
from streamlit_folium import st_folium

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

    # Create two columns: one narrow for search/map, one wide for results
    left_col, right_col = st.columns([1, 3])
    
    with left_col:
        # Search controls in vertical layout with visible labels
        st.markdown("##### Search Term")
        keywords = st.text_input("Search term", value="coche", label_visibility="collapsed")
        
        st.markdown("##### Max Distance")
        distance = st.number_input(
            "Distance",
            value=100,
            min_value=1,
            max_value=500,
            label_visibility="collapsed"
        ) * 1000
        
        # Price filters with labels
        st.markdown("##### Price Range")
        price_cols = st.columns(2)
        with price_cols[0]:
            st.markdown("Min €")
            min_price = st.number_input("Min price", value=0, step=1000, label_visibility="collapsed")
        with price_cols[1]:
            st.markdown("Max €")
            max_price = st.number_input("Max price", value=1000000, step=1000, label_visibility="collapsed")
        
        st.markdown("##### Location")
        # Small map
        if 'marker_position' not in st.session_state:
            st.session_state.marker_position = [41.224151, 1.7255678]
        
        m = folium.Map(location=st.session_state.marker_position, zoom_start=10)
        
        folium.Marker(
            st.session_state.marker_position,
            popup="Search location",
            icon=folium.Icon(color='red', icon='info-sign')
        ).add_to(m)
        
        map_data = st_folium(
            m,
            height=200,
            width=None,
            key="map",
            returned_objects=["last_clicked"],
            use_container_width=True
        )
        
        if map_data['last_clicked']:
            st.session_state.marker_position = [
                map_data['last_clicked']['lat'],
                map_data['last_clicked']['lng']
            ]
        
        latitude = st.session_state.marker_position[0]
        longitude = st.session_state.marker_position[1]

        search_button = st.button("🔍 Search", use_container_width=True)

    with right_col:
        # Handle search
        if search_button:
            try:
                with st.spinner("Searching..."):
                    results = get_search_results(
                        keywords=keywords,
                        latitude=latitude,
                        longitude=longitude,
                        distance=distance,
                        min_price=min_price,
                        max_price=max_price
                    )
                if not results:
                    st.warning("No results found.")
            except Exception as e:
                st.error(f"Error during search: {str(e)}")

        # Load and display results
        results = load_results()
        
        # Filter results
        filtered_results = [
            r for r in results 
            if r.get('price') is not None 
            and min_price <= r['price'] <= max_price
        ]

        if filtered_results:
            st.write(f"Found {len(filtered_results)} results")

            # Display results in a grid
            cols = st.columns(3)
            for idx, item in enumerate(filtered_results):
                with cols[idx % 3]:
                    st.markdown("""
                        <style>
                        .stImage {
                            margin-bottom: 0.5rem;
                        }
                        .product-card {
                            border: 1px solid rgba(49, 51, 63, 0.2);
                            padding: 10px;
                            border-radius: 5px;
                            margin-bottom: 20px;
                        }
                        .product-card:hover {
                            border-color: rgba(49, 51, 63, 0.4);
                            box-shadow: 0 2px 4px rgba(49, 51, 63, 0.1);
                        }
                        .price-tag {
                            color: #2e7d32;
                            font-size: 1.5em;
                            font-weight: bold;
                            margin-top: 0.5rem;
                        }
                        .featured-badge {
                            background-color: #ffd700;
                            padding: 2px 8px;
                            border-radius: 12px;
                            font-size: 0.8em;
                        }
                        </style>
                    """, unsafe_allow_html=True)
                    
                    # Start product card
                    st.markdown('<div class="product-card">', unsafe_allow_html=True)
                    
                    if item['image_url']:
                        st.image(
                            item['image_url'],
                            use_container_width=True,
                            caption=item['title']
                        )
                    
                    price_str = item['price_raw'] if item['price_raw'] else 'Price not available'
                    st.markdown(f'<div class="price-tag">{price_str}</div>', unsafe_allow_html=True)
                    st.markdown(f"**{item['title']}**")
                    
                    if item.get('location'):
                        st.markdown(f"📍 {item['location']}")
                    
                    if item.get('highlighted'):
                        st.markdown('<span class="featured-badge">🌟 Featured</span>', unsafe_allow_html=True)
                    
                    if st.button("View Details 🔗", key=f"btn_{idx}"):
                        webbrowser.open_new_tab(item['url'])
                    
                    # End product card
                    st.markdown('</div>', unsafe_allow_html=True)

if __name__ == "__main__":
    main()