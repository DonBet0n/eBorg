import os
import pytest
from pages import WelcomePage


def test_welcome_screen(driver):
    """Вітальний екран показує назву, слоган і обидві кнопки."""
    page = WelcomePage(driver)
    assert page.has_text("eBorg")
    assert page.find(page.START).is_displayed()
    assert page.find(page.LOGIN).is_displayed()


def test_start_opens_registration(driver):
    """«Почати» відкриває форму реєстрації з полем «Ім'я»."""
    auth = WelcomePage(driver).open_register()
    assert auth.find(auth.NAME).is_displayed()
    assert auth.find(auth.PASSWORD).get_attribute("placeholder") == "Щонайменше 8 символів"


def test_switch_login_and_register(driver):
    """Перемикач «Вхід / Реєстрація» ховає й показує поле «Ім'я»."""
    auth = WelcomePage(driver).open_register()
    auth.switch_to("Вхід")
    assert auth.has_text("Увійти")
    assert not auth.name_fields()
    auth.switch_to("Реєстрація")
    assert auth.find(auth.NAME).is_displayed()


def test_empty_login_form(driver):
    """Порожня форма входу: помилки під обома полями."""
    auth = WelcomePage(driver).open_login()
    auth.submit("Увійти")
    assert auth.has_text("Вкажіть пошту")
    assert auth.has_text("Вкажіть пароль")


def test_invalid_email(driver):
    """Пошта без домену не проходить перевірку."""
    auth = WelcomePage(driver).open_login()
    auth.fill(auth.EMAIL, "olena@gmail")
    auth.fill(auth.PASSWORD, "Qwerty123")
    auth.submit("Увійти")
    assert auth.has_text("Перевірте адресу пошти")


def test_short_password(driver):
    """TC-02 з ЛР № 7: пароль із 7 символів не приймається, із 8 – помилка зникає."""
    auth = WelcomePage(driver).open_register()
    auth.fill(auth.NAME, "Богдан")
    auth.fill(auth.EMAIL, "test.b2@gmail.com")
    auth.fill(auth.PASSWORD, "1234567")
    auth.submit("Створити акаунт")
    assert auth.has_text("Щонайменше 8 символів")
    auth.find(auth.PASSWORD).send_keys("8")
    assert not auth.has_text("Щонайменше 8 символів", timeout=3)


def test_name_too_long(driver):
    """Ім'я з 37 символів не приймається."""
    auth = WelcomePage(driver).open_register()
    auth.fill(auth.NAME, "А" * 37)
    auth.fill(auth.EMAIL, "test.b3@gmail.com")
    auth.fill(auth.PASSWORD, "Qwerty123")
    auth.submit("Створити акаунт")
    assert auth.has_text("Не довше 36 символів")


def test_forgot_password_without_email(driver):
    """«Забули пароль?» без пошти просить її ввести."""
    auth = WelcomePage(driver).open_login()
    auth.click(auth.FORGOT)
    assert auth.has_text("Введіть пошту, і ми надішлемо посилання для зміни пароля")


def test_show_password(driver):
    """Кнопка з оком показує введений пароль."""
    auth = WelcomePage(driver).open_login()
    auth.fill(auth.PASSWORD, "Qwerty123")
    assert auth.find(auth.PASSWORD).get_attribute("type") == "password"
    auth.click(auth.SHOW_PASSWORD)
    assert auth.find(auth.PASSWORD).get_attribute("type") == "text"


@pytest.mark.xfail(reason="API-ключ Firebase обмежено Android-застосунком: з браузера запит блокується "
                          "(auth/requests-from-this-android-client-application-...-are-blocked), "
                          "тому застосунок показує загальне «Не вдалося увійти»", strict=False)
def test_wrong_password(driver):
    """TC-03 з ЛР № 7: вхід з неправильним паролем (запит до Firebase Auth)."""
    auth = WelcomePage(driver).open_login()
    auth.fill(auth.EMAIL, "no.such.user.eborg@example.com")
    auth.fill(auth.PASSWORD, "WrongPass1")
    auth.submit("Увійти")
    assert auth.has_text("Неправильна пошта або пароль")


@pytest.mark.skipif(not os.environ.get("EBORG_EMAIL"), reason="не задано тестовий акаунт EBORG_EMAIL / EBORG_PASSWORD")
def test_successful_login(driver):
    """Успішний вхід відкриває головний екран. Потребує окремого тестового акаунта."""
    auth = WelcomePage(driver).open_login()
    auth.fill(auth.EMAIL, os.environ["EBORG_EMAIL"])
    auth.fill(auth.PASSWORD, os.environ["EBORG_PASSWORD"])
    auth.submit("Увійти")
    assert auth.has_text("Борги", timeout=30) or auth.has_text("Боргів поки немає", timeout=5)
