#!/usr/bin/env python3
"""
Resolve subtopic start times in chemistry-videos.ts using YouTube video description
chapters (timestamp lines) + Claude.

  pip install httpx anthropic

  set ANTHROPIC_API_KEY=...
  python scripts/fix_video_timestamps.py [--dry-run] [--limit N] [--delay SEC]

Writes: <repo>/src/lib/chemistry-videos.ts
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import anthropic
import httpx

MODEL = "claude-sonnet-4-5"
MAX_TOKENS = 8192

# Repo root = scripts/
REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_TS_PATH = REPO_ROOT / "src" / "lib" / "chemistry-videos.ts"

WATCH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


@dataclass
class VideoSegment:
    youtube_id: str
    absolute_block_start: int  # index of 's' in subtopic_timestamps:
    absolute_block_end: int  # exclusive; char after closing ]
    old_lines: list[str]
    subtopic_names: list[str]


def require_env(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        print(f"Missing env: {name}", file=sys.stderr)
        sys.exit(1)
    return v


def find_matching_bracket(text: str, open_bracket_pos: int) -> int:
    """Find index of `]` that closes `[` at open_bracket_pos."""
    depth = 0
    for k in range(open_bracket_pos, len(text)):
        c = text[k]
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return k
    return -1


def extract_subtopic_names(block_inner: str) -> list[str]:
    names: list[str] = []
    for m in re.finditer(r"subtopic:\s*\"([^\"]+)\"", block_inner):
        names.append(m.group(1))
    return names


def iter_video_timestamp_blocks(content: str) -> list[VideoSegment]:
    """Find each youtube_id … subtopic_timestamps block in order."""
    segments: list[VideoSegment] = []
    pos = 0
    while True:
        m = re.search(r'youtube_id:\s*"([^"]+)"', content[pos:])
        if not m:
            break
        youtube_id = m.group(1)
        after_id = pos + m.end()
        m_next = re.search(r'youtube_id:\s*"', content[after_id:])
        chunk_end = after_id + m_next.start() if m_next else len(content)
        chunk = content[after_id:chunk_end]

        stm = re.search(r"subtopic_timestamps:\s*\[", chunk)
        if not stm:
            pos = chunk_end
            continue

        abs_bracket_open = after_id + stm.end() - 1
        close_idx = find_matching_bracket(content, abs_bracket_open)
        if close_idx < 0:
            pos = chunk_end
            continue

        abs_block_start = after_id + stm.start()
        abs_block_end = close_idx + 1
        inner = content[abs_bracket_open + 1 : close_idx]
        names = extract_subtopic_names(inner)
        old_lines = [ln.rstrip() for ln in inner.strip().splitlines() if ln.strip()]

        segments.append(
            VideoSegment(
                youtube_id=youtube_id,
                absolute_block_start=abs_block_start,
                absolute_block_end=abs_block_end,
                old_lines=old_lines,
                subtopic_names=names,
            )
        )
        pos = chunk_end

    return segments


def _unescape_embedded_json_string(inner: str) -> str:
    """Decode a JSON string fragment from a YouTube HTML embed (shortDescription, etc.)."""
    try:
        return json.loads(f'"{inner}"')
    except json.JSONDecodeError:
        return (
            inner.replace("\\n", "\n")
            .replace("\\r", "")
            .replace("\\t", "\t")
            .replace('\\"', '"')
            .replace("\\\\", "\\")
        )


def extract_description_from_watch_html(html: str) -> str | None:
    """Pull video description from watch page HTML (embedded JSON)."""
    m = re.search(r'"shortDescription"\s*:\s*"((?:[^"\\]|\\.)*)"', html)
    if m:
        return _unescape_embedded_json_string(m.group(1))
    return None


def parse_timestamp_lines_from_description(text: str) -> list[tuple[str, str]]:
    """
    Lines like: 0:00 intro / 1:30 Some topic / 1:01:00 Long video chapter.
    Returns (timestamp_str, title) in order of appearance.
    """
    line_pat = re.compile(r"^(\d{1,3}:\d{2}(?::\d{2})?)\s+(.+?)\s*$")
    out: list[tuple[str, str]] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        m = line_pat.match(line)
        if m:
            out.append((m.group(1), m.group(2).strip()))
    if out:
        return out
    # Fallback: same pattern anywhere in text (descriptions sometimes omit newlines)
    loose = re.compile(r"(\d+:\d+(?::\d+)?)\s+([^\n]+)")
    return [(a, b.strip()) for a, b in loose.findall(text)]


def timestamp_str_to_seconds(ts: str) -> int:
    parts = ts.strip().split(":")
    nums = [int(p) for p in parts]
    if len(nums) == 2:
        minutes, seconds = nums
        return minutes * 60 + seconds
    if len(nums) == 3:
        hours, minutes, seconds = nums
        return hours * 3600 + minutes * 60 + seconds
    raise ValueError(f"Bad timestamp: {ts!r}")


def format_description_chapters_for_prompt(matches: list[tuple[str, str]]) -> str:
    lines: list[str] = []
    for ts, title in matches:
        try:
            sec = timestamp_str_to_seconds(ts)
        except ValueError:
            sec = -1
        lines.append(f"[{ts}] ({sec}s) {title}")
    return "\n".join(lines)


def get_timestamps_from_description(video_id: str) -> tuple[str | None, list[tuple[str, str]]]:
    """
    Fetch YouTube watch page and parse timestamp lines from the video description.
    Returns (description_text or None if not found in HTML, list of (timestamp_str, title)).
    """
    url = f"https://www.youtube.com/watch?v={video_id}"
    r = httpx.get(url, headers=WATCH_HEADERS, follow_redirects=True, timeout=30.0)
    r.raise_for_status()
    desc = extract_description_from_watch_html(r.text)
    if not desc:
        return None, []
    line_based = parse_timestamp_lines_from_description(desc)
    if line_based:
        return desc, line_based
    pattern = re.compile(r"(\d+:\d+(?::\d+)?)\s+(.+)")
    loose = [(a, b.strip()) for a, b in re.findall(pattern, desc)]
    return desc, loose


def fetch_description_chapters(video_id: str) -> list[tuple[str, str]] | None:
    """Return parsed (timestamp_str, label) from description, or None on fetch/parse failure."""
    try:
        desc, matches = get_timestamps_from_description(video_id)
    except Exception as e:
        print(f"  [skip description] {video_id}: {e}", file=sys.stderr)
        return None
    if not desc:
        print(
            f"  [skip description] {video_id}: could not extract description from page",
            file=sys.stderr,
        )
        return None
    if not matches:
        print(f"  [skip description] {video_id}: no timestamp lines in description", file=sys.stderr)
        return None
    return matches


def parse_json_array(raw: str) -> list[dict]:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```\s*$", "", raw)
    start = raw.find("[")
    end = raw.rfind("]")
    if start < 0 or end <= start:
        raise ValueError("No JSON array in response")
    chunk = raw[start : end + 1]
    chunk = chunk.replace("\u201c", '"').replace("\u201d", '"')
    return json.loads(chunk)


def build_claude_prompt(chapter_text: str, subtopics: list[str]) -> str:
    sub_list = "\n".join(f"- {s}" for s in subtopics)
    return f"""Here are timestamp chapters parsed from the YouTube video description (not the transcript).

DESCRIPTION CHAPTERS:
{chapter_text}

Here are the subtopics I need start times for:
{sub_list}

For each subtopic, pick the description chapter that best matches that subtopic and use its timestamp.
If several chapters could match, prefer the chapter whose title aligns most closely with the subtopic name.
Match subtopic strings exactly as listed (same spelling/casing as above).

Return ONLY a JSON array (no markdown, no prose), shape:
[
  {{
    "subtopic": "Exact label from list",
    "time": "M:SS",
    "seconds": <integer start second>,
    "confidence": "high",
    "context": "matching chapter title from the description"
  }}
]

confidence must be one of: high, medium, low.
Include one object per subtopic in the same order as the list above."""


def assign_end_seconds_in_display_order(rows: list[dict]) -> None:
    """Set end_seconds from next segment start (by ascending seconds), keep row order as in file."""
    if not rows:
        return
    order = sorted(range(len(rows)), key=lambda i: int(rows[i].get("seconds", 0)))
    for j, idx in enumerate(order):
        cur = int(rows[idx]["seconds"])
        if j + 1 < len(order):
            nxt = int(rows[order[j + 1]]["seconds"])
            rows[idx]["end_seconds"] = max(cur, nxt - 1)
        else:
            rows[idx]["end_seconds"] = 9999


def parse_old_subtopic_seconds(old_lines: list[str]) -> dict[str, tuple[int, int]]:
    """Map subtopic label -> (seconds, end_seconds) from existing TS lines."""
    out: dict[str, tuple[int, int]] = {}
    for ln in old_lines:
        m = re.search(
            r'subtopic:\s*"([^"]+)"\s*,\s*seconds:\s*(\d+)\s*,\s*end_seconds:\s*(\d+)',
            ln,
        )
        if m:
            out[m.group(1)] = (int(m.group(2)), int(m.group(3)))
    return out


def render_subtopic_ts_block(rows: list[dict], indent: str = "          ") -> str:
    """TS inner lines only (inside [...])."""
    lines_out = []
    for row in rows:
        st = str(row.get("subtopic", "")).replace('"', '\\"')
        sec = int(row["seconds"])
        end = int(row.get("end_seconds", 9999))
        lines_out.append(f'{indent}{{ subtopic: "{st}", seconds: {sec}, end_seconds: {end} }},')
    # drop trailing comma on last line for strict TS? File uses trailing commas on all lines - keep consistent with existing style (comma each line)
    return "\n".join(lines_out)


def merge_claude_with_order(
    subtopic_names: list[str],
    claude_rows: list[dict],
    old_lookup: dict[str, tuple[int, int]],
) -> tuple[list[dict], list[str]]:
    """Build ordered rows matching subtopic_names; match Claude by normalized key."""
    by_lower: dict[str, dict] = {}
    for r in claude_rows:
        key = str(r.get("subtopic", "")).strip().lower()
        by_lower[key] = r

    out: list[dict] = []
    warnings: list[str] = []
    for name in subtopic_names:
        r = by_lower.get(name.strip().lower())
        if not r:
            for r2 in claude_rows:
                st = str(r2.get("subtopic", "")).lower()
                if name.lower() in st or st in name.lower():
                    r = r2
                    warnings.append(f"fuzzy matched '{name}' -> {r2.get('subtopic')}")
                    break
        if not r:
            if name in old_lookup:
                sec, end_sec = old_lookup[name]
                out.append(
                    {
                        "subtopic": name,
                        "seconds": sec,
                        "end_seconds": end_sec,
                        "confidence": "fallback",
                        "context": "(unchanged — no Claude match)",
                    },
                )
                warnings.append(f"kept existing timestamps for: {name}")
            else:
                warnings.append(f"MISSING Claude row and no old line — using 0s placeholder for: {name}")
                out.append(
                    {
                        "subtopic": name,
                        "seconds": 0,
                        "confidence": "missing",
                        "context": "(needs manual fix)",
                    },
                )
            continue
        out.append(
            {
                "subtopic": name,
                "seconds": int(r.get("seconds", 0)),
                "confidence": str(r.get("confidence", "medium")),
                "context": str(r.get("context", "")),
            }
        )
    assign_end_seconds_in_display_order(out)
    return out, warnings


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fix chemistry-videos subtopic timestamps via YouTube description chapters + Claude.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Do not write TS file.")
    parser.add_argument("--limit", type=int, default=0, help="Process only first N videos (0=all).")
    parser.add_argument("--delay", type=float, default=1.5, help="Seconds between Claude calls.")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_TS_PATH,
        help=f"Path to chemistry-videos.ts (default: {DEFAULT_TS_PATH})",
    )
    args = parser.parse_args()

    ts_path: Path = args.output
    if not ts_path.is_file():
        print(f"File not found: {ts_path}", file=sys.stderr)
        sys.exit(1)

    api_key = require_env("ANTHROPIC_API_KEY")
    client = anthropic.Anthropic(api_key=api_key)

    content = ts_path.read_text(encoding="utf-8")
    segments = iter_video_timestamp_blocks(content)

    if args.limit and args.limit > 0:
        segments = segments[: args.limit]

    print(f"Found {len(segments)} videos with subtopic_timestamps.\n")

    replacements: list[tuple[int, int, str]] = []
    report_before_after: list[tuple[str, str, str, str]] = []
    low_conf: list[str] = []

    for i, seg in enumerate(segments, start=1):
        print(f"[{i}/{len(segments)}] {seg.youtube_id} ({len(seg.subtopic_names)} subtopics)")

        chapters = fetch_description_chapters(seg.youtube_id)
        if not chapters:
            continue

        chapter_text = format_description_chapters_for_prompt(chapters)
        user_prompt = build_claude_prompt(chapter_text, seg.subtopic_names)

        try:
            resp = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                messages=[{"role": "user", "content": user_prompt}],
            )
            block = next((b for b in resp.content if b.type == "text"), None)
            raw = getattr(block, "text", "") or ""
            claude_rows = parse_json_array(raw)
            if not isinstance(claude_rows, list):
                raise ValueError("Claude did not return a JSON array")
        except Exception as e:
            print(f"  [error] Claude/parse: {e}", file=sys.stderr)
            continue

        old_lookup = parse_old_subtopic_seconds(seg.old_lines)
        merged, warns = merge_claude_with_order(seg.subtopic_names, claude_rows, old_lookup)
        for w in warns:
            print(f"  [warn] {w}")

        for row in merged:
            conf = str(row.get("confidence", "medium")).lower()
            if conf == "low":
                low_conf.append(f"{seg.youtube_id} :: {row['subtopic']}")

        for row in merged:
            name = row["subtopic"]
            old_pair = old_lookup.get(name)
            old_s = str(old_pair[0]) if old_pair else "?"
            new_s = str(row["seconds"])
            report_before_after.append((seg.youtube_id, name, old_s, new_s))

        inner_ts = render_subtopic_ts_block(merged)
        # Full replacement: from subtopic_timestamps: through ]; preserve newline before ]
        old_block = content[seg.absolute_block_start : seg.absolute_block_end]
        prefix = "subtopic_timestamps: [\n"
        suffix = "\n        ]"
        new_block = prefix + inner_ts + suffix

        # Verify we're replacing the expected span
        if not old_block.startswith("subtopic_timestamps:"):
            print(f"  [error] Unexpected block shape at {seg.absolute_block_start}", file=sys.stderr)
            continue

        if merged:
            replacements.append((seg.absolute_block_start, seg.absolute_block_end, new_block))
            print("  [ok]\n")
        else:
            print("  [skip] no rows to write\n")

        time.sleep(args.delay)

    if not replacements:
        print("No updates produced.")
        return

    # Apply replacements from end to start so indices stay valid
    new_content = content
    for start, end, repl in sorted(replacements, key=lambda x: x[0], reverse=True):
        new_content = new_content[:start] + repl + new_content[end:]

    print("=" * 60)
    print("TIMESTAMP CHANGES (youtube_id | subtopic | before -> after seconds)")
    print("=" * 60)
    for vid, name, before, after in report_before_after:
        if before != after:
            print(f"  {vid} | {name[:50]:<50} | {before:>6} -> {after}")
        else:
            print(f"  {vid} | {name[:50]:<50} | (unchanged) {after}")

    if low_conf:
        print("\n--- LOW CONFIDENCE (manual review) ---")
        for line in low_conf:
            print(f"  - {line}")

    if args.dry_run:
        print("\n[--dry-run] Skipped writing file.")
        return

    ts_path.write_text(new_content, encoding="utf-8")
    print(f"\nWrote: {ts_path}")


if __name__ == "__main__":
    main()
