import re
import os
from OCC.Core.TDF import TDF_AttributeIterator, TDF_LabelSequence, TDF_Label
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.STEPCAFControl import STEPCAFControl_Reader
from OCC.Core.XCAFApp import XCAFApp_Application
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
from OCC.Core.Interface import Interface_Static
from OCC.Core.TopExp import TopExp_Explorer
from OCC.Core.TopAbs import TopAbs_SOLID
from OCC.Core.TopoDS import topods

def test_file(filepath):
    print(f"\n==========================================")
    print(f"Testing file: {os.path.basename(filepath)}")
    print(f"==========================================")
    Interface_Static.SetIVal('read.stepcaf.subshapes.name', 1)
    app = XCAFApp_Application.GetApplication()
    doc = TDocStd_Document('XmlXCAF')
    app.NewDocument('MDTV-XCAF', doc)
    reader = STEPCAFControl_Reader()
    reader.SetNameMode(True)
    reader.ReadFile(filepath)
    reader.Transfer(doc)
    shape_tool = XCAFDoc_DocumentTool.ShapeTool(doc.Main())

    def label_name(lbl: TDF_Label) -> str:
        it = TDF_AttributeIterator(lbl)
        while it.More():
            attr = it.Value()
            if hasattr(attr, 'DynamicType') and attr.DynamicType().Name() == 'TDataStd_Name':
                try:
                    name_obj = TDataStd_Name.DownCast(attr)
                    res = name_obj.Dump()
                    text = res[1] if isinstance(res, tuple) and len(res) > 1 else str(res)
                    m = re.search(r'Name=\|([^|]*)\|', text)
                    if m:
                        return m.group(1).strip()
                except Exception:
                    pass
            it.Next()
        return ''

    free_shapes = TDF_LabelSequence()
    shape_tool.GetFreeShapes(free_shapes)
    results = []

    def walk(lbl, inherited):
        name = label_name(lbl) or inherited
        if shape_tool.IsAssembly(lbl):
            comps = TDF_LabelSequence()
            shape_tool.GetComponents(lbl, comps)
            for i in range(1, comps.Length() + 1):
                comp_lbl = comps.Value(i)
                ref_lbl = TDF_Label()
                comp_name = label_name(comp_lbl) or name
                if shape_tool.GetReferredShape(comp_lbl, ref_lbl):
                    walk(ref_lbl, comp_name)
                else:
                    walk(comp_lbl, comp_name)
        else:
            shape = shape_tool.GetShape(lbl)
            if shape is not None and not shape.IsNull():
                exp = TopExp_Explorer(shape, TopAbs_SOLID)
                local_solids = []
                while exp.More():
                    solid = topods.Solid(exp.Current())
                    sub_lbl = TDF_Label()
                    sub_name = ''
                    try:
                        if shape_tool.FindSubShape(lbl, solid, sub_lbl):
                            sub_name = label_name(sub_lbl)
                    except Exception:
                        pass
                    if not sub_name:
                        try:
                            if shape_tool.FindShape(solid, sub_lbl):
                                sub_name = label_name(sub_lbl)
                        except Exception:
                            pass
                    local_solids.append((solid, sub_name))
                    exp.Next()
                
                if len(local_solids) == 1:
                    solid, sname = local_solids[0]
                    results.append(sname or name or "Piece")
                else:
                    for idx, (solid, sname) in enumerate(local_solids, 1):
                        if sname:
                            results.append(sname)
                        elif name:
                            results.append(f"{name}_{idx}")
                        else:
                            results.append(f"Piece_{idx}")

    for i in range(1, free_shapes.Length() + 1):
        walk(free_shapes.Value(i), '')

    print(f"Total parts found: {len(results)}")
    for r in results[:15]:
        print(f"  - {r}")
    if len(results) > 15:
        print(f"  ... (+{len(results) - 15} autres pièces)")

for f in [
    'Moteur/UserData/StepFiles/1_20260904_125216_table_maia_v2.step',
    'Moteur/UserData/StepFiles/6_20260904_183315_portillon.step',
    'Moteur/UserData/StepFiles/4_20260221_152654_plateau vf2.step',
]:
    if os.path.exists(f):
        test_file(f)
