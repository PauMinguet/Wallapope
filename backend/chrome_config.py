from selenium.webdriver.chrome.options import Options

def get_chrome_options():
    """Get Chrome options configured for Render environment"""
    chrome_options = Options()
    
    # Required options for running Chrome in Render
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--disable-software-rasterizer')
    chrome_options.add_argument('--remote-debugging-port=9222')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    # Additional stability options
    chrome_options.add_argument('--disable-extensions')
    chrome_options.add_argument('--disable-setuid-sandbox')
    chrome_options.add_argument('--single-process')
    chrome_options.add_argument('--ignore-certificate-errors')
    
    return chrome_options 