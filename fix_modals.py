import re

def fix_modals(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define all the modals we want to replace
    # We will use regex to find `{isXXXXModalOpen && (` and replace with `<div style={{...}}>` and remove the closing `)}`
    
    # 1. Material Modal
    content = re.sub(
        r'\{isMaterialModalOpen\s*&&\s*\(\s*(<div\s+className="modal-overlay"\s+onClick=\{\(\)\s*=>\s*setIsMaterialModalOpen\(false\)\}>)',
        r'<div className="modal-overlay" style={{ display: isMaterialModalOpen ? undefined : \'none\' }} onClick={() => setIsMaterialModalOpen(false)}>',
        content
    )
    content = content.replace('                </div>\n            )}\n\n            {/* Stock Modal', '                </div>\n\n            {/* Stock Modal')

    # 2. Stock Modal
    content = re.sub(
        r'\{isStockModalOpen\s*&&\s*\(\s*(<div\s+className="modal-overlay"\s+onClick=\{\(\)\s*=>\s*setIsStockModalOpen\(false\)\}>)',
        r'<div className="modal-overlay" style={{ display: isStockModalOpen ? undefined : \'none\' }} onClick={() => setIsStockModalOpen(false)}>',
        content
    )
    content = content.replace('                </div>\n            )}\n\n            {/* Edge Band Modal', '                </div>\n\n            {/* Edge Band Modal')

    # 3. Edge Band Modal
    content = re.sub(
        r'\{isEdgeBandModalOpen\s*&&\s*\(\s*(<div\s+className="modal-overlay"\s+onClick=\{\(\)\s*=>\s*setIsEdgeBandModalOpen\(false\)\}>)',
        r'<div className="modal-overlay" style={{ display: isEdgeBandModalOpen ? undefined : \'none\' }} onClick={() => setIsEdgeBandModalOpen(false)}>',
        content
    )
    content = content.replace('                </div>\n            )}\n\n            {/* Supplier Modal', '                </div>\n\n            {/* Supplier Modal')

    # 4. Supplier Modal
    content = re.sub(
        r'\{isSupplierModalOpen\s*&&\s*\(\s*(<div\s+className="modal-overlay"\s+onClick=\{\(\)\s*=>\s*\{\s*setIsSupplierModalOpen\(false\);\s*setEditingSupplierId\(null\);\s*\}\}>)',
        r'<div className="modal-overlay" style={{ display: isSupplierModalOpen ? undefined : \'none\' }} onClick={() => { setIsSupplierModalOpen(false); setEditingSupplierId(null); }}>',
        content
    )
    content = content.replace('                </div>\n            )}\n\n            {/* Scraping Modal', '                </div>\n\n            {/* Scraping Modal')

    # 5. Scraping Modal (Wrapped in ErrorBoundary)
    content = re.sub(
        r'\{isScrapingModalOpen\s*&&\s*\(\s*<ErrorBoundary>\s*(<div\s+className="modal-overlay"\s+onClick=\{\(\)\s*=>\s*setIsScrapingModalOpen\(false\)\}>)',
        r'<ErrorBoundary>\n                <div className="modal-overlay" style={{ display: isScrapingModalOpen ? undefined : \'none\' }} onClick={() => setIsScrapingModalOpen(false)}>',
        content
    )
    content = content.replace('                </ErrorBoundary>\n            )}\n\n            {/* Catalog Modal', '                </ErrorBoundary>\n\n            {/* Catalog Modal')

    # 6. Catalog Modal (Depends on selectedSupplier)
    content = re.sub(
        r'\{isCatalogModalOpen\s*&&\s*selectedSupplier\s*&&\s*\(\s*(<div\s+className="modal-overlay"\s+onClick=\{\(\)\s*=>\s*setIsCatalogModalOpen\(false\)\}>)\s*(<div\s+className="modal-content[^>]+>)',
        r'<div className="modal-overlay" style={{ display: (isCatalogModalOpen && selectedSupplier) ? undefined : \'none\' }} onClick={() => setIsCatalogModalOpen(false)}>\n                {selectedSupplier ? (\n                    \2',
        content
    )
    content = content.replace('                </div>\n            )}\n\n            {/* Association Modal', '                    </div>\n                ) : null}\n            </div>\n\n            {/* Association Modal')

    # 7. Association Modal (Depends on editingProduct)
    content = re.sub(
        r'\{isAssociationModalOpen\s*&&\s*editingProduct\s*&&\s*\(\s*(<div\s+className="modal-overlay"\s+onClick=\{\(\)\s*=>\s*setIsAssociationModalOpen\(false\)\}>)\s*(<div\s+className="modal-content[^>]+>)',
        r'<div className="modal-overlay" style={{ display: (isAssociationModalOpen && editingProduct) ? undefined : \'none\' }} onClick={() => setIsAssociationModalOpen(false)}>\n                {editingProduct ? (\n                    \2',
        content
    )
    content = content.replace('                </div>\n            )}\n\n            {/* Product Edit Modal', '                    </div>\n                ) : null}\n            </div>\n\n            {/* Product Edit Modal')

    # 8. Product Edit Modal (Depends on editingProduct)
    content = re.sub(
        r'\{isProductEditModalOpen\s*&&\s*editingProduct\s*&&\s*\(\s*(<div\s+className="modal-overlay"\s+onClick=\{\(\)\s*=>\s*setIsProductEditModalOpen\(false\)\}>)\s*(<div\s+className="modal-content[^>]+>)',
        r'<div className="modal-overlay" style={{ display: (isProductEditModalOpen && editingProduct) ? undefined : \'none\' }} onClick={() => setIsProductEditModalOpen(false)}>\n                {editingProduct ? (\n                    \2',
        content
    )
    content = content.replace('                </div>\n            )}\n\n            <ConfirmDialog', '                    </div>\n                ) : null}\n            </div>\n\n            <ConfirmDialog')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    fix_modals(r'c:\Users\Mathe\Documents\Matheo\logiciel\logiciel_V6\Moteur\Frontend\src\pages\Stock.tsx')
