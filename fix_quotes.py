import os

file_path = r'c:\Users\Mathe\Documents\Matheo\logiciel\logiciel_V6\Moteur\Frontend\src\pages\Stock.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(r"\'none\'", "'none'")

with open(file_path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Replacement successful.")
