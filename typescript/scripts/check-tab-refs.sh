#!/usr/bin/env bash
# ABOUTME: Verifies every [button label="..."](tab-N) in every assignment against
# the tab that position actually holds.
#
# `tab-N` is a zero-indexed POSITION in the assignment's `tabs:` list, not an id.
# Insert a tab at the top, or reorder two, and every button below it points
# somewhere else - with no validation error, no warning, and no symptom until an
# attendee clicks "Temporal UI" and lands in a terminal.
#
# Run from anywhere:  typescript/scripts/check-tab-refs.sh
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
instruqt_dir="${1:-${here}/../instruqt}"

python3 - "$instruqt_dir" <<'PY'
import re
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
assignments = sorted(root.glob("*/assignment.md"))

if not assignments:
    print(f"FAIL: no assignment.md found under {root}")
    sys.exit(1)

BUTTON = re.compile(r'\[button\s+label="([^"]*)"[^\]]*\]\(tab-(\d+)\)')
TAB_TITLE = re.compile(r'^-\s+title:\s*(.+?)\s*$')

failures = 0

for path in assignments:
    text = path.read_text()
    lines = text.splitlines()

    # Frontmatter: between the first '---' and the next one.
    if not lines or lines[0].strip() != "---":
        print(f"FAIL {path}: no YAML frontmatter")
        failures += 1
        continue
    try:
        end = next(i for i, l in enumerate(lines[1:], start=1) if l.strip() == "---")
    except StopIteration:
        print(f"FAIL {path}: unterminated frontmatter")
        failures += 1
        continue

    front = lines[1:end]

    # The tabs: block runs until the next top-level key.
    try:
        start = next(i for i, l in enumerate(front) if l.rstrip() == "tabs:")
    except StopIteration:
        print(f"FAIL {path}: no tabs: block")
        failures += 1
        continue

    titles = []
    for line in front[start + 1:]:
        if line and not line[0].isspace() and not line.startswith("-"):
            break  # next top-level key
        m = TAB_TITLE.match(line)
        if m:
            titles.append(m.group(1).strip("'\""))

    if not titles:
        print(f"FAIL {path}: tabs: block has no titles")
        failures += 1
        continue

    refs = BUTTON.findall(text)
    if not refs:
        print(f"WARN {path}: no tab buttons at all")

    bad = 0
    for label, index in refs:
        i = int(index)
        if i >= len(titles):
            print(f"FAIL {path}: [{label}](tab-{i}) is out of range; only {len(titles)} tabs")
            bad += 1
        elif titles[i] != label:
            print(f"FAIL {path}: [{label}](tab-{i}) but tab {i} is titled {titles[i]!r}")
            bad += 1

    # Every declared tab should be reachable from at least one button.
    referenced = {int(i) for _, i in refs}
    for i, title in enumerate(titles):
        if i not in referenced:
            print(f"WARN {path}: tab {i} ({title!r}) is never linked from a button")

    failures += bad
    status = "FAIL" if bad else "ok"
    print(f"{status:>4}  {path.parent.name}: {len(refs)} refs across {len(titles)} tabs "
          f"[{', '.join(f'{i}={t}' for i, t in enumerate(titles))}]")

print()
if failures:
    print(f"{failures} bad tab reference(s).")
    sys.exit(1)
print("All tab references match their tab titles.")
PY
