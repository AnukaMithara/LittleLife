"""Verify the actual app shipped inside the DMG, without executing it."""
import argparse
import plistlib
import subprocess
import tempfile
from pathlib import Path


def verify(target: str) -> None:
    architecture = {'aarch64-apple-darwin': 'arm64', 'x86_64-apple-darwin': 'x86_64'}[target]
    folder = Path('src-tauri/target') / target / 'release/bundle/dmg'
    images = list(folder.glob('*.dmg'))
    if len(images) != 1:
        raise RuntimeError('Expected exactly one freshly built Mac disk image.')
    subprocess.run(['hdiutil', 'verify', str(images[0])], check=True)
    with tempfile.TemporaryDirectory(prefix='littlelife-dmg-') as directory:
        mount = Path(directory) / 'volume'
        mount.mkdir()
        subprocess.run(['hdiutil', 'attach', str(images[0]), '-readonly', '-nobrowse',
                        '-mountpoint', str(mount)], check=True)
        try:
            app = mount / 'LittleLife.app'
            subprocess.run(['codesign', '--verify', '--deep', '--strict', '--verbose=2', str(app)], check=True)
            signature = subprocess.run(['codesign', '--display', '--verbose=4', str(app)],
                                       check=True, capture_output=True, text=True).stderr
            if 'Signature=adhoc' not in signature:
                raise RuntimeError('Preview builds must have the configured ad-hoc signature.')
            info = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
            if info.get('CFBundleIdentifier') != 'io.github.anukamithara.littlelife':
                raise RuntimeError('Unexpected app identity inside the disk image.')
            binary = app / 'Contents/MacOS' / info['CFBundleExecutable']
            actual = subprocess.check_output(['lipo', '-archs', str(binary)], text=True).split()
            if actual != [architecture]:
                raise RuntimeError(f'Expected {architecture}; found {actual}.')
            print(f'Verified DMG integrity, ad-hoc app signature and {architecture} executable.')
            print('This verifies bundle integrity, not Developer ID trust or notarization.')
        finally:
            subprocess.run(['hdiutil', 'detach', str(mount)], check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', required=True,
                        choices=['aarch64-apple-darwin', 'x86_64-apple-darwin'])
    verify(parser.parse_args().target)
