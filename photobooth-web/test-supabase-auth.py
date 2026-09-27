from playwright.sync_api import sync_playwright

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.add_init_script("localStorage.setItem('kentamal-seen', '1')")
    page.on("console", lambda msg: errors.append(f"console {msg.type}: {msg.text}") if msg.type == "error" and "status of 400" not in msg.text else None)
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    response = page.goto("http://127.0.0.1:5173/", wait_until="networkidle", timeout=30000)
    assert response and response.status == 200, f"HTTP {response.status if response else 'none'}"
    assert page.get_by_role("heading", name="Masuk Kentamal").count() == 0
    page.get_by_role("banner").get_by_role("button", name="Masuk", exact=True).click()
    heading = page.locator("main.jp-page h1")
    heading.wait_for()
    assert "Masuk" in heading.inner_text() and "Kentamal" in heading.inner_text()
    assert page.get_by_label("Email").is_visible()
    assert page.get_by_label("Kata Sandi").is_visible()
    page.get_by_label("Email").fill("invalid@example.com")
    page.get_by_label("Kata Sandi").fill("wrong-password-for-test")
    page.get_by_role("main").get_by_role("button", name="Masuk", exact=True).click()
    page.get_by_text("Email atau kata sandi salah.").wait_for(timeout=15000)
    assert page.get_by_text("Email atau kata sandi salah.").is_visible()
    bg = page.locator(".login-card input").first.evaluate("el => getComputedStyle(el).backgroundColor")
    page.get_by_role("button", name="Mode gelap").click()
    bg_dark = page.locator(".login-card input").first.evaluate("el => getComputedStyle(el).backgroundColor")
    assert bg != bg_dark, (bg, bg_dark)
    assert not errors, errors
    print("Playwright: page 200, login form, Supabase invalid-login response, dark-mode inputs all verified")
    browser.close()
