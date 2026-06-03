
from OCC.Core import TDataStd
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.TDF import TDF_Label, TDF_AttributeIterator
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.XCAFApp import XCAFApp_Application
import sys
import io

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
        print("Initialising Dump...")
        try:
             # Dump expects a stream usually, or just prints to stdout in C++
             # In PythonOCC, Dump usually takes standard_ostream
             # But let's try calling it simply
             # n.Dump(sys.stdout) # Might fail due to strict typing
             pass
        except Exception:
             pass
             
        # Check __swig_getmethods__
        if hasattr(n, '__swig_getmethods__'):
            print(f"Swig methods: {n.__swig_getmethods__.keys()}")
            
    itr.Next()
