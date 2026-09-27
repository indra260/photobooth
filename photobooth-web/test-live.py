# Tes jalur kamera pakai fake-webcam Chromium: mode screen -> live -> jepret -> edit.
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4173"
errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(
        channel="chromium",
        headless=True,
        args=["--use-fake-ui-for-media-devices", "--use-fake-device-for-media-devices", "--ignore-gpu-blocklist"],
    )
    page = browser.new_page(viewport={"width": 1280, "height": 900}, permissions=["camera"])
    page.add_init_script("localStorage.setItem('kentamal-seen','1'); localStorage.setItem('kentamal-timer','0')")
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

    page.goto(BASE + "/", wait_until="networkidle")
    page.screenshot(path="shot-landing.png", full_page=False)
    print("✓ screenshot landing")

    # masuk layar mode
    page.get_by_role("button", name="Mulai Jepret").first.click()
    page.wait_for_selector(".mode-screen", timeout=8000)
    page.screenshot(path="shot-mode.png")
    print("✓ layar mode tampil")

    # 1 perangkat -> live
    page.locator(".mode-card").first.click()
    page.wait_for_selector("#cams video", timeout=15000)
    page.wait_for_function("document.querySelector('#cams video').videoWidth > 0", timeout=15000)
    print("✓ kamera live (fake) nyala")

    # pilih timer 1 detik biar cepet, lalu jepret
    page.get_by_role("button", name="1 dtk").click()
    # 4 foto x (1 dtk countdown + 0.45 dtk) ≈ 6 dtk
    page.get_by_role("button", name="Jepret").click()
    page.wait_for_selector("#preview", timeout=40000)
    print("✓ countdown selesai -> masuk studio otomatis")

    # strip ke-render di canvas preview? cek pixel non-blank
    filled = page.evaluate("""() => {
      const cv = document.querySelector('#preview');
      const ctx = cv.getContext('2d');
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let diff = 0;
      for (let i = 0; i < d.length; i += 4000) if (d[i] !== 0) { diff++; }
      return diff > 50;
    }""")
    assert filled, "canvas preview kosong"
    print("✓ strip ter-render di preview")

    page.screenshot(path="shot-studio.png")
    page.get_by_role("tab", name="Unduh").click()
    with page.expect_download(timeout=20000) as dl:
        page.locator(".edit-actions .shutter").click()
    print("✓ simpan dari jalur kamera OK:", dl.value.suggested_filename)

    # tes ?room= auto-join masuk layar mode dengan role guest
    page.goto(BASE + "/?room=K7QX", wait_until="networkidle")
    page.wait_for_selector(".mode-screen", timeout=8000)
    body = page.inner_text("body")
    assert "K7QX" in body, "kode room tidak nampang"
    print("✓ ?room=KODE auto-buka layar mode + kode kebaca")
    page.screenshot(path="shot-room.png")

    real = [e for e in errors if "favicon" not in e and "ERR_" not in e and "peer" not in e.lower() and "websocket" not in e.lower()]
    print("JS errors (non-network):", real if real else "NONE")
    browser.close()
print("LIVE TEST PASS")
