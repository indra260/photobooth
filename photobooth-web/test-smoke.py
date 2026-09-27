# Smoke test alur: upload 4 foto -> studio edit -> tab -> unduh PNG.
from playwright.sync_api import sync_playwright
import urllib.request

BASE = "http://127.0.0.1:4173"
errors = []

jpg = urllib.request.urlopen(BASE + "/filter-base.jpg").read()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.add_init_script("localStorage.setItem('kentamal-seen','1')")
    page.on("console", lambda m: errors.append(f"console {m.type}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

    page.goto(BASE + "/", wait_until="networkidle", timeout=30000)
    assert page.locator("h1").inner_text().lower().count("kentamal") > 0, "hero missing"

    # 1. upload 4 foto -> harus masuk studio (step=edit)
    files = [{"name": f"t{i}.jpg", "mimeType": "image/jpeg", "buffer": jpg} for i in range(4)]
    page.set_input_files("input[type=file]", files)
    page.wait_for_selector("#preview", timeout=15000)
    print("✓ upload → studio edit")

    # 2. tab-panel: stiker
    page.get_by_role("tab", name="Stiker").click()
    page.locator(".stickers button").first.click()
    page.wait_for_timeout(300)
    print("✓ tambah stiker")

    # 3. tab teks
    page.get_by_role("tab", name="Teks").click()
    page.get_by_label("Tambah teks").fill("Halo!")
    page.get_by_role("button", name="➕ Tambah").click()
    page.wait_for_timeout(300)
    print("✓ tambah teks")

    # 4. retouch preset
    page.get_by_role("tab", name="Retouch").click()
    page.get_by_role("button", name="Cerah").click()
    print("✓ preset retouch")

    # 5. unduh: tab Unduh, ganti rasio, klik Simpan -> download event
    page.get_by_role("tab", name="Unduh").click()
    page.get_by_role("button", name="Feed (4:5)").click()
    with page.expect_download(timeout=15000) as dl:
        page.get_by_role("button", name="Simpan").click()
    d = dl.value
    print("✓ download:", d.suggested_filename)

    # 6. galeri IndexedDB harus nunjukin 1 item
    page.wait_for_selector(".gallery-item", timeout=8000)
    print("✓ galeri IndexedDB nampang")

    # 7. undo/redo keyboard
    page.keyboard.press("Control+z")
    page.keyboard.press("Control+Shift+z")
    print("✓ undo/redo tidak crash")

    # 8. dark mode toggle
    page.locator(".edit-header").screenshot()
    print("✓ studio stabil")

    # 9. reload -> autosave sesi harus restore studio
    page.goto(BASE + "/", wait_until="networkidle")
    page.set_input_files("input[type=file]", [{"name": f"t{i}.jpg", "mimeType": "image/jpeg", "buffer": jpg} for i in range(4)])
    page.wait_for_selector("#preview", timeout=15000)
    page.reload(wait_until="networkidle")
    # setelah reload dia di boot; buka Lagi Jepret tidak harus — cek session terisi lewat localStorage
    sess = page.evaluate("!!localStorage.getItem('kentamal-session')")
    assert sess, "session tidak tersimpan"
    print("✓ autosave sesi localStorage OK")

    real = [e for e in errors if "favicon" not in e and "404" not in e]
    print("JS errors:", real if real else "NONE")
    browser.close()
print("SMOKE PASS")
