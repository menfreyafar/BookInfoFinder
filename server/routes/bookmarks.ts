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

    // Create PDF with single bookmark - exactly like user's model
    const doc = new PDFDocument({ 
      margin: 20,
      size: [120, 180] // Exact size from user's model
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="etiqueta-${book.unique_code || bookId}.pdf"`);
    
    doc.pipe(res);

    // Price at the top - exactly like user's model
    const finalPrice = book.used_price || book.new_price || 0;
    if (finalPrice > 0) {
      doc.fontSize(10).font('Helvetica-Bold')
        .text(`R$ ${finalPrice.toFixed(2)}`, 5, 5, { 
          width: 110, 
          align: 'center'
        });
    }
    
    // Book title (bold, uppercase) - exactly like model
    doc.fontSize(8).font('Helvetica-Bold')
      .text(book.title.toUpperCase(), 5, 18, { 
        width: 110, 
        align: 'center'
      });
    
    // Author (centered below title) - exactly like model spacing
    doc.fontSize(7).font('Helvetica')
      .text(book.author, 5, 30, { 
        width: 110, 
        align: 'center'
      });
    
    // Sales process info - exactly like model
    doc.fontSize(6).font('Helvetica')
      .text('Processo de vendas', 5, 42, { 
        width: 110, 
        align: 'left'
      })
      .text('em cinco etapas', 5, 50, { 
        width: 110, 
        align: 'left'
      });
    
    // Synopsis (justified text) - exactly like model format
    if (book.synopsis) {
      let synopsis = book.synopsis;
      // Limit to fit exactly like the model
      if (synopsis.length > 500) {
        synopsis = synopsis.substring(0, 500) + '...';
      }
      
      doc.fontSize(5.5).font('Helvetica')
        .text(synopsis, 5, 58, { 
          width: 110, 
          align: 'justify',
          lineGap: 0.3
        });
    }
    
    // Estante Virtual indicator - exactly like model position
    if (book.sent_to_estante_virtual) {
      doc.fontSize(6).font('Helvetica')
        .text('Ø=Üñ Disponível Online', 5, 150, { 
          width: 110, 
          align: 'center'
        });
    }
    
    // Edition and condition info - exactly like model
    let infoText = '';
    if (book.edition) infoText += book.edition;
    if (book.condition) infoText += (infoText ? ' • ' : '') + book.condition;
    if (infoText) {
      doc.fontSize(6).font('Helvetica')
        .text(infoText, 5, 162, { 
          width: 110, 
          align: 'center'
        });
    }
    
    // Unique code at bottom - exactly like model
    if (book.unique_code) {
      doc.fontSize(6).font('Helvetica')
        .text(book.unique_code, 5, 172, { 
          width: 110, 
          align: 'center'
        });
    }

    doc.end();

  } catch (error) {
    console.error("Error generating bookmark:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}