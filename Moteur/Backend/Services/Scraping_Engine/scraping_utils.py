from __future__ import annotations
import re
from typing import Optional

def clean_price(price_str):
    if not price_str: return None
    if any(x in price_str.lower() for x in ["sur devis", "devis nécessaire", "sur demande"]):
        return None
    try:
        clean = re.sub(r'[^\d.,]', '', price_str).replace(',', '.')
        if clean.count('.') > 1:
             clean = clean.replace('.', '', clean.count('.') - 1)
        return float(clean)
    except:
        return None

def extract_dimensions_from_text(text):
    if not text: return None
    text = text.lower().replace(',', '.')
    
    # Enhanced Regex for dimensions (Ep x Lar x Lon)
    # 1. 18mm x 20cm x 2.2m or 27x280x2200
    pattern = r'(\d+(?:\.\d+)?)\s*(?:mm|cm|m)?\s*[xX*]\s*(\d+(?:\.\d+)?)\s*(?:mm|cm|m)?\s*[xX*]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)'
    match = re.search(pattern, text)
    if match:
        vals = [match.group(1), match.group(2), match.group(3)]
        unit = match.group(4)
        def to_mm(v, u):
            v = float(v)
            if u == 'm': return int(v * 1000)
            if u == 'cm': return int(v * 10)
            return int(v)
        return {
            'épaisseur': to_mm(vals[0], unit),
            'largeur': to_mm(vals[1], unit),
            'longueur': to_mm(vals[2], unit),
            'formatted': f"{to_mm(vals[0], unit)}x{to_mm(vals[1], unit)}x{to_mm(vals[2], unit)}mm"
        }

    # 2. Section format: 20x40mm or 45x95
    section_match = re.search(r'(\d{1,4})\s*[xX*]\s*(\d{1,4})\s*(mm|cm)?', text)
    if section_match:
        v1 = section_match.group(1)
        v2 = section_match.group(2)
        u = section_match.group(3) or 'mm'
        def to_mm_simple(v, u):
            v = float(v)
            return int(v * 10) if u == 'cm' else int(v)
        dim1 = to_mm_simple(v1, u)
        dim2 = to_mm_simple(v2, u)
        return {
            'épaisseur': min(dim1, dim2),
            'largeur': max(dim1, dim2),
            'longueur': None,
            'formatted': f"{min(dim1, dim2)}x{max(dim1, dim2)}mm"
        }

    return None

def detect_anomalies(products: list):
    """
    Detects anomalies in prices using a simple statistical approach (Z-score).
    Flags products with prices that are significant outliers within their category/species.
    """
    if not products: return products
    
    # Group by category/essence
    groups = {}
    for p in products:
        key = p.get('essence', 'Divers')
        if key not in groups: groups[key] = []
        groups[key].append(p)
    
    for key, group in groups.items():
        prices = [p['price'] for p in group if p['price'] > 0]
        if len(prices) < 4: continue
        
        avg = sum(prices) / len(prices)
        variance = sum((x - avg) ** 2 for x in prices) / len(prices)
        std_dev = variance ** 0.5
        
        if std_dev == 0: continue
        
        for p in group:
            if p['price'] > 0:
                z_score = abs(p['price'] - avg) / std_dev
                if z_score > 3: # Outlier threshold
                    p['anomaly'] = True
                    p['anomaly_reason'] = f"Prix atypique pour {key} (Z-score: {z_score:.2f})"
    
    return products

def extract_wood_type(text):
    if not text: return None
    text = text.lower()
    woods = {
        'chêne blanc': 'Chêne', 'chêne rouge': 'Chêne', 'chêne pédonculé': 'Chêne', 'chêne vert': 'Chêne',
        'quercus alba': 'Chêne', 'quercus rubra': 'Chêne', 'quercus robur': 'Chêne', 'chêne': 'Chêne', 'chene': 'Chêne',
        'hêtre': 'Hêtre', 'hetre': 'Hêtre', 'fagus sylvatica': 'Hêtre', 'fagus': 'Hêtre',
        'frêne commun': 'Frêne', 'frêne blanc': 'Frêne', 'fraxinus excelsior': 'Frêne', 'fraxinus americana': 'Frêne', 'frêne': 'Frêne', 'frene': 'Frêne',
        'pin sylvestre': 'Pin', 'pin maritime': 'Pin', 'pin douglas': 'Pin', 'pinus sylvestris': 'Pin', 'pinus pinaster': 'Pin', 'pin': 'Pin',
        'sapin blanc': 'Sapin', 'sapin de douglas': 'Sapin', 'abies alba': 'Sapin', 'sapin': 'Sapin',
        'épicéa': 'Épicéa', 'epicea': 'Épicéa', 'picea abies': 'Épicéa', 'picea': 'Épicéa',
        'châtaignier': 'Châtaignier', 'chataignier': 'Châtaignier', 'castanea sativa': 'Châtaignier', 'castanea': 'Châtaignier',
        'peuplier tremblant': 'Peuplier', 'populus tremula': 'Peuplier', 'populus alba': 'Peuplier', 'peuplier': 'Peuplier',
        'bouleau blanc': 'Bouleau', 'betula pendula': 'Bouleau', 'betula alleghaniensis': 'Bouleau', 'bouleau': 'Bouleau',
        'noyer commun': 'Noyer', 'noyer noir': 'Noyer', 'juglans regia': 'Noyer', 'juglans nigra': 'Noyer', 'noyer': 'Noyer',
        'acajou d’afrique': 'Acajou', 'acajou d’amérique': 'Acajou', 'swietenia macrophylla': 'Acajou', 'khaya ivorensis': 'Acajou', 'acajou': 'Acajou',
        'tilleul': 'Tilleul', 'tilia cordata': 'Tilleul', 'tilia': 'Tilleul',
        'merisier': 'Merisier', 'prunus avium': 'Merisier', 'prunus': 'Merisier',
        'teck': 'Teck', 'tectona grandis': 'Teck', 'tectona': 'Teck',
        'iroko': 'Iroko', 'milicia excelsa': 'Iroko', 'milicia': 'Iroko',
        'mélèze': 'Mélèze', 'meleze': 'Mélèze', 'larix decidua': 'Mélèze', 'larix': 'Mélèze',
        'douglas': 'Douglas', 'pseudotsuga menziesii': 'Douglas', 'pseudotsuga': 'Douglas',
        'okoumé': 'Okoumé', 'okoume': 'Okoumé', 'aucoumea klaineana': 'Okoumé', 'aucoumea': 'Okoumé',
        'wengé': 'Wengé', 'wenge': 'Wengé', 'millettia laurentii': 'Wengé', 'millettia': 'Wengé',
        'ipé': 'Ipé', 'ipe': 'Ipé', 'tabebuia': 'Ipé',
        'cumaru': 'Cumaru', 'dipteryx odorata': 'Cumaru', 'dipteryx': 'Cumaru',
        'padouk': 'Padouk', 'pterocarpus soyauxii': 'Padouk', 'pterocarpus': 'Padouk',
        'bubinga': 'Bubinga', 'guibourtia': 'Bubinga',
        'zébra': 'Zébra', 'microberlinia brazzavillensis': 'Zébra', 'zebrano': 'Zébra',
        'érable': 'Érable', 'erable': 'Érable', 'acer': 'Érable',
        'mdf': 'MDF', 'medium': 'MDF', 'osb': 'OSB', 'aggloméré': 'Agglo', 'agglo': 'Agglo', 'mélaminé': 'Mélaminé', 'contreplaqué': 'Contreplaqué'
    }
    for key, val in woods.items():
        if key in text: return val
    return None

def extract_cut_type(text):
    if not text: return None
    text = text.lower()
    cuts = {
        'planche brute': 'Planche', 'planche rabotée 4 faces': 'Planche', 'planche avivée': 'Planche', 
        'planche délignée': 'Planche', 'planche aboutée': 'Planche', 'planche lamellé-collé': 'Planche',
        'planche': 'Planche',
        'platelage extérieur': 'Platelage', 'platelage intérieur': 'Platelage', 'platelage traité autoclave': 'Platelage',
        'platelage': 'Platelage',
        'poutre massive': 'Poutre', 'poutre lamellé-collé': 'Poutre', 'poutre en i': 'Poutre', 
        'poutre en h': 'Poutre', 'poutre en l': 'Poutre', 'poutre clouée': 'Poutre', 'poutre courbe': 'Poutre',
        'poutre': 'Poutre',
        'solive standard': 'Solive', 'solive à entrait': 'Solive', 'solive à queue d’aronde': 'Solive',
        'solive': 'Solive',
        'chevron standard': 'Chevron', 'chevron à entrait': 'Chevron', 'chevron déligné': 'Chevron', 
        'chevron traité autoclave': 'Chevron', 'chevron': 'Chevron',
        'lame de parquet': 'Lame', 'lame de terrasse': 'Lame', 'lame de lambris': 'Lame', 
        'lame de bardage': 'Lame', 'lame clipable': 'Lame', 'lame à rainure et languette': 'Lame',
        'lame': 'Lame',
        'panneau massif': 'Panneau', 'panneau contreplaqué': 'Panneau', 'panneau mélaminé': 'Panneau', 
        'panneau stratifié': 'Panneau', 'panneau bouveté': 'Panneau', 'panneau sandwich': 'Panneau',
        'panneau': 'Panneau',
        'lambris mural': 'Lambris', 'lambris plafond': 'Lambris', 'lambris extérieur': 'Lambris', 
        'lambris à clin': 'Lambris', 'lambris à feuillure': 'Lambris', 'lambris clipable': 'Lambris',
        'lambris': 'Lambris',
        'parquet massif': 'Parquet', 'parquet contrecollé': 'Parquet', 'parquet flottant': 'Parquet', 'parquet clipable': 'Parquet',
        'parquet': 'Parquet',
        'lattis': 'Lattis', 'volige': 'Volige', 'bastaing': 'Bastaing', 'madrier': 'Madrier',
        'plot': 'Plots', 'avivé': 'Avivés', 'avive': 'Avivés', 'bille': 'Billes',
        'poutre i': 'Poutres I/H/L', 'poutre h': 'Poutres I/H/L', 'poutre l': 'Poutres I/H/L',
        'plateau': 'Plateau', 'bois de charpente': 'Bois de charpente', 'bois de coffrage': 'Bois de coffrage',
        'bois de menuiserie': 'Bois de menuiserie', 'bois d’agencement': 'Bois d’agencement',
        'bois de placage': 'Bois de placage', 'bois de tranchage': 'Bois de tranchage',
        'bois brut de sciage': 'Bois brut de sciage', 'bois raboté': 'Bois raboté',
        'bois séché': 'Bois séché', 'bois traité': 'Bois traité', 'bois certifié': 'Bois certifié'
    }
    for key, val in cuts.items():
        if key in text: return val
    return None

def extract_treatment(text):
    if not text: return None
    text = text.lower()
    treatments = {
        'raboté': 'Raboté', 'poncé': 'Poncé',
        'traité autoclave classe 2': 'Traité autoclave C2', 'traité autoclave classe 3': 'Traité autoclave C3', 'traité autoclave classe 4': 'Traité autoclave C4',
        'traité autoclave': 'Traité autoclave', 'imprégné': 'Imprégné',
        'vernis mat': 'Vernis mat', 'vernis brillant': 'Vernis brillant', 'vernis saturateur': 'Vernis saturateur', 'vernis': 'Vernis',
        'lasure incolore': 'Lasure incolore', 'lasure teintée': 'Lasure teintée', 'lasure': 'Lasure',
        'peinture glycéro': 'Peinture glycéro', 'peinture acrylique': 'Peinture acrylique', 'peinture': 'Peinture',
        'huile': 'Huile', 'cire': 'Cire', 'ignifugé': 'Ignifugé', 'hydrofuge': 'Hydrofuge',
        'fumé': 'Fumé', 'bouilli': 'Bouilli', 'séché en étuve': 'Séché en étuve', 'séché à l’air': 'Séché à l’air',
        'prêt à peindre': 'Prêt à peindre', 'prêt à poser': 'Prêt à poser'
    }
    found = []
    for key, val in treatments.items():
        if key in text:
            found.append(val)
    return ", ".join(list(set(found))) if found else None

def extract_certification(text):
    if not text: return None
    text = text.upper()
    certs = {
        'FSC': 'FSC', 'PEFC': 'PEFC', 'CE': 'CE', 'NF': 'NF',
        'CLASSE 1': 'Bois classé Classe 1', 'CLASSE 2': 'Bois classé Classe 2', 'CLASSE 3': 'Bois classé Classe 3'
    }
    found = []
    for key, val in certs.items():
        if key in text:
            found.append(val)
    return ", ".join(list(set(found))) if found else None

def matches_keywords(name, context=""):
    """
    Strict Keyword Filtering: Only retain products matching wood species 
    AND product types provided in the prompt.
    """
    text = (name + " " + context).lower()
    
    # Check species
    species_found = extract_wood_type(text) is not None
    
    # Check product types
    product_type_found = extract_cut_type(text) is not None
    
    return species_found and product_type_found

def should_exclude_product(name, context=""):
    """Returns True if the product should be excluded (firewood, etc.)."""
    text = (name + " " + context).lower()
    exclusions = [
        'bois de chauffage', 'bûche', 'buche', 'granulé', 
        'bois énergie', 'bois energie', 'palette usagé', 
        'calage usagé', 'pellet', 'non professionnel'
    ]
    return any(x in text for x in exclusions)
