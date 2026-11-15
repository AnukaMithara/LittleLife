"""Collect native installers plus checksums. No release or signing credentials required."""
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path


def collect(target: str, label: str, bundle: str, commit: str, root: Path = Path('.')) -> Path:
    if not re.fullmatch(r'[a-z0-9-]+', label):
        raise ValueError('Use a simple platform label.')
    release = root / 'src-tauri' / 'target' / target / 'release'
    installers = sorted((release / 'bundle' / bundle).glob('*.exe' if bundle == 'nsis' else '*.dmg'))
    if not installers:
        raise RuntimeError('No installer was produced; refusing to publish an empty test build.')
    output = root / 'dist-test' / label
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)
    for source in installers:
        shutil.copy2(source, output / source.name)
    if bundle == 'nsis':
        portable = release / 'littlelife.exe'
        if not portable.is_file():
            raise RuntimeError('The Windows application binary is missing.')
        shutil.copy2(portable, output / 'LittleLife.exe')
    (output / 'BUILD.json').write_text(json.dumps({
        'product': 'LittleLife', 'channel': 'unsigned-test', 'platform': label,
        'target': target, 'source_commit': commit, 'signed_release': False,
    }, indent=2) + '\n', encoding='utf-8')
    (output / 'README.txt').write_text(
        'LittleLife test build\n\n'
        'This is an unsigned test build, not a signed or notarized public release.\n'
        'Choose the installer matching your OS and CPU architecture.\n'
        'Windows: prefer the setup installer. The portable EXE needs WebView2 installed.\n'
        'macOS: open the matching DMG and copy LittleLife to Applications.\n'
        'If the operating system blocks an unsigned build, use the documented developer setup or wait for signed distribution.\n\n'
        'Recovery: use the LittleLife tray/menu-bar icon, then Interact / restore clicks.\n'
        'Reset position recovers a companion from a removed display. Quit exits the process.\n'
        'Jev is optional and off at launch. No API key is included.\n\n'
        'BUILD.json identifies the checked-out source commit. SHA256SUMS checks file integrity; it is not a code-signing certificate.\n'
        'Source and testing instructions: https://github.com/AnukaMithara/LittleLife\n', encoding='utf-8')
    files = sorted(p for p in output.iterdir() if p.is_file() and p.name != 'SHA256SUMS')
    (output / 'SHA256SUMS').write_text(''.join(
        f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in files
    ), encoding='utf-8')
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for name in ('target', 'label', 'bundle', 'commit'):
        parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    print(collect(args.target, args.label, args.bundle, args.commit))
