
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.TDF import TDF_Label, TDF_AttributeIterator
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.XCAFApp import XCAFApp_Application

app = XCAFApp_Application.GetApplication()
doc = TDocStd_Document("MDTV-XCAF")
app.NewDocument("MDTV-XCAF", doc)
label = doc.Main()
TDataStd_Name.Set(label, "TestName")

print("Testing TDF_AttributeIterator...")
try:
    itr = TDF_AttributeIterator(label)
    found = False
    while itr.More():
        attr = itr.Value()
        print(f"Attr GUID: {attr.ID()}")
        if attr.ID() == TDataStd_Name.GetID():
            print("Found Name attribute via iterator!")
            n = TDataStd_Name.DownCast(attr)
            print(f"Name: {n.Get()}")
            found = True
        itr.Next()
    
    if not found:
        print("Name attribute not found via iterator")
        
except Exception as e:
    print(f"Iterator failed: {e}")
