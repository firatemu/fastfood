#!/usr/bin/env python3
"""
FASTFOOD — Ürün görsellerini MinIO ve veritabanına yükleme scripti.
apps/api/prisma/seed-data/menu-images/gorseller/ altındaki 45 ürün görselini
ilgili ürünlere bağlar.
"""

import json
import base64
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "http://127.0.0.1:4000/api/v1"
MENU_FILE = ROOT / "apps/api/prisma/seed-data/menu-xlsx.json"
GORSELLER_DIR = ROOT / "apps/api/prisma/seed-data/menu-images/gorseller"


def main():
    if not MENU_FILE.exists() or not GORSELLER_DIR.exists():
        print("Menü veya görsel dizini bulunamadı.")
        return 1

    # 1. Staff Girişi
    try:
        login_req = urllib.request.Request(
            f"{API}/auth/staff/login",
            data=json.dumps({"identifier": "staff@fastfood.local", "password": "DevStaffPass1!"}).encode(),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(login_req, timeout=5) as resp:
            token_data = json.loads(resp.read().decode())
        refresh_token = token_data["data"]["refreshToken"]

        mfa_req = urllib.request.Request(
            f"{API}/auth/staff/mfa/verify",
            data=json.dumps({"refreshToken": refresh_token, "totp": "000000"}).encode(),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(mfa_req, timeout=5) as resp:
            mfa_data = json.loads(resp.read().decode())
        access_token = mfa_data["data"]["accessToken"]
    except Exception as e:
        print(f"Giriş başarısız (API açık mı?): {e}")
        return 1

    # 2. Katalog listesini al
    req = urllib.request.Request(f"{API}/storefront/catalog/products")
    with urllib.request.urlopen(req, timeout=5) as resp:
        catalog_data = json.loads(resp.read().decode())
    product_by_slug = {p["slug"]: p for p in catalog_data.get("data", [])}

    menu = json.loads(MENU_FILE.read_text())
    success_count = 0
    skip_count = 0
    fail_count = 0

    for p in menu.get("products", []):
        excel_name = p["excelName"]
        slug = p["slug"]
        name = p["name"]

        prod = product_by_slug.get(slug)
        if not prod:
            fail_count += 1
            continue

        if prod.get("imageUrl"):
            skip_count += 1
            continue

        img_file = GORSELLER_DIR / f"{excel_name}.webp"
        if not img_file.exists():
            fail_count += 1
            continue

        b64 = base64.b64encode(img_file.read_bytes()).decode()

        upload_req = urllib.request.Request(
            f"{API}/admin/products/{prod['id']}/media/upload",
            data=json.dumps({
                "fileBase64": b64,
                "altText": name,
                "displayOrder": 0
            }).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            }
        )
        try:
            with urllib.request.urlopen(upload_req, timeout=10) as resp:
                success_count += 1
                print(f"  ✓ Yüklendi: {name}")
        except Exception as e:
            print(f"  ✗ Hata ({name}): {e}")
            fail_count += 1

    print(f"Tamamlandı: {success_count} yeni yüklendi, {skip_count} zaten mevcuttu, {fail_count} hata.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
