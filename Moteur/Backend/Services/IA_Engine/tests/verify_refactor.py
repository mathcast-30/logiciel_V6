
import sys
import os
from pathlib import Path

# Add the project root to sys.path
backend_root = Path(__file__).parent.parent.parent
sys.path.append(str(backend_root))

try:
    from Moteur.Backend.Services.IA_Engine.step_parser import StepParser, OCC_AVAILABLE
    print(f"Import successful. OCC_AVAILABLE: {OCC_AVAILABLE}")
    
    if OCC_AVAILABLE:
        # Check if we can instantiate
        # We need a dummy file, but let's just check the class structure
        print("StepParser class structure:")
        print(f"Methods: {[m for m in dir(StepParser) if not m.startswith('__')]}")
        
except Exception as e:
    print(f"Verification FAILED: {e}")
    import traceback
    traceback.print_exc()
