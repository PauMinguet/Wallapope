import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from ast import literal_eval
import numpy as np
from pathlib import Path
import csv
from datetime import datetime

def load_latest_analysis():
    """Load the most recent price analysis CSV file"""
    csv_files = list(Path('.').glob('car_price_analysis_*.csv'))
    if not csv_files:
        raise FileNotFoundError("No analysis files found")
    
    latest_file = max(csv_files, key=lambda x: x.stat().st_mtime)
    print(f"Loading {latest_file}")
    return pd.read_csv(latest_file)

def clean_price_data(df):
    """Clean and prepare the price data"""
    # Convert string representations of lists to actual lists
    for col in ['Regular Search Prices (Low to High)', 'Relevance Search Prices', 'Flexicar Search Prices']:
        df[col] = df[col].apply(lambda x: literal_eval(x) if isinstance(x, str) and x.startswith('[') else [])
    
    return df

def plot_price_distributions(df):
    """Plot price distributions for each search type"""
    plt.figure(figsize=(15, 8))
    
    # Prepare data
    regular_prices = [price for prices in df['Regular Search Prices (Low to High)'] for price in prices]
    relevance_prices = [price for prices in df['Relevance Search Prices'] for price in prices]
    flexicar_prices = [price for prices in df['Flexicar Search Prices'] for price in prices]
    
    # Create violin plots
    data = [regular_prices, relevance_prices, flexicar_prices]
    labels = ['Regular', 'Relevance', 'Flexicar']
    
    sns.violinplot(data=data)
    plt.xticks(range(len(labels)), labels)
    plt.title('Price Distribution by Search Type')
    plt.ylabel('Price (€)')
    plt.savefig('price_distributions.png')
    plt.close()

def plot_price_gaps(df):
    """Plot price gaps between target and actual prices"""
    plt.figure(figsize=(15, 8))
    
    for idx, row in df.iterrows():
        target_avg = (row['Target Min Price'] + row['Target Max Price']) / 2
        regular_prices = row['Regular Search Prices (Low to High)']
        
        if regular_prices:
            actual_avg = np.mean(regular_prices)
            price_gap = target_avg - actual_avg
            
            plt.scatter(target_avg, price_gap, alpha=0.6)
            if abs(price_gap) > target_avg * 0.2:  # Highlight big gaps
                plt.annotate(f"{row['Brand']} {row['Model']}", 
                           (target_avg, price_gap),
                           xytext=(5, 5), textcoords='offset points')
    
    plt.axhline(y=0, color='r', linestyle='--', alpha=0.3)
    plt.title('Price Gaps: Target vs Actual Average Prices')
    plt.xlabel('Target Average Price (€)')
    plt.ylabel('Price Gap (Target - Actual) (€)')
    plt.savefig('price_gaps.png')
    plt.close()

def plot_opportunity_matrix(df):
    """Plot opportunity matrix based on price gap and listing count"""
    plt.figure(figsize=(12, 8))
    
    x_data = []  # Price gaps percentage
    y_data = []  # Number of listings
    sizes = []   # Market size (target price)
    labels = []  # Car models
    
    for idx, row in df.iterrows():
        target_avg = (row['Target Min Price'] + row['Target Max Price']) / 2
        regular_prices = row['Regular Search Prices (Low to High)']
        
        if regular_prices:
            actual_avg = np.mean(regular_prices)
            price_gap_pct = ((target_avg - actual_avg) / target_avg) * 100
            listing_count = len(regular_prices)
            
            x_data.append(price_gap_pct)
            y_data.append(listing_count)
            sizes.append(target_avg / 500)  # Scale down for better visualization
            labels.append(f"{row['Brand']} {row['Model']}")
    
    scatter = plt.scatter(x_data, y_data, s=sizes, alpha=0.6)
    
    # Annotate points with high opportunity
    for i, (x, y, label) in enumerate(zip(x_data, y_data, labels)):
        if x > 10 and y < np.median(y_data):  # High gap, lower competition
            plt.annotate(label, (x, y), xytext=(5, 5), textcoords='offset points')
    
    plt.axvline(x=0, color='r', linestyle='--', alpha=0.3)
    plt.title('Market Opportunity Matrix')
    plt.xlabel('Price Gap % (Positive = Potential Profit)')
    plt.ylabel('Number of Listings (Competition)')
    plt.savefig('opportunity_matrix.png')
    plt.close()

def plot_engine_type_analysis(df):
    """Plot price analysis by engine type"""
    plt.figure(figsize=(12, 8))
    
    engine_data = {}
    for idx, row in df.iterrows():
        engine = row['Engine Type']
        if engine and isinstance(engine, str):
            if engine not in engine_data:
                engine_data[engine] = {'gaps': [], 'prices': []}
            
            target_avg = (row['Target Min Price'] + row['Target Max Price']) / 2
            regular_prices = row['Regular Search Prices (Low to High)']
            
            if regular_prices:
                actual_avg = np.mean(regular_prices)
                gap_pct = ((target_avg - actual_avg) / target_avg) * 100
                engine_data[engine]['gaps'].append(gap_pct)
                engine_data[engine]['prices'].extend(regular_prices)
    
    # Create box plots for price gaps by engine type
    gap_data = [engine_data[engine]['gaps'] for engine in engine_data]
    plt.boxplot(gap_data, labels=engine_data.keys())
    plt.title('Price Gap % Distribution by Engine Type')
    plt.ylabel('Price Gap %')
    plt.xticks(rotation=45)
    plt.savefig('engine_type_analysis.png', bbox_inches='tight')
    plt.close()

def plot_search_type_price_gaps(df):
    """Plot gaps between regular (low to high) prices and other search types"""
    plt.figure(figsize=(15, 10))
    
    data_points = []
    
    for idx, row in df.iterrows():
        regular_prices = row['Regular Search Prices (Low to High)']
        relevance_prices = row['Relevance Search Prices']
        flexicar_prices = row['Flexicar Search Prices']
        
        if regular_prices and (relevance_prices or flexicar_prices):
            regular_avg = np.mean(regular_prices)
            other_avg = np.mean([
                np.mean(relevance_prices) if relevance_prices else regular_avg,
                np.mean(flexicar_prices) if flexicar_prices else regular_avg
            ])
            
            price_gap = other_avg - regular_avg
            gap_percentage = (price_gap / regular_avg) * 100
            
            data_points.append({
                'model': f"{row['Brand']} {row['Model']}",
                'regular_avg': regular_avg,
                'gap_percentage': gap_percentage,
                'listing_count': len(regular_prices)
            })
    
    # Create scatter plot
    x_data = [p['regular_avg'] for p in data_points]
    y_data = [p['gap_percentage'] for p in data_points]
    sizes = [p['listing_count'] * 20 for p in data_points]  # Scale dot size by listing count
    
    plt.scatter(x_data, y_data, s=sizes, alpha=0.6)
    
    # Annotate points with significant gaps
    for point in data_points:
        if abs(point['gap_percentage']) > 15:  # Highlight gaps larger than 15%
            plt.annotate(
                point['model'],
                (point['regular_avg'], point['gap_percentage']),
                xytext=(5, 5),
                textcoords='offset points',
                fontsize=8
            )
    
    plt.axhline(y=0, color='r', linestyle='--', alpha=0.3)
    plt.title('Price Gaps Between Search Types')
    plt.xlabel('Average Price in Regular Search (Low to High) (€)')
    plt.ylabel('Gap % Between Regular and Other Search Types\n(Positive = Other searches more expensive)')
    
    # Add grid for better readability
    plt.grid(True, linestyle='--', alpha=0.3)
    
    # Format axis labels
    plt.gca().get_xaxis().set_major_formatter(
        plt.FuncFormatter(lambda x, p: f'{int(x):,}€')
    )
    plt.gca().get_yaxis().set_major_formatter(
        plt.FuncFormatter(lambda x, p: f'{int(x)}%')
    )
    
    plt.savefig('search_type_gaps.png', bbox_inches='tight', dpi=300)
    plt.close()
    
    # Print top gaps
    print("\nBiggest Price Gaps Between Search Types:")
    sorted_gaps = sorted(data_points, key=lambda x: abs(x['gap_percentage']), reverse=True)
    for point in sorted_gaps[:5]:
        print(
            f"- {point['model']}: "
            f"{point['gap_percentage']:+.1f}% gap "
            f"(Regular: {point['regular_avg']:,.0f}€, "
            f"Listings: {point['listing_count']})"
        )

def generate_roi_rankings(df):
    """Generate CSV with ROI rankings for buy low (regular) sell high (market) strategy"""
    opportunities = []
    
    for idx, row in df.iterrows():
        regular_prices = row['Regular Search Prices (Low to High)']
        relevance_prices = row['Relevance Search Prices']
        flexicar_prices = row['Flexicar Search Prices']
        
        if regular_prices and (relevance_prices or flexicar_prices):
            # Use lowest regular price as buy price
            buy_price = min(regular_prices)
            
            # Use average of relevance and flexicar as market price
            market_prices = []
            if relevance_prices:
                market_prices.extend(relevance_prices)
            if flexicar_prices:
                market_prices.extend(flexicar_prices)
            sell_price = np.mean(market_prices) if market_prices else np.mean(regular_prices)
            
            # Calculate ROI
            potential_profit = sell_price - buy_price
            roi = (potential_profit / buy_price) * 100
            
            opportunities.append({
                'model': f"{row['Brand']} {row['Model']}",
                'buy_price': buy_price,
                'sell_price': sell_price,
                'potential_profit': potential_profit,
                'roi': roi,
                'regular_listings': len(regular_prices),
                'market_listings': len(market_prices),
                'year_range': row['Year Range'],
                'engine_type': row['Engine Type']
            })
    
    # Sort by ROI
    opportunities.sort(key=lambda x: x['roi'], reverse=True)
    
    # Save to CSV
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'roi_rankings_{timestamp}.csv'
    
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            'Model',
            'Year Range',
            'Engine Type',
            'Buy Price (€)',
            'Market Price (€)',
            'Potential Profit (€)',
            'ROI %',
            'Regular Listings',
            'Market Listings'
        ])
        
        for opp in opportunities:
            writer.writerow([
                opp['model'],
                opp['year_range'],
                opp['engine_type'],
                f"{opp['buy_price']:,.0f}",
                f"{opp['sell_price']:,.0f}",
                f"{opp['potential_profit']:,.0f}",
                f"{opp['roi']:.1f}",
                opp['regular_listings'],
                opp['market_listings']
            ])
    
    print(f"\nROI rankings saved to {filename}")
    
    # Print top 5 ROIs
    print("\nTop 5 ROI Opportunities:")
    for opp in opportunities[:5]:
        print(
            f"- {opp['model']} ({opp['year_range']}, {opp['engine_type']}): "
            f"ROI: {opp['roi']:.1f}% "
            f"(Buy: {opp['buy_price']:,.0f}€, Sell: {opp['sell_price']:,.0f}€)"
        )

def generate_capital_gains_rankings(df):
    """Generate CSV with absolute profit rankings"""
    opportunities = []
    
    for idx, row in df.iterrows():
        regular_prices = row['Regular Search Prices (Low to High)']
        relevance_prices = row['Relevance Search Prices']
        flexicar_prices = row['Flexicar Search Prices']
        
        if regular_prices and (relevance_prices or flexicar_prices):
            # Use lowest regular price as buy price
            buy_price = min(regular_prices)
            
            # Use average of relevance and flexicar as market price
            market_prices = []
            if relevance_prices:
                market_prices.extend(relevance_prices)
            if flexicar_prices:
                market_prices.extend(flexicar_prices)
            sell_price = np.mean(market_prices) if market_prices else np.mean(regular_prices)
            
            # Calculate absolute profit
            potential_profit = sell_price - buy_price
            
            opportunities.append({
                'model': f"{row['Brand']} {row['Model']}",
                'buy_price': buy_price,
                'sell_price': sell_price,
                'potential_profit': potential_profit,
                'capital_required': buy_price,
                'regular_listings': len(regular_prices),
                'market_listings': len(market_prices),
                'year_range': row['Year Range'],
                'engine_type': row['Engine Type']
            })
    
    # Sort by absolute profit
    opportunities.sort(key=lambda x: x['potential_profit'], reverse=True)
    
    # Save to CSV
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'capital_gains_rankings_{timestamp}.csv'
    
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            'Model',
            'Year Range',
            'Engine Type',
            'Buy Price (€)',
            'Market Price (€)',
            'Absolute Profit (€)',
            'Capital Required (€)',
            'Regular Listings',
            'Market Listings'
        ])
        
        for opp in opportunities:
            writer.writerow([
                opp['model'],
                opp['year_range'],
                opp['engine_type'],
                f"{opp['buy_price']:,.0f}",
                f"{opp['sell_price']:,.0f}",
                f"{opp['potential_profit']:,.0f}",
                f"{opp['capital_required']:,.0f}",
                opp['regular_listings'],
                opp['market_listings']
            ])
    
    print(f"\nCapital gains rankings saved to {filename}")
    
    # Print top 5 absolute profits
    print("\nTop 5 Absolute Profit Opportunities:")
    for opp in opportunities[:5]:
        print(
            f"- {opp['model']} ({opp['year_range']}, {opp['engine_type']}): "
            f"Profit: {opp['potential_profit']:,.0f}€ "
            f"(Capital needed: {opp['capital_required']:,.0f}€)"
        )

def analyze_market_gaps():
    """Main analysis function"""
    # Load and prepare data
    df = load_latest_analysis()
    df = clean_price_data(df)
    
    # Generate plots
    plot_price_distributions(df)
    plot_price_gaps(df)
    plot_opportunity_matrix(df)
    plot_engine_type_analysis(df)
    plot_search_type_price_gaps(df)
    
    # Generate rankings
    generate_roi_rankings(df)
    generate_capital_gains_rankings(df)
    
    # Print summary insights
    print("\nMarket Analysis Summary:")
    print("-----------------------")
    
    # Calculate and print best opportunities
    opportunities = []
    for idx, row in df.iterrows():
        target_avg = (row['Target Min Price'] + row['Target Max Price']) / 2
        regular_prices = row['Regular Search Prices (Low to High)']
        
        if regular_prices:
            actual_avg = np.mean(regular_prices)
            price_gap = target_avg - actual_avg
            gap_pct = (price_gap / target_avg) * 100
            
            opportunities.append({
                'model': f"{row['Brand']} {row['Model']}",
                'gap_pct': gap_pct,
                'listings': len(regular_prices),
                'target_price': target_avg
            })
    
    # Sort by gap percentage
    opportunities.sort(key=lambda x: x['gap_pct'], reverse=True)
    
    print("\nTop 5 Opportunities (Highest Price Gaps):")
    for opp in opportunities[:5]:
        print(f"- {opp['model']}: {opp['gap_pct']:.1f}% gap, {opp['listings']} listings, Target: {opp['target_price']:.0f}€")

if __name__ == '__main__':
    print("Analyzing market gaps...")
    analyze_market_gaps()
    print("\nAnalysis complete! Check the generated PNG files for visualizations.") 