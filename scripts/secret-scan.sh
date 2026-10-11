#!/usr/bin/env bash
# Scans every tracked file for credential material before a push. GitHub's
# secret scanning stops at the first finding, so the whole tree is checked here
# first; values are never printed in full.
set -uo pipefail
cd /home/azem/projects/fastfood

python3 - <<'PY'
import re
import subprocess

PATTERNS = [
    ("AWS access key id", r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
    ("AWS session token", r"\bSessionToken\b"),
    ("private key block", r"-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----"),
    ("GitHub token", r"\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}"),
    ("Slack token", r"\bxox[baprs]-[A-Za-z0-9-]{10,}"),
    ("Stripe secret", r"\bsk_(?:live|test)_[A-Za-z0-9]{16,}"),
    ("Google API key", r"\bAIza[0-9A-Za-z_-]{35}\b"),
    ("JWT", r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    ("npm token", r"\bnpm_[A-Za-z0-9]{30,}"),
]
# A connection string with an inline password is only a finding when the host is
# not loopback: `postgresql://test:test@127.0.0.1` is a local stub.
CONN = re.compile(
    r"(?i)\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[^\s:/@]+:([^\s:/@]+)@([^\s:/@]+)"
)
INTERPOLATED = re.compile(r"^\$\{[A-Za-z_][A-Za-z0-9_]*\}$")
LOCAL_HOSTS = {"127.0.0.1", "localhost", "0.0.0.0", "::1"}

ALLOW_SUFFIX = (".example", "-lock.json")

files = subprocess.run(["git", "ls-files"], capture_output=True, text=True,
                       check=True).stdout.split()
# The scanner matches its own pattern source (the regex text parses as a
# connection string), so it never scans itself.
self_path = "scripts/secret-scan.sh"
files = [f for f in files if f != self_path]

findings = []
for path in files:
    try:
        with open(path, "rb") as fh:
            raw = fh.read()
    except (OSError, IsADirectoryError):
        continue
    if b"\x00" in raw[:8192]:
        continue
    text = raw.decode("utf-8", errors="ignore")
    is_example = path.endswith(ALLOW_SUFFIX)
    for name, pattern in PATTERNS:
        for m in re.finditer(pattern, text):
            findings.append((name, path, text.count("\n", 0, m.start()) + 1,
                             "example" if is_example else "REVIEW"))
    if not is_example:
        for m in CONN.finditer(text):
            # `${VAR}` is a deploy-time interpolation, not credential material.
            if INTERPOLATED.match(m.group(1)):
                continue
            if m.group(2).lower() not in LOCAL_HOSTS:
                findings.append(("remote DB with inline password", path,
                                 text.count("\n", 0, m.start()) + 1, "REVIEW"))

print(f"scanned {len(files)} tracked files")
blocking = [f for f in findings if f[3] != "example"]
if not blocking:
    print("PASS: no credential material that would block a push")
    examples = [f for f in findings if f[3] == "example"]
    for name, path, line, _ in examples:
        print(f"  [example, allowed] {name}: {path}:{line}")
    raise SystemExit(0)

print(f"\nBLOCKING {len(blocking)} finding(s):")
for name, path, line, _ in blocking:
    print(f"  {name}: {path}:{line}")
raise SystemExit(1)
PY