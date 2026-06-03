
from OCC.Core import TDataStd
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.TDF import TDF_Label, TDF_AttributeIterator
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.XCAFApp import XCAFApp_Application

app = XCAFApp_Application.GetApplication()
doc = TDocStd_Document("MDTV-XCAF")
app.NewDocument("MDTV-XCAF", doc)
label = doc.Main()
TDataStd_Name.Set(label, "TestName")

print("Checking TDataStd module content:")
print(dir(TDataStd))

itr = TDF_AttributeIterator(label)
while itr.More():
    attr = itr.Value()
    if attr.ID() == TDataStd_Name.GetID():
        n = TDataStd_Name.DownCast(attr)
        print(f"Name instance: {n}")
        # Check hidden props
        print(f"Vars: {vars(n) if hasattr(n, '__dict__') else 'No dict'}")
    itr.Next()
