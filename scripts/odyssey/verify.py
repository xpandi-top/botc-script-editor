"""Verify the imported Odyssey ability text against a fresh copy of the wiki.

Deliberately does NOT reuse the import pipeline's parser. `all.cjs` flattens the
whole page to text and then splits on standalone heading lines; this slices the
raw lake HTML between the 角色能力 and 角色信息 headings instead. Two independent
paths agreeing is evidence the text is right; one path agreeing with itself is
not.

Usage (from the repo root, needs network):

    python3 scripts/odyssey/verify.py            # fetch fresh and compare
    python3 scripts/odyssey/verify.py --cache D  # reuse docs already in D/docs

Exit code 1 if any character's ability differs from the repo.
"""

import argparse
import glob
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse

BOOK_URL = "https://www.yuque.com/u48069482/taiyi"
BOOK_ID = 68685424
REPO_CHARS = "assets/characters/individual"


def fetch(url, out_path):
    subprocess.run(
        ["curl", "-s", "-H", "x-requested-with: XMLHttpRequest",
         "-H", f"referer: {BOOK_URL}", "-A", "Mozilla/5.0", url, "-o", out_path],
        check=False,
    )


def load_toc(work_dir):
    book_path = os.path.join(work_dir, "book.html")
    if not os.path.exists(book_path):
        fetch(BOOK_URL, book_path)
    raw = open(book_path, encoding="utf8").read()
    start = raw.index("window.appData")
    quote = raw.index('"', start)
    i, out = quote + 1, []
    while i < len(raw):
        ch = raw[i]
        if ch == "\\":
            out.append(raw[i:i + 2]); i += 2; continue
        if ch == '"':
            break
        out.append(ch); i += 1
    payload = json.loads('"' + "".join(out) + '"')
    if payload.startswith("%"):
        payload = urllib.parse.unquote(payload)
    return json.loads(payload)["book"]["toc"]


def strip_html(fragment):
    """Lake HTML -> plain text. Drops cards (images) entirely."""
    text = re.sub(r"<card[^>]*>", "", fragment)
    text = re.sub(r"<br\s*/?>", "\n", text)
    text = re.sub(r"</(p|div|h\d|li|tr)>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    return text


def ability_from_raw(content):
    """Text between the 角色能力 and 角色信息 headings, by raw offset."""
    plain = strip_html(content)
    match = re.search(r"\n\s*角色能力\s*\n(.*?)\n\s*角色信息\s*\n", plain, re.S)
    if not match:
        return None
    return " ".join(match.group(1).split())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", default=None, help="reuse an existing work dir")
    args = parser.parse_args()

    work_dir = args.cache or ".odyssey-verify"
    os.makedirs(os.path.join(work_dir, "docs"), exist_ok=True)

    repo = {}
    for path in glob.glob(os.path.join(REPO_CHARS, "*.json")):
        entry = json.load(open(path, encoding="utf8"))
        if entry.get("edition") == "odyssey":
            repo[entry["en"]["name"]] = entry

    by_en = {name: entry for name, entry in repo.items()}
    toc = [t for t in load_toc(work_dir) if t.get("type") == "DOC" and t.get("url")]

    checked, mismatches, unmatched = 0, [], []
    for item in toc:
        doc_path = os.path.join(work_dir, "docs", f"{item['url']}.json")
        if not os.path.exists(doc_path) or os.path.getsize(doc_path) < 500:
            fetch(
                f"https://www.yuque.com/api/docs/{item['url']}"
                f"?book_id={BOOK_ID}&merge_dynamic_data=false",
                doc_path,
            )
            time.sleep(0.4)
        data = json.load(open(doc_path, encoding="utf8"))["data"]
        content = data.get("content") or ""

        english = re.search(r"英文名[：:]\s*([^\n<]+)", strip_html(content))
        if not english:
            continue
        name = english.group(1).strip()
        entry = by_en.get(name)
        if not entry:
            unmatched.append((data["title"], name))
            continue

        wiki_ability = ability_from_raw(content)
        if wiki_ability is None:
            unmatched.append((data["title"], "no 角色能力 section"))
            continue

        checked += 1
        stored = " ".join((entry.get("zh", {}).get("ability") or "").split())
        if stored != wiki_ability:
            mismatches.append((entry["id"], data["title"], stored, wiki_ability))

    print(f"checked   {checked}")
    print(f"identical {checked - len(mismatches)}")
    print(f"different {len(mismatches)}")
    if unmatched:
        print(f"unmatched {len(unmatched)}: {unmatched}")
    for cid, title, stored, wiki in mismatches:
        print(f"\n--- {cid}  ({title})")
        print(f"  repo: {stored}")
        print(f"  wiki: {wiki}")

    return 1 if mismatches else 0


if __name__ == "__main__":
    sys.exit(main())
