import os
from dotenv import load_dotenv
from supabase import create_client
import folium
from folium.plugins import HeatMap, MarkerCluster
from collections import defaultdict

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise Exception("Missing Supabase credentials in .env file")

supabase = create_client(supabase_url, supabase_key)

def fetch_quick_searches():
    """Fetch all quick searches with location data"""
    response = supabase.table('quick_searches')\
        .select('*')\
        .execute()
    
    # Filter out entries with no location in Python
    return [search for search in response.data if search.get('location') is not None]

def create_map(searches):
    """Create a map with markers for each search location"""
    # Create a map centered on Spain
    m = folium.Map(
        location=[40.4637, -3.7492],  # Madrid coordinates
        zoom_start=6,
        tiles='cartodbdark_matter'  # Dark theme to match your app
    )

    # Create a marker cluster group
    marker_cluster = MarkerCluster(name="Search Locations")
    
    # Create a dict to store searches by model
    searches_by_model = defaultdict(list)
    
    # Prepare data for heatmap
    heatmap_data = []
    
    for search in searches:
        if not search['location']:
            continue
            
        lat = search['location']['latitude']
        lng = search['location']['longitude']
        model = search['selected_model']
        year_range = search['selected_year_range']
        results = search['results_count']
        
        # Add to heatmap data
        heatmap_data.append([lat, lng, min(results / 100, 1)])  # Normalize weight
        
        # Add to model-specific list
        searches_by_model[model].append({
            'location': [lat, lng],
            'year_range': year_range,
            'results': results
        })
        
        # Create popup content
        popup_content = f"""
        <div style="font-family: Arial, sans-serif;">
            <h4>{model}</h4>
            <p><b>Year Range:</b> {year_range}</p>
            <p><b>Results Found:</b> {results}</p>
        </div>
        """
        
        # Add marker to cluster
        folium.Marker(
            location=[lat, lng],
            popup=folium.Popup(popup_content, max_width=300),
            icon=folium.Icon(color='purple', icon='info-sign')
        ).add_to(marker_cluster)
    
    # Add marker cluster to map
    marker_cluster.add_to(m)
    
    # Add heatmap layer
    HeatMap(
        heatmap_data,
        radius=15,
        blur=10,
        max_zoom=13,
        gradient={0.4: 'blue', 0.65: 'purple', 1: 'red'}
    ).add_to(m)
    
    # Add layer control
    folium.LayerControl().add_to(m)
    
    return m

def main():
    # Fetch data
    searches = fetch_quick_searches()
    
    if not searches:
        print("No search data with locations found")
        return
    
    # Create map
    m = create_map(searches)
    
    # Save map
    output_file = "quick_search_map.html"
    m.save(output_file)
    print(f"Map saved to {output_file}")
    
    # Print some statistics
    total_searches = len(searches)
    models = set(search['selected_model'] for search in searches)
    
    print(f"\nStatistics:")
    print(f"Total searches with location data: {total_searches}")
    print(f"Unique car models searched: {len(models)}")
    print("\nMost searched models:")
    
    model_counts = defaultdict(int)
    for search in searches:
        model_counts[search['selected_model']] += 1
    
    for model, count in sorted(model_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"- {model}: {count} searches")

if __name__ == "__main__":
    main() 