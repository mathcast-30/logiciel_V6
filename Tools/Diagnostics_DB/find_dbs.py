
import os
from pathlib import Path

search_root = r"C:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation"
output_file = r"C:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\db_search_results.txt"

results = []
for root, dirs, files in os.walk(search_root):
    for file in files:
        if file.endswith(".db"):
            full_path = os.path.join(root, file)
            try:
                size = os.path.getsize(full_path)
                mtime = os.path.getmtime(full_path)
                results.append(f"{full_path} | {size} bytes | {mtime}")
            except:
                pass

with open(output_file, "w", encoding="utf-8") as f:
    f.write("\n".join(results))

print("Search complete.")
