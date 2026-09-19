#!/usr/bin/env python3
"""
Build the final deliverable project package: public/ferdous-platform.zip

The /download page must ONLY exist in the preview environment so the developer
can fetch the finished source package. It must NOT ship inside the delivered
project. This script therefore excludes everything download-related, plus all
secrets and build artifacts, so the shipped zip is clean and servable.

Usage:
    python3 scripts/make-download-package.py

Output:
    public/ferdous-platform.zip  (served by the /download page)
"""
import os
import zipfile

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
OUT = os.path.join(SRC, 'public', 'ferdous-platform.zip')

# Directories never shipped (build tooling, VCS, secrets, runtime artifacts)
EXCLUDE_DIRS = {
    'node_modules', '.next', '.git', '.gitlab-ci', '.github',
    '.wrangler', '.open-next', 'remote-control', 'attachements',
}

# Relative paths never shipped (the preview-only download feature + the zip itself)
EXCLUDE_PATHS = [
    'app/download',
    'app/api/download',
    'public/ferdous-platform.zip',
]

# File basenames never shipped anywhere
EXCLUDE_NAMES = {
    '.env', 'tsconfig.tsbuildinfo',
}


def excluded(rel: str) -> bool:
    parts = rel.split(os.sep)
    for p in parts:
        if p in EXCLUDE_DIRS:
            return True
    for base in EXCLUDE_PATHS:
        if rel == base or rel.startswith(base + os.sep):
            return True
    name = parts[-1]
    if name in EXCLUDE_NAMES:
        return True
    if name.startswith('BUILD_TRIGGER'):
        return True
    if name == '.env' or ('.env.' in name and not name.endswith('.example')):
        return True
    return False


def main() -> None:
    count = 0
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
        for base, dirs, files in os.walk(SRC):
            dirs[:] = [
                d for d in dirs
                if not excluded(os.path.relpath(os.path.join(base, d), SRC))
            ]
            for f in files:
                full = os.path.join(base, f)
                rel = os.path.relpath(full, SRC)
                if excluded(rel):
                    continue
                z.write(full, rel)
                count += 1
    size_mb = round(os.path.getsize(OUT) / 1024 / 1024, 2)
    download_entries = [
        n for n in zipfile.ZipFile(OUT).namelist()
        if '/download' in n or n.startswith('download')
    ]
    assert not download_entries, f'download related files leaked: {download_entries}'
    print(f'Wrote {OUT} with {count} files ({size_mb} MB)')
    print('Download feature excluded: OK')


if __name__ == '__main__':
    main()
