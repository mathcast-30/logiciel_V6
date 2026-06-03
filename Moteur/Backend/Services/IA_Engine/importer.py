"""
CSV/Excel import module for OptiCut Pro.

Handles importing parts from CSV and Excel files.
"""

import csv
import io
from typing import List, Dict, Any
from openpyxl import load_workbook


class PartsImporter:
    """Import parts from various file formats."""
    
    REQUIRED_COLUMNS = ['name', 'width', 'height']
    OPTIONAL_COLUMNS = ['quantity', 'material', 'allow_rotation', 'edge_banding', 'notes']
    
    def import_csv(self, content: bytes, encoding: str = 'utf-8') -> List[Dict[str, Any]]:
        """
        Import parts from CSV content.
        
        Expected columns: name, width, height, quantity (optional), material (optional)
        """
        text = content.decode(encoding)
        reader = csv.DictReader(io.StringIO(text), delimiter=';')
        
        # Also try comma delimiter if semicolon doesn't work
        if not reader.fieldnames or len(reader.fieldnames) < 3:
            text = content.decode(encoding)
            reader = csv.DictReader(io.StringIO(text), delimiter=',')
        
        return self._parse_rows(list(reader))
    
    def import_excel(self, content: bytes) -> List[Dict[str, Any]]:
        """
        Import parts from Excel content.
        
        Reads the first sheet, first row as headers.
        """
        wb = load_workbook(io.BytesIO(content), read_only=True)
        ws = wb.active
        
        rows = list(ws.rows)
        if not rows:
            return []
        
        # First row is headers
        headers = [str(cell.value).lower().strip() if cell.value else '' for cell in rows[0]]
        
        data = []
        for row in rows[1:]:
            row_dict = {}
            for i, cell in enumerate(row):
                if i < len(headers) and headers[i]:
                    row_dict[headers[i]] = cell.value
            if row_dict:
                data.append(row_dict)
        
        wb.close()
        return self._parse_rows(data)
    
    def _parse_rows(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parse and validate rows into parts format."""
        parts = []
        
        for row in rows:
            # Normalize column names (handle French/English variations)
            normalized = self._normalize_row(row)
            
            # Skip empty rows
            if not normalized.get('name') or not normalized.get('width') or not normalized.get('height'):
                continue
            
            try:
                part = {
                    'name': str(normalized['name']).strip(),
                    'width': float(normalized['width']),
                    'height': float(normalized['height']),
                    'quantity': int(normalized.get('quantity', 1) or 1),
                    'allow_rotation': self._parse_bool(normalized.get('allow_rotation', True)),
                    'edge_banding': str(normalized.get('edge_banding', '') or ''),
                    'notes': str(normalized.get('notes', '') or ''),
                    'material_name': str(normalized.get('material', '') or '').strip(),
                }
                
                # Validate dimensions
                if part['width'] <= 0 or part['height'] <= 0:
                    continue
                
                parts.append(part)
            except (ValueError, TypeError):
                continue
        
        return parts
    
    def _normalize_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize column names to handle variations."""
        # Column name mappings (French variations)
        mappings = {
            'nom': 'name',
            'piece': 'name',
            'pièce': 'name',
            'largeur': 'width',
            'longueur': 'width',
            'l': 'width',
            'hauteur': 'height',
            'h': 'height',
            'profondeur': 'height',
            'quantite': 'quantity',
            'quantité': 'quantity',
            'qte': 'quantity',
            'qty': 'quantity',
            'materiau': 'material',
            'matériau': 'material',
            'mat': 'material',
            'rotation': 'allow_rotation',
            'chant': 'edge_banding',
            'chants': 'edge_banding',
            'note': 'notes',
            'remarque': 'notes',
        }
        
        normalized = {}
        for key, value in row.items():
            if key is None:
                continue
            key_lower = str(key).lower().strip()
            mapped_key = mappings.get(key_lower, key_lower)
            normalized[mapped_key] = value
        
        return normalized
    
    def _parse_bool(self, value: Any) -> bool:
        """Parse various boolean representations."""
        if isinstance(value, bool):
            return value
        if value is None:
            return True  # Default to allowing rotation
        
        str_val = str(value).lower().strip()
        return str_val in ('1', 'true', 'oui', 'yes', 'o', 'y', 'vrai')
    
    def get_template_csv(self) -> str:
        """Return a CSV template string."""
        return """nom;largeur;hauteur;quantité;matériau;rotation;chants;notes
Porte haute;600;400;2;Mélaminé Blanc;oui;L,R;
Côté gauche;800;300;1;Mélaminé Blanc;non;H,B;Attention sens du fil
Étagère;500;200;4;Mélaminé Blanc;oui;;
Fond;600;800;1;Contreplaqué 5mm;oui;;"""
    
    def get_template_headers(self) -> List[str]:
        """Return template headers."""
        return ['nom', 'largeur', 'hauteur', 'quantité', 'matériau', 'rotation', 'chants', 'notes']
