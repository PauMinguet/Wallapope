import requests
import time

def test_local_setup():
    base_url = "http://localhost:8000"
    
    # Reset any stale search state first
    print("Resetting search state...")
    response = requests.post(f"{base_url}/reset")
    print(f"Reset Status: {response.status_code}")
    print(f"Reset Response: {response.json()}")
    
    # Test basic connectivity
    print("\nTesting API connection...")
    response = requests.get(f"{base_url}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Start a search
    print("\nStarting search...")
    response = requests.post(f"{base_url}/run-searches")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.json().get('status') == 'error':
        print("Error starting search. Resetting and trying again...")
        requests.post(f"{base_url}/reset")
        time.sleep(2)
        response = requests.post(f"{base_url}/run-searches")
        print(f"Retry Status: {response.status_code}")
        print(f"Retry Response: {response.json()}")
    
    # Monitor progress
    print("\nMonitoring progress...")
    for _ in range(10):  # Check status for 5 minutes
        response = requests.get(f"{base_url}/status")
        status = response.json()
        print(f"Search in progress: {status['search_in_progress']}")
        
        # Get logs
        logs = requests.get(f"{base_url}/logs").json()
        if logs.get('logs'):
            print("\nLatest logs:")
            for log in logs['logs'][-5:]:
                print(log.strip())
        
        if not status['search_in_progress']:
            print("\nSearch completed!")
            break
            
        time.sleep(30)
    
    # Get final stats
    print("\nFinal stats:")
    response = requests.get(f"{base_url}/stats")
    print(response.json())

if __name__ == "__main__":
    test_local_setup() 