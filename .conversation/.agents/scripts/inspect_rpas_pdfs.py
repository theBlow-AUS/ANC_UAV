import argparse
import re
from pathlib import Path

import fitz


parser = argparse.ArgumentParser()
parser.add_argument("pdf")
parser.add_argument("--render-dir")
parser.add_argument("--keywords", default="")
parser.add_argument("--max-page-chars", type=int, default=6000)
args = parser.parse_args()

doc = fitz.open(args.pdf)
print(f"FILE: {Path(args.pdf).name}")
print(f"PAGE_COUNT: {len(doc)}")
print(f"METADATA: {doc.metadata}")

render_dir = Path(args.render_dir) if args.render_dir else None
if render_dir:
    render_dir.mkdir(parents=True, exist_ok=True)

terms = [term.strip() for term in args.keywords.split("|") if term.strip()]
patterns = [re.compile(re.escape(term), re.IGNORECASE) for term in terms]

for index, page in enumerate(doc):
    if render_dir:
        pix = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
        pix.save(render_dir / f"page-{index + 1:03}.png")

    if not patterns:
        continue
    text = page.get_text("text")
    matched = [term for term, pattern in zip(terms, patterns) if pattern.search(text)]
    if matched:
        print(f"\n--- PAGE {index + 1}; MATCHES: {', '.join(matched)} ---")
        print(text[: args.max_page_chars])
