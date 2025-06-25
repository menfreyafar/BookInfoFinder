import { Request, Response } from "express";
import PDFDocument from 'pdfkit';

export async function generateBookBookmark(req: Request, res: Response) {
  try {
    const { bookId } = req.params;
    
    const { sqlite } = await import("../server/db");
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

    // Create PDF with single bookmark - horizontal layout like model
    const doc = new PDFDocument({ 
      margin: 30,
      size: [200, 140] // Horizontal bookmark size in points (width x height)
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="etiqueta-${book.unique_code || bookId}.pdf"`);
    
    doc.pipe(res);

    // Price at the top - exactly like the model
    const finalPrice = book.used_price || book.new_price || 0;
    if (finalPrice > 0) {
      doc.fontSize(14).font('Helvetica-Bold')
        .text(`R$ ${finalPrice.toFixed(2)}`, 5, 8, { 
          width: 190, 
          align: 'center'
        });
    }
    
    // Book title (bold, prominent) - position like model
    doc.fontSize(12).font('Helvetica-Bold')
      .text(book.title.toUpperCase(), 5, 28, { 
        width: 190, 
        align: 'center'
      });
    
    // Author (centered below title) - closer spacing
    doc.fontSize(9).font('Helvetica')
      .text(book.author, 5, 45, { 
        width: 190, 
        align: 'center'
      });
    
    // Sales process info - smaller and positioned like model
    doc.fontSize(8).font('Helvetica')
      .text('Processo de vendas', 5, 60, { 
        width: 190, 
        align: 'center'
      })
      .text('em cinco etapas', 5, 70, { 
        width: 190, 
        align: 'center'
      });
    
    // Synopsis (justified text) - main content area like model
    if (book.synopsis) {
      let synopsis = book.synopsis;
      // Limit to fit the space properly horizontally
      if (synopsis.length > 350) {
        synopsis = synopsis.substring(0, 350) + '...';
      }
      
      doc.fontSize(7).font('Helvetica')
        .text(synopsis, 5, 85, { 
          width: 190, 
          align: 'justify',
          lineGap: 0.5
        });
    }
    
    // Estante Virtual indicator - positioned like model
    if (book.sent_to_estante_virtual) {
      doc.fontSize(8).font('Helvetica')
        .text('Ø=Üñ Disponível Online', 5, 115, { 
          width: 190, 
          align: 'center'
        });
    }
    
    // Edition and condition info - penultimate line like model
    let infoText = '';
    if (book.edition) infoText += book.edition;
    if (book.condition) infoText += (infoText ? ' • ' : '') + book.condition;
    if (infoText) {
      doc.fontSize(8).font('Helvetica')
        .text(infoText, 5, 125, { 
          width: 190, 
          align: 'center'
        });
    }
    
    // Unique code at bottom - last line like model
    if (book.unique_code) {
      doc.fontSize(8).font('Helvetica')
        .text(book.unique_code, 5, 135, { 
          width: 190, 
          align: 'center'
        });
    }

    doc.end();

  } catch (error) {
    console.error("Error generating bookmark:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}