# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:\\Users\\Mathe\\Documents\\Matheo\\passion\\logiciel\\logiciel_V6\\Moteur\\Backend\\System\\Bin\\run_app.py'],
    pathex=[],
    binaries=[],
    datas=[('C:\\Users\\Mathe\\Documents\\Matheo\\passion\\logiciel\\logiciel_V6\\Moteur\\Frontend\\dist', 'frontend_dist'), ('C:\\Users\\Mathe\\Documents\\Matheo\\passion\\logiciel\\logiciel_V6\\Moteur\\Backend\\System\\Bin\\app\\migrations', 'app/migrations'), ('C:\\Users\\Mathe\\Documents\\Matheo\\passion\\logiciel\\logiciel_V6\\Moteur\\Backend\\Services\\IA_Engine', 'IA_Engine')],
    hiddenimports=['uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto', 'uvicorn.lifespan', 'uvicorn.lifespan.on', 'sqlalchemy.dialects.sqlite', 'passlib.handlers.bcrypt', 'email_validator'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'IPython', 'pytest', 'sphinx'],
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
    name='OptiCutPro',
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
)
