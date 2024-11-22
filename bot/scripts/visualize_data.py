import json
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd

def extract_numeric(value):
    """Extract numeric value from string, handling different formats"""
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(''.join(filter(str.isdigit, str(value))))
    except:
        return None

def load_and_process_data(filename='detailed_results.json'):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    plot_data = []
    
    for model, model_data in data.items():
        for listing in model_data['listings']:
            try:
                # Extract info from the raw info list
                info = listing['info']
                
                # Find price
                price = None
                for item in info:
                    if '€' in item:
                        try:
                            price = float(item.replace('€', '').replace('.', '').replace(',', '.').strip())
                            break
                        except:
                            continue
                
                # Find kilometers
                kms = None
                for i, item in enumerate(info):
                    if item == "Kilómetros":
                        try:
                            kms = float(info[i+1].replace('.', ''))
                            break
                        except:
                            continue
                
                # Find year
                year = None
                for i, item in enumerate(info):
                    if item == "Año":
                        try:
                            year = int(info[i+1])
                            break
                        except:
                            continue
                
                # Find fuel type
                fuel = None
                for item in ["Diésel", "Gasolina", "Híbrido", "Eléctrico"]:
                    if item in info:
                        fuel = item
                        break
                
                # Find power
                power = None
                for item in info:
                    if "caballos" in item:
                        try:
                            power = float(item.split()[0])
                            break
                        except:
                            continue
                
                if price and kms and year:  # Only add if we have the essential data
                    plot_data.append({
                        'model': model,
                        'price': price,
                        'kilometers': kms,
                        'year': year,
                        'fuel': fuel,
                        'power': power
                    })
            except Exception as e:
                print(f"Error processing listing: {str(e)}")
                continue
    
    return pd.DataFrame(plot_data)

def create_plots(df):
    # Set basic style
    plt.style.use('default')
    sns.set_theme(style="whitegrid")
    
    # Create figure with multiple subplots
    fig = plt.figure(figsize=(20, 15))
    
    # 1. Price vs Kilometers scatter plot by model
    plt.subplot(2, 2, 1)
    for model in df['model'].unique():
        model_data = df[df['model'] == model]
        plt.scatter(model_data['kilometers'], 
                   model_data['price'], 
                   label=model, 
                   alpha=0.6,
                   s=100)  # Increased point size
    
    plt.xlabel('Kilometers', fontsize=12)
    plt.ylabel('Price (€)', fontsize=12)
    plt.title('Price vs Kilometers by Model', fontsize=14, pad=20)
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=10)
    
    # 2. Box plot of prices by model
    plt.subplot(2, 2, 2)
    sns.boxplot(data=df, x='model', y='price', palette='Set3')
    plt.xticks(rotation=45)
    plt.xlabel('Model', fontsize=12)
    plt.ylabel('Price (€)', fontsize=12)
    plt.title('Price Distribution by Model', fontsize=14, pad=20)
    
    # 3. Price vs Year scatter plot
    plt.subplot(2, 2, 3)
    for model in df['model'].unique():
        model_data = df[df['model'] == model]
        plt.scatter(model_data['year'], 
                   model_data['price'], 
                   label=model, 
                   alpha=0.6,
                   s=100)
    
    plt.xlabel('Year', fontsize=12)
    plt.ylabel('Price (€)', fontsize=12)
    plt.title('Price vs Year by Model', fontsize=14, pad=20)
    
    # 4. Price vs Kilometers with regression lines
    plt.subplot(2, 2, 4)
    for model in df['model'].unique():
        model_data = df[df['model'] == model]
        sns.regplot(data=model_data, 
                   x='kilometers', 
                   y='price', 
                   label=model,
                   scatter_kws={'alpha':0.5, 's':100},
                   line_kws={'alpha':0.8})
    
    plt.xlabel('Kilometers', fontsize=12)
    plt.ylabel('Price (€)', fontsize=12)
    plt.title('Price vs Kilometers with Trend Lines', fontsize=14, pad=20)
    
    # Adjust layout and save
    plt.tight_layout()
    plt.savefig('car_analysis.png', dpi=300, bbox_inches='tight')
    
    # Additional plots
    
    # 5. Price distribution by fuel type
    plt.figure(figsize=(12, 8))
    sns.violinplot(data=df, x='model', y='price', hue='fuel', palette='Set3')
    plt.xticks(rotation=45)
    plt.title('Price Distribution by Model and Fuel Type', fontsize=14, pad=20)
    plt.xlabel('Model', fontsize=12)
    plt.ylabel('Price (€)', fontsize=12)
    plt.tight_layout()
    plt.savefig('price_by_fuel.png', dpi=300, bbox_inches='tight')
    
    # 6. Correlation heatmap
    plt.figure(figsize=(10, 8))
    numeric_cols = ['price', 'kilometers', 'year', 'power']
    sns.heatmap(df[numeric_cols].corr(), annot=True, cmap='coolwarm', fmt='.2f', square=True)
    plt.title('Correlation Matrix', fontsize=14, pad=20)
    plt.tight_layout()
    plt.savefig('correlation_matrix.png', dpi=300, bbox_inches='tight')
    
    # Print statistics
    print("\nSummary Statistics:")
    print("\nAverage Price by Model:")
    print(df.groupby('model')['price'].mean().round(2))
    
    print("\nAverage Kilometers by Model:")
    print(df.groupby('model')['kilometers'].mean().round(2))
    
    print("\nNumber of Listings by Model:")
    print(df['model'].value_counts())

if __name__ == "__main__":
    # Load and process data
    df = load_and_process_data()
    
    # Create visualizations
    create_plots(df)
    
    print("\nVisualization complete! Check car_analysis.png, price_by_fuel.png, and correlation_matrix.png") 