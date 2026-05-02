#!/usr/bin/env python3
"""
Generate 8 Claude Sonnet flashcards per `topic_content` subtopic (Chemistry 0620)
and insert into Supabase `flashcards`.

Environment (optional venv_content: httpx, anthropic — this script uses anthropic + requests):
  ANTHROPIC_API_KEY
  SUPABASE_URL
  SUPABASE_SERVICE_KEY

Requires: pip install anthropic requests

Usage:
  python scripts/generate_flashcards.py [--test] [--limit N] [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from typing import Any

import anthropic
import requests

MODEL = "claude-sonnet-4-5"
MAX_TOKENS = 3000
SUBJECT_TOPIC_CONTENT = "Chemistry 0620"
SUBJECT_FLASHCARDS = "Chemistry"
SLEEP_SEC = 1.0
PAGE_SIZE = 500

INPUT_USD_PER_MTOK = 3.0
OUTPUT_USD_PER_MTOK = 15.0

SYSTEM_PROMPT = """You are an expert Cambridge IGCSE Chemistry 0620 teacher creating flashcards for Pakistani students.

For the subtopic provided, create exactly 8 flashcards.

Each flashcard must use Cambridge exam command words and test exactly ONE concept per card.

Return a JSON array of exactly 8 objects:
[
  {
    "front": "Command word · what to do (e.g. State · the two conditions needed for rusting)",
    "back": "Mark scheme answer — exact words that get marks in Cambridge exam",
    "hint": "Urdu memory hook or Pakistani example to remember this",
    "command_word": "State/Define/Explain/Calculate/Describe/Name/Give",
    "tier": 1
  }
]

Rules:
- Cover different aspects of the subtopic across 8 cards
- Mix command words: 2-3 State/Name, 2-3 Explain/Describe, 1-2 Calculate/Give
- Back must use exact Cambridge mark scheme language
- Hint must be in simple Urdu or relatable Pakistani context
- tier: 1 for recall, 2 for understanding, 3 for application
- No duplicates — each card tests something different
- Return ONLY valid JSON array. No markdown."""


def require_env(name: str, *fallback_names: str) -> str:
    for n in (name,) + fallback_names:
        v = os.environ.get(n, "").strip()
        if v:
            return v
    print(f"Missing required environment variable: {name}", file=sys.stderr)
    sys.exit(1)


def supabase_json_headers(service_key: str, extra: dict[str, str] | None = None) -> dict[str, str]:
    h = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def fetch_topic_content_rows(base_url: str, service_key: str) -> list[dict[str, Any]]:
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        r = requests.get(
            f"{base_url.rstrip('/')}/rest/v1/topic_content",
            headers=headers,
            params={
                "subject": f"eq.{SUBJECT_TOPIC_CONTENT}",
                "select": "id,subtopic,chapter_title,definition,key_points",
                "limit": PAGE_SIZE,
                "offset": offset,
                "order": "subtopic.asc",
            },
            timeout=120,
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


def count_flashcards(base_url: str, service_key: str, subtopic: str) -> int:
    """Count existing platform rows for Chemistry + subtopic."""
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
    r = requests.get(
        f"{base_url.rstrip('/')}/rest/v1/flashcards",
        headers=headers,
        params={
            "subject": f"eq.{SUBJECT_FLASHCARDS}",
            "subtopic": f"eq.{subtopic}",
            "select": "id",
            "limit": 10000,
        },
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    return len(data) if isinstance(data, list) else 0


def format_key_points(key_points: Any) -> str:
    if isinstance(key_points, list):
        return "\n".join(str(x).strip() for x in key_points if str(x).strip())
    if isinstance(key_points, str) and key_points.strip():
        try:
            parsed = json.loads(key_points)
            if isinstance(parsed, list):
                return "\n".join(str(x).strip() for x in parsed if str(x).strip())
        except json.JSONDecodeError:
            pass
        return key_points.strip()
    return ""


def strip_markdown_fences(raw: str) -> str:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```\s*$", "", text)
    return text.strip()


def extract_json_array(text: str) -> str:
    text = strip_markdown_fences(text)
    start = text.find("[")
    if start < 0:
        raise ValueError("No JSON array start '[' in model output")
    depth = 0
    for i in range(start, len(text)):
        ch = text[i]
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    raise ValueError("Unclosed JSON array in model output")


def parse_cards(raw_text: str) -> list[dict[str, Any]]:
    blob = extract_json_array(raw_text)
    data = json.loads(blob)
    if not isinstance(data, list):
        raise ValueError("Model output is not a JSON array")
    if len(data) != 8:
        raise ValueError(f"Expected 8 flashcards, got {len(data)}")
    out: list[dict[str, Any]] = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise ValueError(f"Item {i} is not an object")
        for k in ("front", "back", "hint", "command_word", "tier"):
            if k not in item:
                raise ValueError(f"Item {i} missing field: {k}")
        tier = int(item["tier"])
        if tier not in (1, 2, 3):
            raise ValueError(f"Item {i} invalid tier: {tier}")
        out.append(
            {
                "front": str(item["front"]).strip(),
                "back": str(item["back"]).strip(),
                "hint": str(item["hint"]).strip(),
                "command_word": str(item["command_word"]).strip(),
                "tier": tier,
            }
        )
    return out


def post_flashcard(base_url: str, service_key: str, chapter: str, subtopic: str, card: dict[str, Any]) -> bool:
    url = f"{base_url.rstrip('/')}/rest/v1/flashcards"
    headers = supabase_json_headers(
        service_key,
        {"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    body = {
        "subject": SUBJECT_FLASHCARDS,
        "chapter": chapter,
        "subtopic": subtopic,
        "front": card["front"],
        "back": card["back"],
        "hint": card["hint"],
        "command_word": card["command_word"],
        "tier": card["tier"],
        "is_platform": True,
    }
    r = requests.post(url, headers=headers, json=body, timeout=60)
    if r.status_code not in (200, 201, 204):
        print(f"  POST flashcard HTTP {r.status_code}: {(r.text or '')[:250]}", file=sys.stderr)
        return False
    return True


def log_label(subtopic: str, max_len: int = 56) -> str:
    s = (subtopic or "").strip()
    if len(s) > max_len:
        return s[: max_len - 3] + "..."
    return s or "(no subtopic)"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate flashcards via Claude + Supabase.")
    parser.add_argument("--test", action="store_true", help="Only first subtopic from topic_content.")
    parser.add_argument("--limit", type=int, default=0, help="Max subtopics to process (0 = all).")
    parser.add_argument("--dry-run", action="store_true", help="Call Claude but do not POST to flashcards.")
    args = parser.parse_args()

    api_key = require_env("ANTHROPIC_API_KEY")
    base_url = require_env("SUPABASE_URL").rstrip("/")
    service_key = require_env("SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY")

    client = anthropic.Anthropic(api_key=api_key)

    rows = fetch_topic_content_rows(base_url, service_key)
    total_rows = len(rows)
    if args.test:
        rows = rows[:1]
    if args.limit and args.limit > 0:
        rows = rows[: args.limit]

    if not rows:
        print("No topic_content rows found for Chemistry 0620.")
        return

    generated_cards = 0
    skipped = 0
    errors = 0
    subtopics_done = 0
    total_in_tok = 0
    total_out_tok = 0

    print(f"{total_rows} subtopics in topic_content; processing {len(rows)}.\n")

    for idx, row in enumerate(rows, start=1):
        subtopic = str(row.get("subtopic") or "").strip()
        chapter_title = str(row.get("chapter_title") or subtopic).strip()
        definition = str(row.get("definition") or "").strip()
        key_pts = format_key_points(row.get("key_points"))

        prefix = f"[{idx}/{len(rows)}]"
        label = log_label(subtopic)

        if not subtopic:
            print(f"{prefix} Skip (empty subtopic)")
            skipped += 1
            time.sleep(SLEEP_SEC)
            continue

        try:
            n_existing = count_flashcards(base_url, service_key, subtopic)
            if n_existing >= 8:
                print(f"{prefix} Skip (already {n_existing} cards): {label}")
                skipped += 1
                time.sleep(SLEEP_SEC)
                continue

            user_msg = f"""Topic: {chapter_title}
Subtopic: {subtopic}

Context from our content:
Definition: {definition}
Key points:
{key_pts}"""

            resp = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )
            usage = getattr(resp, "usage", None)
            if usage:
                total_in_tok += int(getattr(usage, "input_tokens", 0) or 0)
                total_out_tok += int(getattr(usage, "output_tokens", 0) or 0)

            block = next((b for b in resp.content if b.type == "text"), None)
            raw_text = getattr(block, "text", "") or ""

            cards = parse_cards(raw_text)

            if args.dry_run:
                print(f"{prefix} Generating flashcards: {label}... [dry-run] 8 cards")
                generated_cards += 8
                subtopics_done += 1
                time.sleep(SLEEP_SEC)
                continue

            ok = 0
            for c in cards:
                if post_flashcard(base_url, service_key, chapter_title, subtopic, c):
                    ok += 1

            if ok == 8:
                print(f"{prefix} Generating flashcards: {label}... [ok] 8 cards")
                generated_cards += 8
                subtopics_done += 1
            else:
                print(f"{prefix} Generating flashcards: {label}... [partial] {ok}/8 saved")
                generated_cards += ok
                errors += 1

        except Exception as e:
            print(f"{prefix} Generating flashcards: {label}... [error] {e}")
            errors += 1

        time.sleep(SLEEP_SEC)

    cost_usd = (
        (total_in_tok / 1_000_000.0) * INPUT_USD_PER_MTOK + (total_out_tok / 1_000_000.0) * OUTPUT_USD_PER_MTOK
    )
    print()
    print(f"Generated: {generated_cards} cards across {subtopics_done} subtopics")
    print(f"Estimated cost: ~${cost_usd:.2f}")
    print(f"(Skipped: {skipped} | Errors: {errors} | tokens in {total_in_tok}, out {total_out_tok})")


if __name__ == "__main__":
    main()
