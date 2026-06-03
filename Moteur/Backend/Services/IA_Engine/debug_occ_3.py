
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.TDF import TDF_Label, TDF_Attribute
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.XCAFApp import XCAFApp_Application

# Setup
app = XCAFApp_Application.GetApplication()
doc = TDocStd_Document("MDTV-XCAF")
app.NewDocument("MDTV-XCAF", doc)
label = doc.Main()
TDataStd_Name.Set(label, "TestName")

print(f"Has Get? {'Get' in dir(TDataStd_Name)}")

try:
    print("Testing TDataStd_Name.Get(label)...") # Typical OCAF usage
    # In C++ internal: static Standard_Boolean Get(const TDF_Label& label, Handle(TDataStd_Name)& name)
    # OR sometimes just returns the handle.
    
    # Try 1: Pass a handle
    attr = TDataStd_Name()
    # It might be: bool TDataStd_Name.Get(label, attr)
    # But TDataStd_Name is the class. 
    # Let's check if the class has a Get attribute
    if hasattr(TDataStd_Name, 'Get'):
       # Try finding correct signature for Get
       try:
           res = TDataStd_Name.Get(label, attr)
           print(f"Get(label, attr) result: {res}")
           if res: print(f"Name: {attr.Get()}")
       except Exception as e:
           print(f"Get(label, attr) failed: {e}")
           
       try:
           res = TDataStd_Name.Get(label)
           print(f"Get(label) result: {res}")
       except Exception as e:
           print(f"Get(label) failed: {e}")

except Exception as e:
    print(f"General fail: {e}")
    
# Try FindAttribute without second arg?
try:
    guid = TDataStd_Name.GetID()
    res = label.FindAttribute(guid)
    print(f"FindAttribute(guid) result: {res}")
except Exception as e:
    print(f"FindAttribute(guid) failed: {e}")
