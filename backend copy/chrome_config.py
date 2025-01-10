from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
import platform
import logging
import subprocess
import os
import time

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
    chrome_options.add_argument('--remote-debugging-port=9222')  # Add debugging port
    chrome_options.add_argument('--disable-software-rasterizer')
    
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
    """Get ChromeDriver service with retry mechanism"""
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            driver_path = get_chromedriver_path()
            logger.info(f"Using ChromeDriver from: {driver_path}")
            
            # Verify ChromeDriver exists and is executable
            if not os.path.exists(driver_path):
                raise FileNotFoundError(f"ChromeDriver not found at {driver_path}")
                
            if not os.access(driver_path, os.X_OK):
                logger.warning(f"ChromeDriver at {driver_path} is not executable. Attempting to fix...")
                os.chmod(driver_path, 0o755)
            
            service = Service(driver_path)
            return service
            
        except Exception as e:
            logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay * (2 ** attempt))  # Exponential backoff
            else:
                raise 