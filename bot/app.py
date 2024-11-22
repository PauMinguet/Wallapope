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
        page_title="Wallapope",
        page_icon="🚗",
        layout="wide"
    )

    st.title("🚗 Er Wallapope")

    # Create two columns: one narrow for search/map, one wide for results
    left_col, right_col = st.columns([1, 3])
    
    with left_col:
        # Search controls in vertical layout with visible labels
        st.markdown("##### Término de búsqueda")
        keywords = st.text_input("Buscar", value="coche", label_visibility="collapsed")
        
        st.markdown("##### Distancia máxima")
        distance = st.number_input(
            "Distancia",
            value=100,
            min_value=1,
            max_value=500,
            label_visibility="collapsed"
        ) * 1000
        
        # Price filters with labels
        st.markdown("##### Rango de precio")
        price_cols = st.columns(2)
        with price_cols[0]:
            st.markdown("Mínimo €")
            min_price = st.number_input("Precio mínimo", value=0, step=1000, label_visibility="collapsed")
        with price_cols[1]:
            st.markdown("Máximo €")
            max_price = st.number_input("Precio máximo", value=1000000, step=1000, label_visibility="collapsed")
        
        st.markdown("##### Ubicación")
        # Small map
        if 'marker_position' not in st.session_state:
            st.session_state.marker_position = [41.224151, 1.7255678]
        
        m = folium.Map(location=st.session_state.marker_position, zoom_start=10)
        
        folium.Marker(
            st.session_state.marker_position,
            popup="Ubicación de búsqueda",
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

        search_button = st.button("🔍 Buscar", use_container_width=True)

    with right_col:
        # Handle search
        if search_button:
            try:
                with st.spinner("Buscando..."):
                    results = get_search_results(
                        keywords=keywords,
                        latitude=latitude,
                        longitude=longitude,
                        distance=distance,
                        min_price=min_price,
                        max_price=max_price
                    )
                if not results:
                    st.warning("No se encontraron resultados.")
            except Exception as e:
                st.error(f"Error durante la búsqueda: {str(e)}")

        # Load and display results
        results = load_results()
        
        # Filter results
        filtered_results = [
            r for r in results 
            if r.get('price') is not None 
            and min_price <= r['price'] <= max_price
        ]

        if filtered_results:
            st.write(f"Se encontraron {len(filtered_results)} resultados")

            # Display results in a grid
            cols = st.columns(3)
            for idx, item in enumerate(filtered_results):
                with cols[idx % 3]:
                    # Add minimal styling just for price and badge
                    st.markdown("""
                        <style>
                        .price-tag {
                            color: #2e7d32;
                            font-size: 1.5em;
                            font-weight: bold;
                        }
                        .featured-badge {
                            background-color: #ffd700;
                            padding: 2px 8px;
                            border-radius: 12px;
                            font-size: 0.8em;
                        }
                        .stImage img {
                            border-radius: 10px;
                        }
                        </style>
                    """, unsafe_allow_html=True)
                    
                    if item['image_url']:
                        st.image(
                            item['image_url'],
                            use_container_width=True,
                            caption=item['title']
                        )
                    
                    price_str = item['price_raw'] if item['price_raw'] else 'Precio no disponible'
                    st.markdown(f'<div class="price-tag">{price_str}</div>', unsafe_allow_html=True)
                    st.markdown(f"**{item['title']}**")
                    
                    if item.get('location'):
                        st.markdown(f"📍 {item['location']}")
                    
                    if item.get('highlighted'):
                        st.markdown('<span class="featured-badge">🌟 Destacado</span>', unsafe_allow_html=True)
                    
                    # View Details link
                    st.markdown(
                        f'<div style="text-align: center;">'
                        f'<a href="{item["url"]}" target="_blank" '
                        f'style="text-decoration: none; display: inline-block; '
                        f'padding: 0.3rem 1rem; margin-top: 0.5rem; '
                        f'width: 60%; '
                        f'background-color: #ff4b4b; color: white; '
                        f'border-radius: 0.3rem; text-align: center; '
                        f'font-size: 0.9em; '
                        f'font-weight: 500;">'
                        f'Ver Detalles 🔗</a>'
                        f'</div>',
                        unsafe_allow_html=True
                    )

if __name__ == "__main__":
    main()