from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
import platform
import logging
import subprocess
import os

logger = logging.getLogger(__name__)

def get_chrome_options():
    """Get Chrome options configured for local/Render environment"""
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
    
    # Set user agent
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    return chrome_options

def get_chromedriver_path():
    """Get the ChromeDriver path based on the platform"""
    if platform.system() == "Darwin":  # macOS
        # Check if M1/M2 Mac
        if platform.machine() == 'arm64':
            # Try to get ChromeDriver path from Homebrew
            try:
                result = subprocess.run(['brew', '--prefix'], capture_output=True, text=True)
                if result.returncode == 0:
                    brew_prefix = result.stdout.strip()
                    return os.path.join(brew_prefix, 'bin', 'chromedriver')
            except:
                pass
        return "/usr/local/bin/chromedriver"
    else:
        return "/usr/bin/chromedriver"

def get_chrome_service():
    """Get ChromeDriver service"""
    try:
        driver_path = get_chromedriver_path()
        logger.info(f"Using ChromeDriver from: {driver_path}")
        return Service(driver_path)
    except Exception as e:
        logger.error(f"Error setting up ChromeDriver service: {str(e)}")
        raise 