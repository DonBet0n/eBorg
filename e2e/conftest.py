import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE_URL = os.environ.get("EBORG_URL", "http://localhost:8081")
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")


@pytest.fixture
def driver():
    opts = Options()
    if os.environ.get("HEADLESS", "1") == "1":
        opts.add_argument("--headless=new")
    # Розмір вікна як у телефона: інтерфейс eBorg розрахований на мобільний екран
    opts.add_argument("--window-size=430,900")
    opts.add_argument("--lang=uk")
    drv = webdriver.Chrome(options=opts)
    drv.get(BASE_URL)
    yield drv
    drv.quit()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    # Знімок екрана після кожного тесту (SCREENSHOTS=1) або лише після проваленого
    if report.when == "call" and (report.failed or os.environ.get("SCREENSHOTS") == "1"):
        drv = item.funcargs.get("driver")
        if drv:
            os.makedirs(SCREENSHOT_DIR, exist_ok=True)
            drv.save_screenshot(os.path.join(SCREENSHOT_DIR, f"{item.name}.png"))
