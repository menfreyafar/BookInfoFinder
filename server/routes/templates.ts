import { Request, Response } from 'express';
import { storage } from '../storage';
import PDFDocument from 'pdfkit';

export async function uploadTemplate(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const templatePath = req.file.path;
    const templateName = req.file.originalname;
    
    await storage.setSetting('custom_template_path', templatePath);
    await storage.setSetting('custom_template_name', templateName);
    
    res.json({ 
      success: true, 
      message: 'Modelo personalizado carregado com sucesso',
      templateName 
    });
  } catch (error) {
    console.error('Erro ao fazer upload do modelo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export async function generateCustomPDF(req: Request, res: Response) {
  try {
    const books = await storage.getAllBooks();
    
    if (books.length === 0) {
      return res.status(400).json({ error: 'Nenhum livro cadastrado' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="etiquetas-personalizadas.pdf"');

    // Dimensions: 10cm height x 2.5cm width (1cm = 28.35 points)
    const labelWidth = 2.5 * 28.35; // ~71 points
    const labelHeight = 10 * 28.35; // ~284 points
    
    const doc = new PDFDocument({ 
      margin: 10,
      size: 'A4'
    });
    
    doc.pipe(res);

    doc.fontSize(16).text('Etiquetas Personalizadas', { align: 'center' });
    doc.fontSize(10).text('Dimensões: 10cm altura × 2,5cm largura | 6 etiquetas por página', { align: 'center' });
    doc.moveDown(2);

    const pageWidth = 595; // A4 width
    const pageHeight = 842; // A4 height
    const margin = 10;
    
    // Fixed layout: 6 etiquetas horizontais por página
    const labelsPerPage = 6;
    const cols = 6; // 6 colunas horizontais
    const rows = 1; // 1 linha por página
    
    // Calculate spacing to center labels on page
    const availableWidth = pageWidth - 2 * margin;
    const totalLabelsWidth = cols * labelWidth;
    const extraSpace = availableWidth - totalLabelsWidth;
    const spacing = extraSpace / (cols - 1); // Espaçamento entre etiquetas
    
    let currentY = doc.y + 50; // Start position for labels
    let labelCount = 0;

    books.forEach((book) => {
      if (labelCount > 0 && labelCount % labelsPerPage === 0) {
        doc.addPage();
        currentY = margin + 80; // Reset Y position for new page
        labelCount = 0;
      }

      const col = labelCount % cols;
      const x = margin + col * (labelWidth + spacing);
      const y = currentY;

      // Draw label border
      doc.rect(x, y, labelWidth, labelHeight).stroke();
      
      const finalPrice = book.used_price || book.new_price || 0;
      
      // Price at top
      if (finalPrice > 0) {
        doc.fontSize(8).font('Helvetica-Bold')
          .text(`R$ ${finalPrice.toFixed(2)}`, x + 2, y + 5, { 
            width: labelWidth - 4, 
            align: 'center'
          });
      }
      
      // Title
      doc.fontSize(6).font('Helvetica-Bold')
        .text(book.title.toUpperCase(), x + 2, y + 20, { 
          width: labelWidth - 4, 
          align: 'center'
        });
      
      // Author
      doc.fontSize(5).font('Helvetica')
        .text(book.author, x + 2, y + 35, { 
          width: labelWidth - 4, 
          align: 'center'
        });
      
      // Process info
      doc.fontSize(4).font('Helvetica')
        .text('Processo de vendas', x + 2, y + 48, { 
          width: labelWidth - 4, 
          align: 'left'
        })
        .text('em cinco etapas', x + 2, y + 54, { 
          width: labelWidth - 4, 
          align: 'left'
        });
      
      // Synopsis - ajustado para altura total da etiqueta
      if (book.synopsis) {
        let synopsis = book.synopsis;
        // Calcular espaço disponível para sinopse (altura total - outros elementos)
        const availableHeight = labelHeight - 120; // Reservar espaço para outros elementos
        const maxChars = Math.floor(availableHeight / 4) * 25; // Aproximadamente 25 chars por linha
        
        if (synopsis.length > maxChars) {
          synopsis = synopsis.substring(0, maxChars) + '...';
        }
        
        doc.fontSize(3.5).font('Helvetica')
          .text(synopsis, x + 2, y + 65, { 
            width: labelWidth - 4, 
            height: availableHeight,
            align: 'justify',
            lineGap: 0.2
          });
      }
      
      // Estante Virtual indicator - positioned near bottom
      if (book.sent_to_estante_virtual) {
        doc.fontSize(4).font('Helvetica')
          .text('Ø=Üñ Disponível Online', x + 2, y + labelHeight - 35, { 
            width: labelWidth - 4, 
            align: 'center'
          });
      }
      
      // Edition and condition - positioned at bottom
      let infoText = '';
      if (book.edition) infoText += book.edition;
      if (book.condition) infoText += (infoText ? ' • ' : '') + book.condition;
      if (infoText) {
        doc.fontSize(4).font('Helvetica')
          .text(infoText, x + 2, y + labelHeight - 20, { 
            width: labelWidth - 4, 
            align: 'center'
          });
      }
      
      // Unique code - at very bottom
      if (book.unique_code) {
        doc.fontSize(4).font('Helvetica')
          .text(book.unique_code, x + 2, y + labelHeight - 8, { 
            width: labelWidth - 4, 
            align: 'center'
          });
      }

      labelCount++;
    });

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar PDF personalizado:', error);
    res.status(500).json({ error: 'Erro ao gerar PDF personalizado' });
  }
}

export async function getTemplateInfo(req: Request, res: Response) {
  try {
    const templatePath = await storage.getSetting('custom_template_path');
    const templateName = await storage.getSetting('custom_template_name');
    
    res.json({
      hasTemplate: !!templatePath?.value,
      templateName: templateName?.value || null,
      templatePath: templatePath?.value || null
    });
  } catch (error) {
    console.error('Erro ao buscar informações do modelo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}