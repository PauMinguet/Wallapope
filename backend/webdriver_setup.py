from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

def get_chrome_driver():
    # Set up Chrome options
    options = Options()
    options.add_argument('--headless')  # Run in headless mode
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    # Set up service with direct path to chromedriver
    service = Service('/usr/local/bin/chromedriver')  # This is the default path when installed via brew
    
    # Create and return the Chrome driver
    return webdriver.Chrome(service=service, options=options)