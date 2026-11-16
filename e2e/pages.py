from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

TIMEOUT = 20


def button(text):
    # react-native-web перетворює TouchableOpacity з accessibilityRole="button" на div[role=button]
    return By.XPATH, f"//*[@role='button'][.//*[normalize-space(text())='{text}'] or normalize-space(text())='{text}']"


def tab(text):
    # Перемикач «Вхід / Реєстрація» має accessibilityRole="tab"
    return By.XPATH, f"//*[@role='tab'][.//*[normalize-space(text())='{text}']]"


def text_node(text):
    return By.XPATH, f"//*[normalize-space(text())=\"{text}\"]"


class BasePage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, TIMEOUT)

    def find(self, locator):
        return self.wait.until(EC.visibility_of_element_located(locator))

    def click(self, locator):
        self.wait.until(EC.element_to_be_clickable(locator)).click()

    def has_text(self, text, timeout=TIMEOUT):
        try:
            WebDriverWait(self.driver, timeout).until(EC.visibility_of_element_located(text_node(text)))
            return True
        except Exception:
            return False


class WelcomePage(BasePage):
    START = button("Почати")
    LOGIN = (By.XPATH, "//*[@role='button'][contains(normalize-space(.), 'Вже маєте акаунт?')]")

    def open_register(self):
        self.click(self.START)
        return AuthPage(self.driver)

    def open_login(self):
        self.click(self.LOGIN)
        return AuthPage(self.driver)


class AuthPage(BasePage):
    NAME = (By.CSS_SELECTOR, "input[aria-label=\"Ім'я\"]")
    EMAIL = (By.CSS_SELECTOR, "input[aria-label='Пошта']")
    PASSWORD = (By.CSS_SELECTOR, "input[aria-label='Пароль']")
    SHOW_PASSWORD = (By.CSS_SELECTOR, "[aria-label='Показати пароль']")
    FORGOT = button("Забули пароль?")
    BACK = (By.CSS_SELECTOR, "[aria-label='Назад']")

    def switch_to(self, mode):
        self.click(tab(mode))

    def fill(self, locator, value):
        field = self.find(locator)
        field.clear()
        field.send_keys(value)

    def submit(self, label):
        self.click(button(label))

    def name_fields(self):
        return self.driver.find_elements(*self.NAME)
