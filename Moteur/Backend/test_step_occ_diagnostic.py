"""
Standalone Diagnostic Script for pythonOCC and STEP Parser.
Verify OCC submodule availability and environment configuration.
"""
import sys
import os
from pathlib import Path

# Add project paths to sys.path for direct testing
current_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(current_dir / "Services"))

def test_occ_imports():
    print("\n=== pythonOCC Diagnostic Report ===")
    print(f"Python Executable: {sys.executable}")
    print(f"Python Version: {sys.version}")
    
    results = []
    
    # 1. Basic OCC module
    try:
        import OCC
        print(f"[PASS] OCC module found at: {os.path.dirname(OCC.__file__)}")
        results.append(True)
    except ImportError as e:
        print(f"[FAIL] OCC module NOT found: {e}")
        results.append(False)
        return False # Stop here if core is missing
        
    # 2. Critical sub-modules for STEP import
    submodules = [
        "OCC.Core.STEPCAFControl",
        "OCC.Core.XCAFApp",
        "OCC.Core.TDocStd",
        "OCC.Core.Bnd",
        "OCC.Core.BRepBndLib",
        "OCC.Core.BRepGProp"
    ]
    
    for mod in submodules:
        try:
            __import__(mod)
            print(f"[PASS] {mod} imported successfully")
            results.append(True)
        except ImportError as e:
            print(f"[FAIL] {mod} import FAILED: {e}")
            results.append(False)
            
    # 3. Check for OBB support (requires relatively modern OCC)
    try:
        from OCC.Core.Bnd import Bnd_OBB
        print("[PASS] Bnd_OBB found (OBB calculation supported)")
        results.append(True)
    except ImportError:
        print("[FAIL] Bnd_OBB NOT found (OBB calculation will fail)")
        results.append(False)

    print("\n--- Summary ---")
    if all(results):
        print("RESULT: pythonOCC is CORRECTLY installed and configured.")
        return True
    else:
        print("RESULT: pythonOCC installation is INCOMPLETE or INCOMPATIBLE.")
        return False

def test_extractor_initialization():
    print("\n=== StepExtractor Initialization Test ===")
    try:
        import IA_Engine.step_parser as step_parser
        print(f"Module file: {step_parser.__file__}")
        print(f"OCC_AVAILABLE: {step_parser.OCC_AVAILABLE}")
        print(f"OCC_VERSION: {step_parser.OCC_VERSION}")
        if not step_parser.OCC_AVAILABLE:
            print(f"OCC_IMPORT_ERROR: {step_parser.OCC_IMPORT_ERROR}")
        
        if step_parser.OCC_AVAILABLE:
            print("[PASS] StepExtractor initialized with OCC support")
            return True
        else:
            print("[FAIL] StepExtractor initialized WITHOUT OCC support")
            return False
    except Exception as e:
        print(f"[ERROR] Failed to import StepExtractor: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    s1 = test_occ_imports()
    s2 = test_extractor_initialization()
    
    if s1 and s2:
        print("\n✅ DIAGNOSTIC SUCCESSFUL")
        sys.exit(0)
    else:
        print("\n❌ DIAGNOSTIC FAILED")
        sys.exit(1)
