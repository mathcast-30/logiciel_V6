
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.TDF import TDF_Label, TDF_Attribute, TDF_TagSource

# Create a dummy label structure to test FindAttribute
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.XCAFApp import XCAFApp_Application

app = XCAFApp_Application.GetApplication()
doc = TDocStd_Document("MDTV-XCAF")
app.NewDocument("MDTV-XCAF", doc)
label = doc.Main()

# Set a name to retrieve later
TDataStd_Name.Set(label, "TestName")

print("Checking TDataStd_Name...")
try:
    attr = TDataStd_Name()
    print("Created TDataStd_Name successfully")
    
    # Try calling FindAttribute
    # Signature: FindAttribute(self, theID, theAttribute) -> Standard_Boolean
    
    guid = TDataStd_Name.GetID()
    print(f"GUID: {guid}")
    
    print("Attempting FindAttribute with TDataStd_Name instance...")
    found = label.FindAttribute(guid, attr)
    print(f"FindAttribute result: {found}")
    if found:
        print(f"Name retrieved: {attr.Get()}")

except Exception as e:
    print(f"FindAttribute failed: {e}")

print("\nChecking alternatives...")
# Maybe we need to pass just the attribute type? No, signature says &Handle
