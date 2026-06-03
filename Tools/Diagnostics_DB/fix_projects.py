import os

file_path = r'c:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\Frontend\src\pages\Projects.tsx'

with open(file_path, 'rb') as f:
    content = f.read()

# The broken section identified by bytes
# Line 579: b'                                                                 );'
# Line 580: b'                                                     })'
# Line 581: b'                                                             </tbody>'

# We know that ); and }) are what's broken.
# Let's search for the pattern around line 579.

target = b'                                                                 );\r\n                                                     })\r\n                                                             </tbody>'
# Try without \r just in case
target_no_r = b'                                                                 );\n                                                     })\n                                                             </tbody>'

replacement = b'                                                                </tr>\r\n                                                            );\r\n                                                        })}\r\n                                                </tbody>'

if target in content:
    new_content = content.replace(target, replacement)
    with open(file_path, 'wb') as f:
        f.write(new_content)
    print("Success: Fixed with CRLF")
elif target_no_r in content:
    new_content = content.replace(target_no_r, replacement.replace(b'\r\n', b'\n'))
    with open(file_path, 'wb') as f:
        f.write(new_content)
    print("Success: Fixed with LF")
else:
    # Try a more flexible search if exact match fails
    print("Exact match failed, trying flexible search...")
    # Look for the combination of ); and }) followed by </tbody>
    import re
    # Match ); followed by optional whitespace/newlines then }) then optional whitespace/newlines then </tbody>
    pattern = rb'\);\s*\}\)\s*</tbody>'
    # Wait, the python repr showed }); as possibly two lines
    # Let's just use the line numbers if possible, but that's risky.
    
    # Try to find the specific messed up part
    if b');' in content and b'})' in content:
        print("Found tokens, but pattern didn't match. Manual check required.")
    else:
        print("Tokens not found.")
