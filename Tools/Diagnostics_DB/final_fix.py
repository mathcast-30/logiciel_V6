import re
import os

file_path = r'c:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\Frontend\src\pages\Projects.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line lines are 0-indexed. 
# Line 579 is index 578.
# Line 580 is index 579.
# Line 581 is index 580.

if ");" in lines[578] and "})" in lines[579]:
    print("Found matching lines at 579 and 580. Fixing...")
    # Restore </tr>
    # Line 579:                                                                 );
    # Line 580:                                                     })
    
    # We want:
    # 579:                                                                 </tr>
    # 580:                                                             );
    # 581:                                                         })}
    
    # Actually, let's just replace the whole slice
    lines[578] = "                                                                </tr>\n"
    lines[579] = "                                                            );\n"
    lines[580] = "                                                        })}\n"
    # Wait, we need to push the </tbody> line down
    lines.insert(581, "                                                </tbody>\n")
    # Wait, line 581 was </tbody> but it might have changed index
    # Original 581 was </tbody>
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Success: Fixed lines 579-581")
else:
    print(f"Could not find tokens at expected lines. Line 579: {repr(lines[578])}, Line 580: {repr(lines[579])}")
    # Try flexible search
    content = "".join(lines)
    # Match the broken part: aria-label... then </button>... </div>... </td>... ); ... }) ... </tbody>
    pattern = r'(aria-label="Supprimer la pièce".+?</button>\s+?</div>\s+?</td>)\s*;\s*\}\)\s*(</tbody>)'
    if re.search(pattern, content, re.DOTALL):
        print("Found pattern with regex. Fixing...")
        fixed_content = re.sub(pattern, r'\1\n                                                            </tr>\n                                                        );\n                                                    })\n                                                \2', content, flags=re.DOTALL)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print("Success: Fixed with regex")
    else:
        print("Regex failed to find pattern.")
