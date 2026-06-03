
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.TDF import TDF_Attribute

try:
    print("Attempting TDataStd_Name()...")
    n = TDataStd_Name()
    print("Success TDataStd_Name()")
except Exception as e:
    print(f"Failed TDataStd_Name(): {e}")

try:
    print("Attempting TDF_Attribute()...")
    a = TDF_Attribute()
    print("Success TDF_Attribute()")
except Exception as e:
    print(f"Failed TDF_Attribute(): {e}")

# Check for Handle classes
try:
    from OCC.Core.TDataStd import Handle_TDataStd_Name
    print("Found Handle_TDataStd_Name")
    h = Handle_TDataStd_Name()
    print("Success Handle_TDataStd_Name instantiation")
except ImportError:
    print("Handle_TDataStd_Name not found in TDataStd")
except Exception as e:
    print(f"Handle_TDataStd_Name instantiation failed: {e}")

# Check TDataStd_Name static methods
print("Dir TDataStd_Name:", dir(TDataStd_Name))
