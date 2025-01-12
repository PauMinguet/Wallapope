from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

def get_chrome_options():
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # Run in headless mode
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    return chrome_options

def create_driver():
    """Create a Chrome WebDriver instance"""
    try:
        # Setup Chrome options
        options = get_chrome_options()
        
        # Setup ChromeDriver service
        service = Service(ChromeDriverManager().install())
        
        # Create and return the driver
        driver = webdriver.Chrome(
            service=service,
            options=options
        )
        
        return driver
        
    except Exception as e:
        raise Exception(f"Failed to create Chrome driver: {str(e)}") 