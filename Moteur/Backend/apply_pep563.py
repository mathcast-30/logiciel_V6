
import os
import re

def fix_python_files(root_dir):
    print(f"Scanning directory: {root_dir}")
    
    ignore_folders = {
        'venv', '.venv', 'env', '.env', 'node_modules', 
        '__pycache__', '.git', '.github', '.vscode', '.history'
    }

    python_files = []
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in ignore_folders]
        for file in files:
            if file.endswith(".py") and file != "apply_pep563.py":
                python_files.append(os.path.join(root, file))

    future_import = "from __future__ import annotations\n"
    
    # Very permissive regex to find ANY single pipe that is likely a type union
    # We check if it's on a line that looks like an annotation (has : or ->)
    # or just if it has a pipe at all.
    pipe_regex = re.compile(r"\|")

    fixed_count = 0
    skipped_count = 0
    already_has_count = 0

    for file_path in python_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            if "from __future__ import annotations" in content:
                already_has_count += 1
                continue

            # Look for pipes in the code (ignoring comments)
            has_pipe = False
            for line in content.splitlines():
                code_part = line.split('#')[0]
                if '|' in code_part:
                    # Check if it's not a bitwise OR in a non-annotation context?
                    # Actually, for 3.9 compatibility, it's safer to just add it if ANY pipe is found
                    # provided it's likely a type hint.
                    # Commonly: 'int | None', 'str | int', etc.
                    has_pipe = True
                    break

            if has_pipe:
                lines = content.splitlines(keepends=True)
                
                insertion_index = 0
                # Skip shebang
                if lines and lines[0].startswith("#!"):
                    insertion_index = 1
                
                # Skip encoding
                if insertion_index < len(lines) and ("coding:" in lines[insertion_index] or "-*- coding" in lines[insertion_index]):
                    insertion_index += 1

                # If there's a docstring, we MUST put it AFTER it or BEFORE it?
                # PEP 236: "it must precede any other statements except another future statement."
                # Docstring IS a statement (it's a string literal).
                # Actually, many tools prefer it AFTER the docstring but BEFORE imports.
                # However, Python REQUIRES it to be the first non-comment, non-docstring statement.
                # Let's put it at the very top (after shebang/encoding) to be safe.
                
                lines.insert(insertion_index, future_import)
                if insertion_index + 1 < len(lines) and lines[insertion_index+1].strip() != "":
                    # Add a blank line if the next line is not blank
                    lines.insert(insertion_index + 1, "\n")
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)
                
                print(f"[FIXED] {file_path}")
                fixed_count += 1
            else:
                skipped_count += 1

        except Exception as e:
            print(f"[ERROR] Could not process {file_path}: {e}")

    print("\nSummary:")
    print(f"Total files scanned: {len(python_files)}")
    print(f"Files fixed: {fixed_count}")
    print(f"Files skipped (no '|' usage): {skipped_count}")
    print(f"Files already compatible: {already_has_count}")

if __name__ == "__main__":
    target = r"C:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\Backend"
    fix_python_files(target)
