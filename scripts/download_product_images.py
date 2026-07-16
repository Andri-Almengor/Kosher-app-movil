#!/usr/bin/env python3
"""Descarga imágenes de productos usando el nombre del producto como nombre de archivo.

Uso básico:
  python scripts/download_product_images.py --api-base-url http://192.168.68.113:4000

Opcionalmente puedes usar un JSON local:
  python scripts/download_product_images.py --input-json productos.json
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sys
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    print("Falta la librería requests. Instálala con: pip install requests", file=sys.stderr)
    raise

IMAGE_KEYS = [
    "fotoProducto",
    "imgProd",
    "imageUrl",
    "fotoSello1",
    "fotoSello2",
    "logoSello",
    "logoGf",
]


def normalize_api_base(url: str) -> str:
    url = (url or "").strip().rstrip("/")
    if not url:
        return url
    if url.lower().endswith("/api"):
        return url
    return f"{url}/api"


def sanitize_filename(name: str, fallback: str) -> str:
    value = (name or "").strip() or fallback
    value = re.sub(r'[\\/:*?"<>|]+', "-", value)
    value = re.sub(r"\s+", " ", value).strip(" .")
    return value[:150] or fallback


def extension_from_response(url: str, content_type: str | None) -> str:
    if content_type:
        ext = mimetypes.guess_extension(content_type.split(";")[0].strip())
        if ext:
            return ".jpg" if ext == ".jpe" else ext
    path = urlparse(url).path
    ext = Path(path).suffix.lower()
    if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"}:
        return ext
    return ".jpg"


def unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    stem = path.stem
    suffix = path.suffix
    parent = path.parent
    i = 2
    while True:
        candidate = parent / f"{stem} ({i}){suffix}"
        if not candidate.exists():
            return candidate
        i += 1


def load_products_from_api(api_base_url: str, timeout: int) -> list[dict[str, Any]]:
    url = f"{normalize_api_base(api_base_url)}/productos"
    print(f"Consultando: {url}")
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, list):
        raise ValueError("La respuesta del endpoint /productos no es una lista.")
    return data


def load_products_from_json(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        return data["items"]
    if isinstance(data, list):
        return data
    raise ValueError("El JSON debe ser una lista de productos o un objeto con la llave 'items'.")


def iter_product_images(product: dict[str, Any]) -> Iterable[tuple[str, str]]:
    for key in IMAGE_KEYS:
        value = product.get(key)
        if isinstance(value, str) and value.strip().startswith(("http://", "https://")):
            yield key, value.strip()


def download_image(session: requests.Session, url: str, destination: Path, timeout: int) -> None:
    with session.get(url, stream=True, timeout=timeout) as response:
        response.raise_for_status()
        ext = extension_from_response(url, response.headers.get("Content-Type"))
        final_path = unique_path(destination.with_suffix(ext))
        with final_path.open("wb") as fh:
            for chunk in response.iter_content(chunk_size=1024 * 128):
                if chunk:
                    fh.write(chunk)
        print(f"Guardado: {final_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Descargar imágenes de productos con el nombre del producto.")
    parser.add_argument("--api-base-url", help="URL base del backend, por ejemplo http://192.168.68.113:4000")
    parser.add_argument("--input-json", help="Ruta a un JSON local con los productos")
    parser.add_argument("--output-dir", default="imagenes_productos", help="Carpeta de salida")
    parser.add_argument("--timeout", type=int, default=30, help="Timeout por solicitud en segundos")
    args = parser.parse_args()

    if not args.api_base_url and not args.input_json:
        parser.error("Debes indicar --api-base-url o --input-json")

    if args.input_json:
        products = load_products_from_json(Path(args.input_json))
    else:
        products = load_products_from_api(args.api_base_url, args.timeout)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update({"User-Agent": "KosherCR-ImageDownloader/1.0"})

    total_downloaded = 0
    total_products = 0
    for product in products:
        if not isinstance(product, dict):
            continue
        total_products += 1
        product_name = sanitize_filename(
            str(product.get("nombre") or product.get("EN Product Name") or product.get("detalle") or ""),
            fallback=f"producto_{product.get('id', total_products)}",
        )

        seen_urls: set[str] = set()
        image_index = 0
        for key, url in iter_product_images(product):
            if url in seen_urls:
                continue
            seen_urls.add(url)
            image_index += 1
            suffix = "" if image_index == 1 and key in {"fotoProducto", "imgProd", "imageUrl"} else f" - {key}"
            base_path = output_dir / f"{product_name}{suffix}"
            try:
                download_image(session, url, base_path, args.timeout)
                total_downloaded += 1
            except Exception as exc:
                print(f"No se pudo descargar {url}: {exc}", file=sys.stderr)

    print(f"\nProductos leídos: {total_products}")
    print(f"Imágenes descargadas: {total_downloaded}")
    print(f"Carpeta de salida: {output_dir.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
