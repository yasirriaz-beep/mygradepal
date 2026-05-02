#!/usr/bin/env python3
"""
Generate Khan Academy quality Cambridge IGCSE Chemistry 0620 study notes via Claude,
and upsert into Supabase `topic_content`.

Requires: pip install anthropic requests
Env: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)
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

# —— Model (do not change) ——
MODEL = "claude-sonnet-4-5"
MAX_TOKENS = 4000
SUBJECT = "Chemistry 0620"
QUESTIONS_SOURCE = "past_paper"
SLEEP_BETWEEN_CALLS_SEC = 1.0
PAGE_SIZE = 1000

# Approximate public list pricing (USD per 1M tokens) for cost lines — update if your deal differs
INPUT_USD_PER_MTOK = 3.0
OUTPUT_USD_PER_MTOK = 15.0

SYSTEM_PROMPT = """You are an expert Cambridge IGCSE Chemistry 0620
teacher with 20 years experience. Write study notes
at Khan Academy quality — clear, engaging,
exam-focused, with real-world examples Pakistani
students can relate to (cooking, CNG, industry,
medicine, everyday Pakistan life).

Return a JSON object with EXACTLY these fields:

- definition: 3-4 clear sentences a 15-year-old
  understands. Use precise scientific terms but
  explain them. Include one real-world example
  from Pakistani daily life.

- key_points: Array of exactly 6 complete sentences.
  Each must be exam-ready — include specific facts,
  numbers, formulae where relevant.

- formulas: Array of formula objects, each with:
    - formula: the equation or formula string
    - description: what it means
    - example: a worked number example
  Include all relevant formulae for this subtopic.
  Return [] if no formulae apply.

- worked_example: Object with:
    - question: real past-paper style question
      with marks shown e.g. [3]
    - steps: array of step-by-step solution strings
    - answer: complete answer with all mark points

- exam_tip: One very specific tip targeting what
  Cambridge examiners want. Mention specific
  command words (state/explain/describe/calculate).

- common_mistakes: Array of exactly 3 mistakes,
  each as: 'Wrong: ... | Correct: ...'

- mnemonics: One memorable trick to remember
  the key concept.

- real_world_connection: One paragraph connecting
  this concept to real Pakistani life.

- urdu_summary: A 2-3 sentence summary in Urdu
  (Roman Urdu is fine if easier) explaining the
  main concept simply for parents or students
  who prefer Urdu.

- quick_check: One simple 1-mark question a
  student can answer immediately to check
  basic understanding. Include the answer
  in brackets at the end.

Return ONLY valid JSON. Start with { end with }
No markdown, no preamble, no explanation."""


def require_env(name: str, *fallback_names: str) -> str:
    for n in (name,) + fallback_names:
        v = os.environ.get(n, "").strip()
        if v:
            return v
    print(f"Missing required environment variable: {name}", file=sys.stderr)
    sys.exit(1)


def supabase_headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }


def fetch_distinct_topic_subtopic(base_url: str, service_key: str) -> list[tuple[str, str]]:
    """GET questions with source=past_paper; return unique (topic, subtopic) preserving order."""
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }
    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    offset = 0
    while True:
        r = requests.get(
            f"{base_url.rstrip('/')}/rest/v1/questions",
            headers=headers,
            params={
                "select": "topic,subtopic",
                "source": f"eq.{QUESTIONS_SOURCE}",
                "limit": PAGE_SIZE,
                "offset": offset,
            },
            timeout=120,
        )
        r.raise_for_status()
        rows = r.json()
        for row in rows:
            t = (row.get("topic") or "").strip()
            s = (row.get("subtopic") or "").strip()
            if not t or not s:
                continue
            key = (t, s)
            if key not in seen:
                seen.add(key)
                pairs.append(key)
        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return pairs


def topic_content_exists(base_url: str, service_key: str, subtopic: str) -> bool:
    """True if a row exists for this subtopic + subject."""
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }
    r = requests.get(
        f"{base_url.rstrip('/')}/rest/v1/topic_content",
        headers=headers,
        params={
            "select": "subtopic",
            "subtopic": f"eq.{subtopic}",
            "subject": f"eq.{SUBJECT}",
            "limit": 1,
        },
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    return bool(data)


def repair_json_text(s: str) -> str:
    s = s.replace("\u201c", '"').replace("\u201d", '"')
    s = s.replace("\u2018", "'").replace("\u2019", "'")
    s = s.replace("\ufeff", "")
    return s


def fix_trailing_commas(s: str) -> str:
    # Remove trailing commas before } or ]
    s = re.sub(r",\s*(\]|\})", r"\1", s)
    return s


def strip_markdown_fences(raw: str) -> str:
    text = raw.strip()
    text = re.sub(r"^```json\s*", "", text)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def parse_model_json(raw: str) -> dict[str, Any]:
    """Parse JSON from model text: strip fences, take first { ... last }, repair, load."""
    text = strip_markdown_fences(raw)
    text = repair_json_text(text)
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("No JSON object delimiters found in model output")
    blob = text[start : end + 1]
    for candidate in (blob, fix_trailing_commas(blob)):
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
    raise ValueError("Could not parse JSON from model response")


def format_exc_ascii(exc: Exception) -> str:
    """Windows consoles often use cp1252; avoid Unicode symbols in error lines."""
    return str(exc).encode("ascii", "replace").decode("ascii")


def upsert_topic_content(
    base_url: str,
    service_key: str,
    topic: str,
    subtopic: str,
    parsed: dict[str, Any],
) -> None:
    """POST upsert on (subtopic, subject). chapter_number is NOT NULL in DB — always send 1."""
    headers = supabase_headers(service_key)
    headers["Prefer"] = "resolution=merge-duplicates,return=minimal"

    body: dict[str, Any] = {
        "subject": SUBJECT,
        "subtopic": subtopic,
        "chapter_number": 1,
        "chapter_title": topic,
        # NOT NULL in DB; mirror chapter grouping when questions do not carry a section.
        "section": topic,
        "definition": parsed.get("definition", ""),
        "key_points": parsed.get("key_points", []),
        "formulas": parsed.get("formulas", []),
        "worked_example": parsed.get("worked_example"),
        "exam_tip": parsed.get("exam_tip", ""),
        "quick_check": parsed.get("quick_check", ""),
        "urdu_summary": parsed.get("urdu_summary", ""),
    }

    # Match DB unique constraint / scripts/populate-topic-content.ts (subject, subtopic)
    url = f"{base_url.rstrip('/')}/rest/v1/topic_content?on_conflict=subject,subtopic"
    r = requests.post(url, headers=headers, json=body, timeout=120)
    if r.status_code not in (200, 201, 204):
        snippet = (r.text or "")[:300]
        print(f"[error] Supabase upsert status={r.status_code}", file=sys.stderr)
        print(f"        body[:300]={snippet!r}", file=sys.stderr)
        raise RuntimeError(f"Upsert failed HTTP {r.status_code}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate topic_content rows via Claude + Supabase.")
    parser.add_argument(
        "--test",
        action="store_true",
        help="Process only the first topic/subtopic pair (single integration test).",
    )
    args = parser.parse_args()

    api_key = require_env("ANTHROPIC_API_KEY")
    base_url = require_env("SUPABASE_URL").rstrip("/")
    service_key = require_env("SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY")

    client = anthropic.Anthropic(api_key=api_key)

    pairs = fetch_distinct_topic_subtopic(base_url, service_key)
    if args.test:
        pairs = pairs[:1]
        if not pairs:
            print("--test: no topic/subtopic pairs found.", file=sys.stderr)
            sys.exit(1)
        print(f"--test: running single pair: {pairs[0][0]} > {pairs[0][1]}")

    total = len(pairs)
    if total == 0:
        print("No topic/subtopic pairs found (questions source=past_paper).")
        return

    generated = 0
    skipped = 0
    errors = 0
    total_input_tokens = 0
    total_output_tokens = 0

    for idx, (topic, subtopic) in enumerate(pairs, start=1):
        prefix = f"[{idx}/{total}]"
        called_claude = False
        try:
            if topic_content_exists(base_url, service_key, subtopic):
                print(f"{prefix} Skip (already in topic_content): {topic} > {subtopic}")
                skipped += 1
                continue

            print(f"{prefix} Generating: {topic} > {subtopic}...", end=" ", flush=True)

            called_claude = True
            response = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": f"Topic: {topic}\nSubtopic: {subtopic}",
                    }
                ],
            )

            block = next((b for b in response.content if b.type == "text"), None)
            raw_text = getattr(block, "text", "") or ""
            usage = getattr(response, "usage", None)
            if usage:
                total_input_tokens += int(getattr(usage, "input_tokens", 0) or 0)
                total_output_tokens += int(getattr(usage, "output_tokens", 0) or 0)
            try:
                parsed = parse_model_json(raw_text)
            except ValueError as pe:
                preview = (raw_text[:300] if raw_text else "").encode("ascii", "replace").decode("ascii")
                print(f"[error] JSON parse: {format_exc_ascii(pe)}")
                print(f"        raw (first 300 chars): {preview!r}")
                errors += 1
                if called_claude:
                    time.sleep(SLEEP_BETWEEN_CALLS_SEC)
                continue

            upsert_topic_content(base_url, service_key, topic, subtopic, parsed)

            print("[ok]")
            generated += 1
        except Exception as e:
            print(f"[error] {format_exc_ascii(e)}")
            errors += 1

        if called_claude:
            time.sleep(SLEEP_BETWEEN_CALLS_SEC)

    cost_usd = (
        (total_input_tokens / 1_000_000.0) * INPUT_USD_PER_MTOK
        + (total_output_tokens / 1_000_000.0) * OUTPUT_USD_PER_MTOK
    )

    print()
    print(f"Generated: {generated} | Skipped: {skipped} | Errors: {errors}")
    print(f"Estimated cost: ~${cost_usd:.2f} (input {total_input_tokens} tok, output {total_output_tokens} tok)")


if __name__ == "__main__":
    main()
