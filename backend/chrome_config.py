from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
import platform
import logging
import os
import time

logger = logging.getLogger(__name__)

def get_chrome_options():
    """Get Chrome options configured for Render environment"""
    chrome_options = Options()
    
    # Basic required options
    chrome_options.add_argument('--headless=new')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    
    # Additional stability options
    chrome_options.add_argument('--disable-extensions')
    chrome_options.add_argument('--disable-setuid-sandbox')
    chrome_options.add_argument('--disable-web-security')
    chrome_options.add_argument('--ignore-certificate-errors')
    
    # Connection stability
    chrome_options.add_argument('--disable-background-networking')
    chrome_options.add_argument('--disable-background-timer-throttling')
    chrome_options.add_argument('--disable-backgrounding-occluded-windows')
    chrome_options.add_argument('--disable-breakpad')
    chrome_options.add_argument('--disable-client-side-phishing-detection')
    chrome_options.add_argument('--disable-default-apps')
    chrome_options.add_argument('--disable-hang-monitor')
    chrome_options.add_argument('--disable-popup-blocking')
    chrome_options.add_argument('--disable-prompt-on-repost')
    chrome_options.add_argument('--disable-sync')
    chrome_options.add_argument('--force-color-profile=srgb')
    chrome_options.add_argument('--metrics-recording-only')
    chrome_options.add_argument('--no-first-run')
    chrome_options.add_argument('--password-store=basic')
    chrome_options.add_argument('--use-mock-keychain')
    
    # Set user agent
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    return chrome_options

def create_driver():
    """Create a remote WebDriver instance"""
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            options = get_chrome_options()
            capabilities = DesiredCapabilities.CHROME.copy()
            capabilities['goog:chromeOptions'] = options.to_capabilities()['goog:chromeOptions']
            
            # Use remote WebDriver
            driver = webdriver.Remote(
                command_executor='http://chrome:4444/wd/hub',
                options=options
            )
            
            driver.set_page_load_timeout(30)
            return driver
            
        except Exception as e:
            logger.error(f"Attempt {attempt + 1} to create driver failed: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay * (2 ** attempt))
            else:
                raise 