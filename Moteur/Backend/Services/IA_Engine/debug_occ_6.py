
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.TDF import TDF_Label, TDF_AttributeIterator
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.XCAFApp import XCAFApp_Application

app = XCAFApp_Application.GetApplication()
doc = TDocStd_Document("MDTV-XCAF")
app.NewDocument("MDTV-XCAF", doc)
label = doc.Main()
TDataStd_Name.Set(label, "TestName")

itr = TDF_AttributeIterator(label)
while itr.More():
    attr = itr.Value()
    if attr.ID() == TDataStd_Name.GetID():
        print(f"Found generic attr: {attr}")
        n = TDataStd_Name.DownCast(attr)
        print(f"DownCast result: {n}")
        print(f"Type of n: {type(n)}")
        
        # Check if n is instance
        if isinstance(n, TDataStd_Name):
            print("n is instance of TDataStd_Name")
            # Try accessing 'Get'
            try:
                print(f"Get method: {n.Get}")
                print(f"Name via Get(): {n.Get()}")
            except AttributeError:
                print("Instance has no attribute 'Get'")
                
        else:
            print("n is NOT instance of TDataStd_Name")
            
        break
    itr.Next()

# Print help
# print(help(TDataStd_Name)) # Too verbose, avoiding
