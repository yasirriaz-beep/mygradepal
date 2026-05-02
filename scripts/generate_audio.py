#!/usr/bin/env python3
"""
Pre-generate Google Cloud TTS audio for Chemistry 0620 topic_content rows
and store MP3s in Supabase Storage.

SETUP:
  pip install httpx

Environment:
  GOOGLE_TTS_API_KEY
  SUPABASE_URL
  SUPABASE_SERVICE_KEY

Usage:
  python scripts/generate_audio.py
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys
import time
from typing import Any

import httpx

SUBJECT = "Chemistry 0620"
TEXT_MAX_LEN = 1500
DELAY_SEC = 0.5
PAGE_SIZE = 500

TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"

# Approximate Google Cloud Neural2 list pricing (USD per 1M characters); adjust if your billing differs.
USD_PER_MILLION_CHARS = 16.0


def require_env(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        print(f"Missing required environment variable: {name}", file=sys.stderr)
        sys.exit(1)
    return v


def supabase_auth_headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }


def fetch_rows(client: httpx.Client, base_url: str, service_key: str) -> list[dict[str, Any]]:
    """Rows where subject = Chemistry 0620 and audio_url_en IS NULL."""
    headers = supabase_auth_headers(service_key)
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        r = client.get(
            f"{base_url.rstrip('/')}/rest/v1/topic_content",
            headers=headers,
            params={
                "subject": f"eq.{SUBJECT}",
                "audio_url_en": "is.null",
                "select": "id,topic,subtopic,definition,key_points",
                "limit": PAGE_SIZE,
                "offset": offset,
            },
            timeout=120.0,
        )
        r.raise_for_status()
        batch = r.json()
        if not isinstance(batch, list):
            raise RuntimeError("Unexpected topic_content response")
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


def normalize_key_points(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(p).strip() for p in raw if str(p).strip()]
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(p).strip() for p in parsed if str(p).strip()]
        except json.JSONDecodeError:
            pass
    return []


def build_tts_text(definition: Any, key_points: Any) -> str:
    d = str(definition or "").strip()
    kp = normalize_key_points(key_points)[:3]
    kp_joined = " ".join(kp)
    if d and kp_joined:
        text = d + ". " + kp_joined
    elif d:
        text = d
    else:
        text = kp_joined
    if len(text) > TEXT_MAX_LEN:
        text = text[:TEXT_MAX_LEN]
    return text


def slug_from_subtopic(subtopic: str) -> str:
    slug = (subtopic or "").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    slug = slug[:60]
    return slug or "topic"


def storage_object_exists(
    client: httpx.Client, base_url: str, service_key: str, path: str
) -> bool:
    url = f"{base_url.rstrip('/')}/storage/v1/object/audio/{path}"
    h = supabase_auth_headers(service_key)
    r = client.head(url, headers=h, timeout=60.0)
    return r.status_code == 200


def upload_mp3(
    client: httpx.Client, base_url: str, service_key: str, path: str, mp3: bytes
) -> bool:
    url = f"{base_url.rstrip('/')}/storage/v1/object/audio/{path}"
    headers = supabase_auth_headers(service_key)
    headers["Content-Type"] = "audio/mpeg"
    r = client.post(url, headers=headers, content=mp3, timeout=180.0)
    return r.status_code in (200, 201)


def patch_audio_url(
    client: httpx.Client,
    base_url: str,
    service_key: str,
    row_id: str,
    audio_url: str,
) -> bool:
    url = f"{base_url.rstrip('/')}/rest/v1/topic_content"
    headers = supabase_auth_headers(service_key)
    headers["Content-Type"] = "application/json"
    headers["Prefer"] = "return=minimal"
    r = client.patch(
        url,
        headers=headers,
        params={"id": f"eq.{row_id}"},
        json={"audio_url_en": audio_url},
        timeout=60.0,
    )
    return r.status_code in (200, 204)


def synthesize_mp3(client: httpx.Client, api_key: str, text: str) -> bytes | None:
    if not text.strip():
        return None
    body = {
        "input": {"text": text},
        "voice": {"languageCode": "en-GB", "name": "en-GB-Neural2-B"},
        "audioConfig": {"audioEncoding": "MP3", "speakingRate": 0.9},
    }
    r = client.post(
        f"{TTS_URL}?key={api_key}",
        json=body,
        headers={"Content-Type": "application/json"},
        timeout=120.0,
    )
    if not r.is_success:
        print(f"  TTS error HTTP {r.status_code}: {(r.text or '')[:300]}", file=sys.stderr)
        return None
    data = r.json()
    b64 = data.get("audioContent")
    if not b64:
        return None
    return base64.b64decode(b64)


def log_label(row: dict[str, Any]) -> str:
    sub = str(row.get("subtopic") or "").strip()
    if len(sub) > 56:
        sub = sub[:53] + "..."
    return sub or "(no subtopic)"


def main() -> None:
    google_key = require_env("GOOGLE_TTS_API_KEY")
    base_url = require_env("SUPABASE_URL").rstrip("/")
    service_key = require_env("SUPABASE_SERVICE_KEY")

    generated = 0
    skipped = 0
    errors = 0
    chars_for_cost = 0

    with httpx.Client() as client:
        try:
            rows = fetch_rows(client, base_url, service_key)
        except httpx.HTTPStatusError as e:
            print(f"Fetch topic_content failed: HTTP {e.response.status_code}", file=sys.stderr)
            print((e.response.text or "")[:500], file=sys.stderr)
            sys.exit(1)

        total = len(rows)
        if total == 0:
            print("No rows (subject=Chemistry 0620, audio_url_en IS NULL).")
            print("\nSummary: Generated 0 | Skipped 0 | Errors 0")
            print("Estimated cost: ~$0.00")
            return

        for i, row in enumerate(rows, start=1):
            label = log_label(row)
            prefix = f"[{i}/{total}] Generating audio: {label}"
            row_id = row.get("id")
            if row_id is None:
                print(f"{prefix} [error] missing id")
                errors += 1
                time.sleep(DELAY_SEC)
                continue

            subtopic = str(row.get("subtopic") or "")
            slug = slug_from_subtopic(subtopic)
            path = f"chemistry/{slug}.mp3"
            public_url = f"{base_url}/storage/v1/object/public/audio/{path}"

            if storage_object_exists(client, base_url, service_key, path):
                if not patch_audio_url(client, base_url, service_key, str(row_id), public_url):
                    print(f"{prefix} [error] PATCH failed (file exists)")
                    errors += 1
                else:
                    print(f"{prefix} [ok] (skipped — file already in storage)")
                    skipped += 1
                time.sleep(DELAY_SEC)
                continue

            text = build_tts_text(row.get("definition"), row.get("key_points"))
            if not text.strip():
                print(f"{prefix} [error] empty definition and key points")
                errors += 1
                time.sleep(DELAY_SEC)
                continue

            mp3 = synthesize_mp3(client, google_key, text)
            if not mp3:
                print(f"{prefix} [error]")
                errors += 1
                time.sleep(DELAY_SEC)
                continue

            chars_for_cost += len(text)

            if not upload_mp3(client, base_url, service_key, path, mp3):
                print(f"{prefix} [error] upload failed")
                errors += 1
                time.sleep(DELAY_SEC)
                continue

            if not patch_audio_url(client, base_url, service_key, str(row_id), public_url):
                print(f"{prefix} [error] PATCH failed")
                errors += 1
                time.sleep(DELAY_SEC)
                continue

            print(f"{prefix} [ok]")
            generated += 1
            time.sleep(DELAY_SEC)

    cost_usd = (chars_for_cost / 1_000_000.0) * USD_PER_MILLION_CHARS
    print()
    print(f"Summary: Generated {generated} | Skipped {skipped} | Errors {errors}")
    print(f"Estimated cost: ~${cost_usd:.2f}")


if __name__ == "__main__":
    main()
