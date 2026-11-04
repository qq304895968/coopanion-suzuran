"""Syntax-only check; never start sidecars or capture the desktop."""
import ast
from pathlib import Path

root = Path(__file__).resolve().parents[1]
files = [*root.glob("coo-screen/sidecar/*.py"), *root.glob("qq-final/*.py")]
for path in files:
    ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
print(f"Parsed {len(files)} Python sidecar files (no sidecars executed).")
