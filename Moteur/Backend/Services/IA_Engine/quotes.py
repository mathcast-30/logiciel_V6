import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_RIGHT, TA_CENTER

class QuoteGenerator:
    def __init__(self, output_dir=None):
        if output_dir:
            self.output_dir = output_dir
        else:
            # Consistent with ExportGenerator
            self.output_dir = "./exports"
        
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def generate(self, quote, client, project, items):
        """
        Generate a PDF quote.
        
        Args:
            quote: Quote model instance
            client: Client model instance
            project: Project model instance (optional)
            items: List of QuoteItem instances
            
        Returns:
            str: Absolute path to the generated PDF
        """
        # Structure: Exports/{ClientName}/{ProjectName}/{Date}/
        def sanitize(name):
             return "".join([c for c in name if c.isalnum() or c in (' ', '-', '_')]).strip() or "Sans_Nom"

        safe_client_name = sanitize(client.name)
        safe_project_name = sanitize(project.name if project else "Général")
        timestamp = quote.date.strftime("%Y-%m-%d_%Hh%M")
        
        save_dir = os.path.join(self.output_dir, safe_client_name, safe_project_name, timestamp)
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)
            
        filename = f"Devis_{quote.number}_{safe_client_name}.pdf"
        filepath = os.path.join(save_dir, filename)
        
        # Document Setup
        doc = SimpleDocTemplate(
            filepath,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        story = []
        styles = getSampleStyleSheet()
        
        # --- Header ---
        # Company Info (Left)
        company_info = """
        <b>OptiCut Pro</b><br/>
        Atelier de Menuiserie<br/>
        123 Rue du Bois<br/>
        75000 Paris<br/>
        Tel: 01 23 45 67 89<br/>
        Email: contact@opticut.pro
        """
        p_company = Paragraph(company_info, styles["Normal"])
        
        # Quote Info (Right)
        quote_info = f"""
        <b>DEVIS N° {quote.number}</b><br/>
        Date: {quote.date.strftime('%d/%m/%Y')}<br/>
        Validité: {quote.valid_until.strftime('%d/%m/%Y') if quote.valid_until else '30 jours'}
        """
        style_right = ParagraphStyle(name='RightAlign', parent=styles['Normal'], alignment=TA_RIGHT)
        p_quote = Paragraph(quote_info, style_right)
        
        data_header = [[p_company, p_quote]]
        t_header = Table(data_header, colWidths=[10*cm, 7*cm])
        t_header.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(t_header)
        story.append(Spacer(1, 1*cm))
        
        # --- Client Info ---
        client_text = f"<b>CLIENT :</b><br/>{client.name}"
        if client.address:
            client_text += f"<br/>{client.address.replace(chr(10), '<br/>')}"
        if client.contact_email:
            client_text += f"<br/>{client.contact_email}"
        
        p_client = Paragraph(client_text, styles["Normal"])
        
        # Project Info
        project_text = ""
        if project:
            project_text = f"<b>PROJET :</b> {project.name}<br/>"
            if project.description:
                project_text += f"<i>{project.description}</i>"
        
        p_project = Paragraph(project_text, styles["Normal"])
        
        data_client = [[p_project, p_client]]
        t_client = Table(data_client, colWidths=[10*cm, 7*cm])
        t_client.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOX', (1,0), (1,0), 1, colors.grey),
            ('leftPadding', (1,0), (1,0), 10),
            ('rightPadding', (1,0), (1,0), 10),
            ('topPadding', (1,0), (1,0), 10),
            ('bottomPadding', (1,0), (1,0), 10),
        ]))
        story.append(t_client)
        story.append(Spacer(1, 1.5*cm))
        
        # --- Title ---
        if quote.description:
            story.append(Paragraph(f"<b>Objet :</b> {quote.description}", styles["Normal"]))
            story.append(Spacer(1, 0.5*cm))
        
        # --- Items Table ---
        data = [['Désignation', 'Qté', 'Unité', 'P.U. HT', 'Total HT']]
        
        for item in items:
            data.append([
                Paragraph(item.description, styles["Normal"]),
                f"{item.quantity:g}",
                item.unit,
                f"{item.unit_price:.2f} €",
                f"{item.total:.2f} €"
            ])
        
        # Spacer rows if empty
        if not items:
            data.append(['', '', '', '', ''])
            
        t_items = Table(data, colWidths=[9*cm, 2*cm, 2*cm, 2*cm, 2*cm])
        t_items.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f3f4f6")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.black),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('ALIGN', (1,0), (-1,-1), 'CENTER'), # Qty center
            ('ALIGN', (3,0), (-1,-1), 'RIGHT'), # Prices right
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#e5e7eb")),
        ]))
        story.append(t_items)
        story.append(Spacer(1, 1*cm))
        
        # --- Totals ---
        data_totals = [
            ['Total HT', f"{quote.total_ht:.2f} €"],
            ['TVA (20%)', f"{(quote.total_ttc - quote.total_ht):.2f} €"],
            ['Total TTC', f"{quote.total_ttc:.2f} €"]
        ]
        
        t_totals = Table(data_totals, colWidths=[14*cm, 3*cm])
        t_totals.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
            ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
            ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'), # Bold Total TTC
            ('SIZE', (0,-1), (-1,-1), 12),
            ('LINEABOVE', (0,-1), (-1,-1), 1, colors.black),
        ]))
        story.append(t_totals)
        story.append(Spacer(1, 2*cm))
        
        # --- Footer ---
        footer_text = "Bon pour accord (Date et Signature) :"
        story.append(Paragraph(footer_text, styles["Normal"]))
        
        # Build
        doc.build(story)
        return filepath
