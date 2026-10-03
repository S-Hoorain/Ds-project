"""Append a snapshot of HANDOFF.md to logs/HANDOFF_LOG.md.

Runs as a Claude Code PostToolUse hook (Write|Edit). It reads the hook payload
from stdin and does nothing unless the edited file is HANDOFF.md at the project
root. It can also be run by hand (`python .claude/hooks/log_handoff.py`) to log
the current handoff, e.g. after a teammate edits HANDOFF.md outside Claude.

Behaviour:
  * Over 400 lines -> nothing is logged; exit code 2 sends a message back to
    Claude asking it to trim the handoff and rewrite it.
  * Same content as the last logged snapshot -> skipped (no duplicates).
  * Otherwise -> appended to the log with a timestamp header.
"""

import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

MAX_LINES = 400
ROOT = Path(__file__).resolve().parents[2]
HANDOFF = ROOT / "HANDOFF.md"
LOG = ROOT / "logs" / "HANDOFF_LOG.md"
HASH_FILE = ROOT / "logs" / ".handoff_last_hash"


def edited_path_from_stdin():
    """Return the file path from the hook payload, or None if run by hand."""
    if sys.stdin is None or sys.stdin.isatty():
        return None
    raw = sys.stdin.read().strip()
    if not raw:
        return None
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return None
    tool_input = payload.get("tool_input") or {}
    return tool_input.get("file_path")


def main():
    edited = edited_path_from_stdin()
    if edited is not None and Path(edited).resolve() != HANDOFF.resolve():
        return 0  # Some other file was edited; not our business.
    if not HANDOFF.exists():
        return 0

    text = HANDOFF.read_text(encoding="utf-8")
    n_lines = len(text.splitlines())
    if n_lines > MAX_LINES:
        print(
            f"HANDOFF.md is {n_lines} lines; the limit is {MAX_LINES}. "
            "It was NOT logged. Condense it and rewrite it in a single Write.",
            file=sys.stderr,
        )
        return 2

    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    if HASH_FILE.exists() and HASH_FILE.read_text().strip() == digest:
        return 0  # Already logged this exact version.

    LOG.parent.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with LOG.open("a", encoding="utf-8") as f:
        f.write(f"\n\n<!-- ===== HANDOFF SNAPSHOT {stamp} ===== -->\n")
        f.write(f"# Snapshot: {stamp}\n\n")
        f.write(text.rstrip() + "\n")
    HASH_FILE.write_text(digest)
    return 0


if __name__ == "__main__":
    sys.exit(main())
