import { Request, Response } from "express";
import PDFDocument from 'pdfkit';

export async function generateDemoStoragePDF(req: Request, res: Response) {
  try {
    // Demo books data
    const demoBooks = [
      {
        title: "Dom Casmurro",
        author: "Machado de Assis",
        shelf: "Literatura",
        unique_code: "LU-1001-2025",
        condition: "usado",
        edition: "2ª edição",
        used_price: 25.00,
        new_price: null,
        synopsis: "Romance clássico brasileiro que narra a história de Bentinho e Capitu, explorando temas como ciúme, amor e dúvida.",
        publisher: "Editora Globo",
        sent_to_estante_virtual: true
      },
      {
        title: "O Pequeno Príncipe",
        author: "Antoine de Saint-Exupéry",
        shelf: "Infantil",
        unique_code: "LU-1002-2025",
        condition: "novo",
        edition: "1ª edição",
        used_price: null,
        new_price: 35.00,
        synopsis: "Fábula poética que conta a história de um pequeno príncipe que viaja pelo universo.",
        publisher: "Agir",
        sent_to_estante_virtual: false
      },
      {
        title: "A República",
        author: "Platão",
        shelf: "Filosofia",
        unique_code: "LU-1003-2025",
        condition: "usado",
        edition: "3ª edição",
        used_price: 40.00,
        new_price: null,
        synopsis: "Diálogo filosófico sobre justiça, política e a natureza ideal do Estado.",
        publisher: "Martin Claret",
        sent_to_estante_virtual: true
      },
      {
        title: "Cem Anos de Solidão",
        author: "Gabriel García Márquez",
        shelf: "Literatura",
        unique_code: "LU-1004-2025",
        condition: "usado",
        edition: "1ª edição",
        used_price: 45.00,
        new_price: null,
        synopsis: "Obra-prima do realismo mágico que narra a saga da família Buendía.",
        publisher: "Record",
        sent_to_estante_virtual: true
      },
      {
        title: "Harry Potter e a Pedra Filosofal",
        author: "J.K. Rowling",
        shelf: "Infantil",
        unique_code: "LU-1005-2025",
        condition: "novo",
        edition: "2ª edição",
        used_price: null,
        new_price: 50.00,
        synopsis: "Primeiro livro da série sobre o jovem bruxo Harry Potter e suas aventuras em Hogwarts.",
        publisher: "Rocco",
        sent_to_estante_virtual: false
      },
      {
        title: "1984",
        author: "George Orwell",
        shelf: "A1",
        unique_code: "LU-1006-2025",
        condition: "usado",
        edition: "1ª edição",
        used_price: 30.00,
        new_price: null,
        synopsis: "Distopia clássica sobre um regime totalitário que controla todos os aspectos da vida.",
        publisher: "Companhia das Letras",
        sent_to_estante_virtual: true
      }
    ];

    const storeName = 'Luar Sebo e Livraria';
    const storeSubtitle = 'Livros novos e usados • Desde 1995';

    // Create PDF
    const doc = new PDFDocument({ 
      margin: 30,
      size: 'A4'
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="modelo-lista-guarda-etiquetas.pdf"');
    
    doc.pipe(res);

    // Header for list
    doc.fontSize(18).text('Lista de Livros para Guarda - MODELO DEMONSTRATIVO', { align: 'center' });
    doc.fontSize(12).text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
    doc.moveDown(1);

    // Group by shelf
    const groupedByShelf = demoBooks.reduce((acc, book) => {
      const shelf = book.shelf || "Sem Estante";
      if (!acc[shelf]) acc[shelf] = [];
      acc[shelf].push(book);
      return acc;
    }, {});

    // List Content
    for (const [shelfName, shelfBooks] of Object.entries(groupedByShelf)) {
      doc.fontSize(14).fillColor('black').text(`\n${shelfName} (${shelfBooks.length} livros)`, { underline: true });
      doc.moveDown(0.5);

      shelfBooks.forEach((book, index) => {
        doc.fontSize(10);
        doc.text(`${index + 1}. ${book.title}`, { indent: 20 });
        doc.text(`   Autor: ${book.author}`, { indent: 20 });
        if (book.edition) doc.text(`   Edição: ${book.edition}`, { indent: 20 });
        if (book.condition) doc.text(`   Condição: ${book.condition}`, { indent: 20 });
        if (book.unique_code) doc.text(`   Código: ${book.unique_code}`, { indent: 20 });
        doc.text(`   ☐ Guardado`, { indent: 20 });
        doc.moveDown(0.3);
      });
      
      doc.moveDown();
    }

    // New page for bookmarks
    doc.addPage();
    
    // Bookmarks header
    doc.fontSize(16).text('Etiquetas/Marca-páginas dos Livros - MODELO', { align: 'center' });
    doc.fontSize(12).text('Layout otimizado para clientes idosos', { align: 'center' });
    doc.moveDown(1);
    
    // Bookmark dimensions - exactly like user's model
    const bookmarkWidth = 120;  // Width exactly like model
    const bookmarkHeight = 180; // Height exactly like model
    const margin = 5;
    const cols = 6; // 6 bookmarks per row exactly like model
    const rows = 2; // 2 rows for demo
    
    let currentY = doc.y;
    let bookmarkCount = 0;
    
    // Show only first 6 books for demo
    demoBooks.slice(0, 6).forEach((book, index) => {
      // Calculate position
      const col = bookmarkCount % cols;
      const row = Math.floor(bookmarkCount / cols);
      
      const x = margin + col * (bookmarkWidth + margin);
      const y = currentY + row * (bookmarkHeight + margin);
      
      // Draw bookmark border
      doc.rect(x, y, bookmarkWidth, bookmarkHeight).stroke();
      
      // Price at the top - exactly like user's model
      const finalPrice = book.used_price || book.new_price || 0;
      if (finalPrice > 0) {
        doc.fontSize(10).font('Helvetica-Bold')
          .text(`R$ ${finalPrice.toFixed(2)}`, x + 5, y + 5, { 
            width: bookmarkWidth - 10, 
            align: 'center'
          });
      }
      
      // Book title (bold, uppercase) - exactly like model
      doc.fontSize(8).font('Helvetica-Bold')
        .text(book.title.toUpperCase(), x + 5, y + 18, { 
          width: bookmarkWidth - 10, 
          align: 'center'
        });
      
      // Author (centered below title) - exactly like model spacing
      doc.fontSize(7).font('Helvetica')
        .text(book.author, x + 5, y + 30, { 
          width: bookmarkWidth - 10, 
          align: 'center'
        });
      
      // Sales process info - exactly like model
      doc.fontSize(6).font('Helvetica')
        .text('Processo de vendas', x + 5, y + 42, { 
          width: bookmarkWidth - 10, 
          align: 'left'
        })
        .text('em cinco etapas', x + 5, y + 50, { 
          width: bookmarkWidth - 10, 
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
          .text(synopsis, x + 5, y + 58, { 
            width: bookmarkWidth - 10, 
            align: 'justify',
            lineGap: 0.3
          });
      }
      
      // Estante Virtual indicator - exactly like model position
      if (book.sent_to_estante_virtual) {
        doc.fontSize(6).font('Helvetica')
          .text('Ø=Üñ Disponível Online', x + 5, y + 150, { 
            width: bookmarkWidth - 10, 
            align: 'center'
          });
      }
      
      // Edition and condition info - exactly like model
      let infoText = '';
      if (book.edition) infoText += book.edition;
      if (book.condition) infoText += (infoText ? ' • ' : '') + book.condition;
      if (infoText) {
        doc.fontSize(6).font('Helvetica')
          .text(infoText, x + 5, y + 162, { 
            width: bookmarkWidth - 10, 
            align: 'center'
          });
      }
      
      // Unique code at bottom - exactly like model
      if (book.unique_code) {
        doc.fontSize(6).font('Helvetica')
          .text(book.unique_code, x + 5, y + 172, { 
            width: bookmarkWidth - 10, 
            align: 'center'
          });
      }
      
      bookmarkCount++;
    });

    // Add instruction page
    doc.addPage();
    doc.fontSize(16).text('Instruções de Uso', { align: 'center' });
    doc.moveDown(1);
    
    doc.fontSize(12).text('Como usar as etiquetas/marca-páginas:', { align: 'left' });
    doc.moveDown(0.5);
    
    doc.fontSize(10).text('1. Imprima as páginas de etiquetas em papel A4 comum', { indent: 20 });
    doc.text('2. Recorte cada etiqueta seguindo as bordas (140x200mm)', { indent: 20 });
    doc.text('3. Cole ou prenda cada etiqueta no livro correspondente', { indent: 20 });
    doc.text('4. Use como marca-páginas ou etiqueta de preço', { indent: 20 });
    doc.moveDown(1);
    
    doc.text('Características do layout:', { align: 'left' });
    doc.moveDown(0.5);
    
    doc.text('• Preço em destaque (fonte 18pt, cor vermelha)', { indent: 20 });
    doc.text('• Informações claras e organizadas', { indent: 20 });
    doc.text('• Otimizado para leitura por clientes idosos', { indent: 20 });
    doc.text('• Inclui código único para identificação', { indent: 20 });
    doc.text('• Indica se está disponível online', { indent: 20 });
    doc.moveDown(1);
    
    doc.text('Sistema de códigos:', { align: 'left' });
    doc.moveDown(0.5);
    
    doc.text('• Formato: LU-{ID}-{ANO}', { indent: 20 });
    doc.text('• Exemplo: LU-1001-2025', { indent: 20 });
    doc.text('• LU = Luar (prefixo da livraria)', { indent: 20 });
    doc.text('• 1001 = ID único do livro', { indent: 20 });
    doc.text('• 2025 = Ano de cadastro', { indent: 20 });

    doc.end();

  } catch (error) {
    console.error("Error generating demo PDF:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}