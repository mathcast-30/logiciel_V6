
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.TDF import TDF_Label, TDF_AttributeIterator
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.XCAFApp import XCAFApp_Application

app = XCAFApp_Application.GetApplication()
doc = TDocStd_Document("MDTV-XCAF")
app.NewDocument("MDTV-XCAF", doc)
label = doc.Main()
TDataStd_Name.Set(label, "TestName")

try:
    itr = TDF_AttributeIterator(label)
    while itr.More():
        attr = itr.Value()
        if attr.ID() == TDataStd_Name.GetID():
            n = TDataStd_Name.DownCast(attr)
            print(f"Name object: {n}")
            print(f"Dir: {dir(n)}")
            break
        itr.Next()

except Exception as e:
    print(f"Fail: {e}")
