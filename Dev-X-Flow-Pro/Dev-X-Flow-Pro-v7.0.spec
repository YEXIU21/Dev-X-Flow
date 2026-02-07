# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['Dev-X-Flow-Pro.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('devXflowpro.png', '.'),
        ('app.ico', '.'),
        ('..\\DATABASE IMPORTER\\mysql_master.ps1', 'DATABASE IMPORTER'),
        ('..\\DATABASE IMPORTER\\mysql_master.bat', 'DATABASE IMPORTER'),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='Dev-X-Flow-Pro-v7.0',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['app.ico'],
    onefile=True,
)
