import { Request, Response } from "express";
import PDFDocument from 'pdfkit';

export async function generateBookBookmark(req: Request, res: Response) {
  try {
    const { bookId } = req.params;
    
    const { sqlite } = await import("../db");
    const book = sqlite.prepare(`
      SELECT 
        b.title, b.author, b.shelf, b.unique_code, b.condition, b.edition,
        b.used_price, b.new_price, b.synopsis, b.publisher,
        i.sent_to_estante_virtual
      FROM books b
      LEFT JOIN inventory i ON b.id = i.book_id
      WHERE b.id = ?
    `).get(bookId);

    if (!book) {
      return res.status(404).json({ error: "Livro não encontrado" });
    }

    // Get store settings
    const settings = sqlite.prepare('SELECT * FROM settings').all();
    const settingsMap = settings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    const storeName = settingsMap.store_name || 'Luar Sebo e Livraria';
    const storeSubtitle = settingsMap.brand_subtitle || '';

    // Create PDF with single bookmark
    const doc = new PDFDocument({ 
      margin: 50,
      size: [140, 200] // Bookmark size in points
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="etiqueta-${book.unique_code || bookId}.pdf"`);
    
    doc.pipe(res);

    // Store name at top
    doc.fontSize(10).font('Helvetica-Bold')
      .text(storeName, 5, 8, { 
        width: 130, 
        align: 'center'
      });
    
    if (storeSubtitle) {
      doc.fontSize(8).font('Helvetica')
        .text(storeSubtitle, 5, 22, { 
          width: 130, 
          align: 'center'
        });
    }
    
    // Separator line
    doc.moveTo(10, 35).lineTo(130, 35).stroke();
    
    // Book title (large, readable)
    doc.fontSize(11).font('Helvetica-Bold')
      .text(book.title.substring(0, 40) + (book.title.length > 40 ? '...' : ''), 
            5, 42, { 
              width: 130, 
              align: 'center'
            });
    
    // Author
    doc.fontSize(9).font('Helvetica')
      .text(book.author.substring(0, 30) + (book.author.length > 30 ? '...' : ''), 
            5, 70, { 
              width: 130, 
              align: 'center'
            });
    
    // Price (very large and prominent)
    const finalPrice = book.used_price || book.new_price || 0;
    if (finalPrice > 0) {
      doc.fontSize(18).font('Helvetica-Bold').fillColor('red')
        .text(`R$ ${finalPrice.toFixed(2)}`, 5, 88, { 
          width: 130, 
          align: 'center'
        });
    }
    
    // Reset color
    doc.fillColor('black');
    
    // Synopsis (small)
    if (book.synopsis) {
      const shortSynopsis = book.synopsis.substring(0, 80) + (book.synopsis.length > 80 ? '...' : '');
      doc.fontSize(7).font('Helvetica')
        .text(shortSynopsis, 5, 115, { 
          width: 130, 
          align: 'left'
        });
    }
    
    // Estante Virtual indicator
    if (book.sent_to_estante_virtual) {
      doc.fontSize(7).font('Helvetica-Bold').fillColor('green')
        .text('📱 Disponível Online', 5, 150, { 
          width: 130, 
          align: 'center'
        });
    }
    
    // Reset color
    doc.fillColor('black');
    
    // Unique code at bottom
    if (book.unique_code) {
      doc.fontSize(8).font('Helvetica')
        .text(book.unique_code, 5, 180, { 
          width: 130, 
          align: 'center'
        });
    }
    
    // Edition/condition info
    let infoText = '';
    if (book.edition) infoText += book.edition;
    if (book.condition) infoText += (infoText ? ' • ' : '') + book.condition;
    if (infoText) {
      doc.fontSize(7).font('Helvetica')
        .text(infoText, 5, 165, { 
          width: 130, 
          align: 'center'
        });
    }

    doc.end();

  } catch (error) {
    console.error("Error generating bookmark:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}