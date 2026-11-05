#!/usr/bin/env python3
"""
Finedine menü sayfasındaki ürünleri ve görsellerini indirir;
her görseli ÜRÜN ADI ile kaydeder ve ZIP yapar.

Kurulum (bir kez):
    pip install playwright
    playwright install chromium

Çalıştırma:
    python menu_gorsel_indir.py
    python menu_gorsel_indir.py --headed        # tarayıcıyı görerek çalıştır
    python menu_gorsel_indir.py --include-categories

Çıktı (varsayılan ./burger-home-menu/):
    gorseller/          -> "Ürün Adı.jpg" ...
    urunler.csv         -> ürün adı, fiyat, görsel adresi, dosya adı
    urunler_gorselleri.zip
    debug/              -> yakalanan JSON yanıtları (eşleşme olmazsa bana gönderin)
"""
import argparse
import csv
import json
import re
import zipfile
from pathlib import Path
from urllib.parse import urljoin, urlparse

from playwright.sync_api import sync_playwright

DEFAULT_URL = "https://qr.finedinemenu.com/burger-home/menu/6708e69f22b51417a3dd866c"

# Menü JSON'undaki "image" alanı GÖRELI bir yoldur ("01IIwqLPy/<uuid>.jpeg").
# Bu yol JSON'un çekildiği API adresine göre çözülür ve 404 verir; görseller
# ayrı bir CDN'de durur:
MEDIA_BASE = "https://media.finedinemenu.com/"
DEFAULT_WIDTH = 1200  # mağaza kartı/hero boyutu; 0 = orijinal boyut

IMAGE_WIDTH = DEFAULT_WIDTH


def media_url(img, width=IMAGE_WIDTH):
    """Göreli menü görsel yolunu gerçek CDN adresine çevirir."""
    if not img:
        return None
    if img.startswith(("http://", "https://")):
        return img
    path = img.lstrip("/")
    if width:
        return f"{MEDIA_BASE}filters:strip_exif()/filters:format(webp)/{width}x0/{path}"
    return f"{MEDIA_BASE}{path}"

NAME_KEYS = ("name", "title", "itemname", "productname", "label")
IMG_KEYS = ("image", "imageurl", "image_url", "img", "photo", "picture",
            "thumbnail", "thumb", "imagepath", "cover", "images", "photos", "media")
PRICE_KEYS = ("price", "baseprice", "unitprice", "amount")
LANGS = ("tr", "tr-TR", "tr_TR", "en")
EXT_BY_CT = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png",
             "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif",
             "image/svg+xml": ".svg"}


# ---------- JSON içinden ürün çıkarma ----------
def to_text(v):
    if isinstance(v, str):
        return v.strip() or None
    if isinstance(v, dict):
        for lang in LANGS:
            x = v.get(lang)
            if isinstance(x, str) and x.strip():
                return x.strip()
        for x in v.values():
            if isinstance(x, str) and x.strip():
                return x.strip()
    return None


def pick(d, keys, extractor):
    lk = {str(k).lower(): v for k, v in d.items()}
    for k in keys:
        if k in lk:
            r = extractor(lk[k])
            if r:
                return r
    return None


def img_text(v):
    if isinstance(v, list) and v:
        v = v[0]
    if isinstance(v, dict):
        v = v.get("url") or v.get("src") or v.get("path")
    if isinstance(v, str) and v.strip() and ("." in v or "/" in v):
        return v.strip()
    return None


def price_text(v):
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return str(v)
    if isinstance(v, str) and v.strip():
        return v.strip()
    return None


def walk(obj, base, out):
    if isinstance(obj, dict):
        name = pick(obj, NAME_KEYS, to_text)
        img = pick(obj, IMG_KEYS, img_text)
        price = pick(obj, PRICE_KEYS, price_text)
        idx = None
        if name and (img or price):
            idx = len(out)
            out.append({"name": name, "price": price or "",
                        "url": media_url(img) or "",
                        "is_category": False})
        before = len(out)
        for v in obj.values():
            if isinstance(v, (dict, list)):
                walk(v, base, out)
        if idx is not None and len(out) > before:
            out[idx]["is_category"] = True  # altında ürünler var -> kategori
    elif isinstance(obj, list):
        for v in obj:
            walk(v, base, out)


# ---------- yardımcılar ----------
def safe_name(name):
    name = re.sub(r'[\\/:*?"<>|\r\n\t]', " ", name)
    name = re.sub(r"\s+", " ", name).strip(" .")
    return (name or "isimsiz")[:120]


def ext_for(content_type, url):
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct in EXT_BY_CT:
        return EXT_BY_CT[ct]
    m = re.search(r"\.(jpe?g|png|webp|gif|avif|svg)(?:\?|$)", urlparse(url).path + "?", re.I)
    if m:
        e = m.group(1).lower()
        return ".jpg" if e == "jpeg" else "." + e
    return ".jpg"


def unique_path(folder, stem, ext):
    p = folder / f"{stem}{ext}"
    i = 2
    while p.exists():
        p = folder / f"{stem} ({i}){ext}"
        i += 1
    return p


DOM_JS = """
() => [...document.images].map(img => {
  let el = img, text = "";
  for (let i = 0; i < 5 && el && !text; i++) {
    el = el.parentElement; if (!el) break;
    const t = (el.innerText || "").split("\\n").map(s => s.trim()).filter(Boolean)[0];
    if (t) text = t;
  }
  return {src: img.currentSrc || img.src, alt: img.alt || "", text};
})
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=DEFAULT_URL)
    ap.add_argument("--out", default="burger-home-menu")
    ap.add_argument("--headed", action="store_true")
    ap.add_argument("--include-categories", action="store_true")
    ap.add_argument("--width", type=int, default=DEFAULT_WIDTH,
                    help="görsel genişliği; 0 = orijinal")
    args = ap.parse_args()

    global IMAGE_WIDTH
    IMAGE_WIDTH = args.width

    out = Path(args.out)
    img_dir, dbg_dir = out / "gorseller", out / "debug"
    img_dir.mkdir(parents=True, exist_ok=True)
    dbg_dir.mkdir(parents=True, exist_ok=True)

    json_responses = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        ctx = browser.new_context(locale="tr-TR", viewport={"width": 430, "height": 900})
        page = ctx.new_page()

        def on_response(resp):
            try:
                ct = resp.headers.get("content-type", "")
                if "json" in ct:
                    json_responses.append((resp.url, resp.json()))
            except Exception:
                pass

        page.on("response", on_response)
        page.goto(args.url, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(2000)
        for _ in range(20):  # lazy-load için kaydır
            page.mouse.wheel(0, 2500)
            page.wait_for_timeout(400)
        page.wait_for_timeout(1500)

        # debug: ham JSON'ları kaydet
        for i, (u, data) in enumerate(json_responses):
            (dbg_dir / f"{i:02d}.json").write_text(
                json.dumps({"url": u, "data": data}, ensure_ascii=False, indent=1),
                encoding="utf-8")

        # 1) JSON'dan ürünleri çıkar
        products = []
        for u, data in json_responses:
            walk(data, u, products)

        # 2) JSON'dan bir şey çıkmazsa DOM'dan dene
        if not any(x["url"] for x in products):
            print("JSON'da eşleşme bulunamadı, sayfa üzerinden okunuyor...")
            products = []
            for item in page.evaluate(DOM_JS):
                src = item["src"]
                nm = item["alt"] or item["text"]
                if src and not src.startswith("data:") and nm:
                    products.append({"name": nm, "price": "", "url": src,
                                     "is_category": False})

        if not args.include_categories:
            products = [x for x in products if not x["is_category"]]

        # tekrarları temizle
        seen, uniq = set(), []
        for x in products:
            key = (x["name"].lower(), x["url"])
            if key not in seen:
                seen.add(key)
                uniq.append(x)
        products = uniq

        # indir
        rows = []
        for x in products:
            fname = ""
            if x["url"]:
                try:
                    r = ctx.request.get(x["url"], headers={"Referer": args.url}, timeout=30000)
                    if r.ok:
                        path = unique_path(img_dir, safe_name(x["name"]),
                                           ext_for(r.headers.get("content-type"), x["url"]))
                        path.write_bytes(r.body())
                        fname = path.name
                        print(f"OK   {fname}")
                    else:
                        print(f"HATA {x['name']} ({r.status})")
                except Exception as e:
                    print(f"HATA {x['name']}: {e}")
            else:
                print(f"GÖRSEL YOK: {x['name']}")
            rows.append([x["name"], x["price"], x["url"], fname])

        browser.close()

    with open(out / "urunler.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Ürün Adı", "Fiyat", "Görsel Adresi", "Dosya Adı"])
        w.writerows(rows)

    zip_path = out / "urunler_gorselleri.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(img_dir.iterdir()):
            z.write(f, f.name)

    ok = sum(1 for r in rows if r[3])
    print(f"\nBitti: {ok}/{len(rows)} görsel indirildi -> {zip_path}")
    if ok == 0:
        print("Hiç görsel inemedi. 'debug' klasöründeki JSON dosyalarını bana gönderin.")


if __name__ == "__main__":
    main()
