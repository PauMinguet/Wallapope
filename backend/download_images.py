import os
import json
import requests
from datetime import datetime
import concurrent.futures

def download_image(url: str, save_path: str) -> bool:
    """Download a single image from URL"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        with open(save_path, 'wb') as f:
            f.write(response.content)
        return True
    except Exception as e:
        print(f"Error downloading {url}: {str(e)}")
        return False

def download_listing_images(detailed_file: str, output_dir: str = "images"):
    """Download all images from a detailed results file"""
    try:
        # Load detailed results
        with open(detailed_file, 'r', encoding='utf-8') as f:
            results = json.load(f)
            
        # Create base output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Create timestamp for this batch
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        total_downloaded = 0
        failed_downloads = 0
        
        # Process each request
        for request_id, data in results.items():
            # Create directory for this request
            request_dir = os.path.join(output_dir, f"{request_id}_{timestamp}")
            os.makedirs(request_dir, exist_ok=True)
            
            print(f"\nProcessing request {request_id}")
            print(f"Car: {data['request']['marca']} {data['request']['modelo']}")
            
            # Process each listing
            for i, listing in enumerate(data['listings']):
                # Create directory for this listing
                listing_dir = os.path.join(request_dir, f"listing_{i+1}")
                os.makedirs(listing_dir, exist_ok=True)
                
                # Get unique image URLs (excluding thumbnails)
                image_urls = set()
                for url in listing.get('images', []):
                    # Only keep the highest resolution version
                    if '?pictureSize=W640' in url:
                        image_urls.add(url)
                
                print(f"\nDownloading {len(image_urls)} images for listing {i+1}")
                
                # Download images in parallel
                with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                    futures = []
                    
                    for j, url in enumerate(image_urls):
                        # Create filename from URL
                        filename = f"image_{j+1}.jpg"
                        save_path = os.path.join(listing_dir, filename)
                        
                        # Submit download task
                        future = executor.submit(download_image, url, save_path)
                        futures.append(future)
                    
                    # Wait for all downloads to complete
                    for future in concurrent.futures.as_completed(futures):
                        if future.result():
                            total_downloaded += 1
                        else:
                            failed_downloads += 1
        
        print(f"\nDownload complete!")
        print(f"Total images downloaded: {total_downloaded}")
        print(f"Failed downloads: {failed_downloads}")
        print(f"Images saved in: {output_dir}")
        
    except Exception as e:
        print(f"Error processing detailed file: {str(e)}")

if __name__ == "__main__":
    # Get all detailed_*.json files in current directory
    detailed_files = [f for f in os.listdir('.') if f.startswith('detailed') and f.endswith('.json')]
    
    if not detailed_files:
        print("No detailed results files found")
    else:
        print("Found the following detailed results files:")
        for i, file in enumerate(detailed_files, 1):
            print(f"{i}. {file}")
        
        if len(detailed_files) == 1:
            file_to_process = detailed_files[0]
        else:
            while True:
                try:
                    choice = int(input("\nEnter the number of the file to process: "))
                    if 1 <= choice <= len(detailed_files):
                        file_to_process = detailed_files[choice-1]
                        break
                    else:
                        print("Invalid choice. Please try again.")
                except ValueError:
                    print("Please enter a number.")
        
        print(f"\nProcessing {file_to_process}")
        download_listing_images(file_to_process) 