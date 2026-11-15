import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from package_test_build import collect


class PackagingTests(unittest.TestCase):
    def test_rejects_missing_installer(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(RuntimeError):
                collect('target', 'test', 'nsis', 'sha', Path(directory))

    def test_collects_installer_portable_and_verified_checksums(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            release = root / 'src-tauri/target/test-target/release'
            installer = release / 'bundle/nsis/LittleLife-setup.exe'
            installer.parent.mkdir(parents=True)
            installer.write_bytes(b'installer fixture')
            (release / 'littlelife.exe').write_bytes(b'portable fixture')
            output = collect('test-target', 'windows-x64', 'nsis', 'commit-fixture', root)
            self.assertEqual(json.loads((output / 'BUILD.json').read_text())['source_commit'], 'commit-fixture')
            self.assertEqual((output / 'LittleLife.exe').read_bytes(), b'portable fixture')
            for line in (output / 'SHA256SUMS').read_text().splitlines():
                digest, name = line.split('  ', 1)
                self.assertEqual(hashlib.sha256((output / name).read_bytes()).hexdigest(), digest)


if __name__ == '__main__':
    unittest.main()
