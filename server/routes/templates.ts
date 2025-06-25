import { Request, Response } from 'express';
import { storage } from '../storage';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export async function uploadTemplate(req: Request, res: Response) {
  try {
    console.log('Upload template called, file:', req.file ? 'present' : 'missing');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const file = req.file;
    console.log('File details:', { name: file.originalname, type: file.mimetype, size: file.size });
    
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Tipo de arquivo não suportado. Use PNG, JPG ou PDF.' });
    }

    // Convert to base64 and store in database
    const base64Data = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64Data}`;
    
    console.log('Saving template to database...');
    await storage.setSetting('custom_template_data', dataUrl);
    await storage.setSetting('custom_template_name', file.originalname);
    await storage.setSetting('custom_template_type', file.mimetype);
    
    // Mark this template as the default template
    await storage.setSetting('default_template_data', dataUrl);
    await storage.setSetting('default_template_name', file.originalname);
    await storage.setSetting('default_template_type', file.mimetype);
    
    console.log('Template saved successfully as default');
    
    res.json({ 
      success: true, 
      message: 'Modelo personalizado carregado com sucesso',
      templateName: file.originalname 
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

    // Check if custom template exists
    const templateDataSetting = await storage.getSetting('custom_template_data');
    const templateNameSetting = await storage.getSetting('custom_template_name');
    const templateTypeSetting = await storage.getSetting('custom_template_type');
    
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

    // Header indicating template usage
    if (templateDataSetting?.value && templateNameSetting?.value) {
      doc.fontSize(16).text('Etiquetas com Modelo Personalizado', { align: 'center' });
      doc.fontSize(10).text(`Modelo: ${templateNameSetting.value}`, { align: 'center' });
      doc.fontSize(10).text('Dimensões: 10cm altura × 2,5cm largura | 6 etiquetas por página', { align: 'center' });
    } else {
      doc.fontSize(16).text('Etiquetas Personalizadas', { align: 'center' });
      doc.fontSize(10).text('Dimensões: 10cm altura × 2,5cm largura | 6 etiquetas por página', { align: 'center' });
    }
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

      // If custom template exists, try to use it as background
      if (templateDataSetting?.value && templateTypeSetting?.value) {
        try {
          const templateData = templateDataSetting.value;
          const templateType = templateTypeSetting.value;
          
          // For images, insert as background from base64 data
          if (templateType.startsWith('image/')) {
            // Convert data URL to buffer for PDFKit
            const base64Data = templateData.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            doc.image(imageBuffer, x, y, {
              width: labelWidth,
              height: labelHeight,
              opacity: 0.3 // More transparent so text is readable
            });
          }
        } catch (error) {
          console.warn('Error loading custom template:', error);
        }
      }

      // Draw label border
      doc.rect(x, y, labelWidth, labelHeight).stroke();
      
      const finalPrice = book.used_price || book.new_price || 0;
      
      // Price at top - with background for readability over template
      if (finalPrice > 0) {
        doc.save();
        doc.rect(x + 1, y + 3, labelWidth - 2, 12).fillAndStroke('#ffffff', '#000000');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000')
          .text(`R$ ${finalPrice.toFixed(2)}`, x + 2, y + 5, { 
            width: labelWidth - 4, 
            align: 'center'
          });
        doc.restore();
      }
      
      // Title - with background for readability
      doc.save();
      doc.rect(x + 1, y + 18, labelWidth - 2, 15).fillAndStroke('#ffffff', '#000000');
      doc.fontSize(6).font('Helvetica-Bold').fillColor('#000000')
        .text(book.title.toUpperCase(), x + 2, y + 20, { 
          width: labelWidth - 4, 
          align: 'center'
        });
      doc.restore();
      
      // Author
      doc.save();
      doc.rect(x + 1, y + 33, labelWidth - 2, 10).fillAndStroke('#ffffff', '#000000');
      doc.fontSize(5).font('Helvetica').fillColor('#000000')
        .text(book.author, x + 2, y + 35, { 
          width: labelWidth - 4, 
          align: 'center'
        });
      doc.restore();
      
      // Synopsis - with semi-transparent background
      if (book.synopsis) {
        let synopsis = book.synopsis;
        const availableHeight = labelHeight - 120;
        const maxChars = Math.floor(availableHeight / 4) * 25;
        
        if (synopsis.length > maxChars) {
          synopsis = synopsis.substring(0, maxChars) + '...';
        }
        
        doc.save();
        doc.rect(x + 1, y + 45, labelWidth - 2, availableHeight).fillOpacity(0.8).fill('#ffffff');
        doc.fontSize(3.5).font('Helvetica').fillColor('#000000').fillOpacity(1)
          .text(synopsis, x + 2, y + 47, { 
            width: labelWidth - 4, 
            height: availableHeight - 4,
            align: 'justify',
            lineGap: 0.2
          });
        doc.restore();
      }
      
      // Bottom elements with backgrounds
      if (book.sent_to_estante_virtual) {
        doc.save();
        doc.rect(x + 1, y + labelHeight - 37, labelWidth - 2, 10).fillAndStroke('#ffffff', '#000000');
        doc.fontSize(4).font('Helvetica').fillColor('#000000')
          .text('Ø=Üñ Disponível Online', x + 2, y + labelHeight - 35, { 
            width: labelWidth - 4, 
            align: 'center'
          });
        doc.restore();
      }
      
      let infoText = '';
      if (book.edition) infoText += book.edition;
      if (book.condition) infoText += (infoText ? ' • ' : '') + book.condition;
      if (infoText) {
        doc.save();
        doc.rect(x + 1, y + labelHeight - 22, labelWidth - 2, 8).fillAndStroke('#ffffff', '#000000');
        doc.fontSize(4).font('Helvetica').fillColor('#000000')
          .text(infoText, x + 2, y + labelHeight - 20, { 
            width: labelWidth - 4, 
            align: 'center'
          });
        doc.restore();
      }
      
      if (book.unique_code) {
        doc.save();
        doc.rect(x + 1, y + labelHeight - 10, labelWidth - 2, 8).fillAndStroke('#ffffff', '#000000');
        doc.fontSize(4).font('Helvetica').fillColor('#000000')
          .text(book.unique_code, x + 2, y + labelHeight - 8, { 
            width: labelWidth - 4, 
            align: 'center'
          });
        doc.restore();
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
    const templateData = await storage.getSetting('custom_template_data');
    const templateName = await storage.getSetting('custom_template_name');
    const templateType = await storage.getSetting('custom_template_type');
    const layoutElements = await storage.getSetting('custom_layout_elements');
    
    // Get default brand information
    const defaultStoreName = await storage.getSetting('default_store_name');
    const defaultLogoData = await storage.getSetting('default_logo_data');
    const defaultStoreAddress = await storage.getSetting('default_store_address');
    const defaultStorePhone = await storage.getSetting('default_store_phone');
    
    res.json({
      hasTemplate: !!templateData?.value,
      templateName: templateName?.value || null,
      templateType: templateType?.value || null,
      hasCustomLayout: !!layoutElements?.value,
      layoutElements: layoutElements?.value ? JSON.parse(layoutElements.value) : null,
      brandInfo: {
        storeName: defaultStoreName?.value || null,
        logoData: defaultLogoData?.value || null,
        address: defaultStoreAddress?.value || null,
        phone: defaultStorePhone?.value || null
      }
    });
  } catch (error) {
    console.error('Erro ao buscar informações do modelo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export async function saveCustomLayout(req: Request, res: Response) {
  try {
    const { elements, brandInfo } = req.body;
    
    if (!elements || !Array.isArray(elements)) {
      return res.status(400).json({ error: 'Elementos de layout são obrigatórios' });
    }
    
    console.log('Saving custom layout:', elements);
    await storage.setSetting('custom_layout_elements', JSON.stringify(elements));
    
    // Save brand information as default if provided
    if (brandInfo) {
      console.log('Saving brand info as default:', brandInfo);
      if (brandInfo.storeName) {
        await storage.setSetting('default_store_name', brandInfo.storeName);
      }
      if (brandInfo.logoData) {
        await storage.setSetting('default_logo_data', brandInfo.logoData);
      }
      if (brandInfo.address) {
        await storage.setSetting('default_store_address', brandInfo.address);
      }
      if (brandInfo.phone) {
        await storage.setSetting('default_store_phone', brandInfo.phone);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Layout e configurações de marca salvos como padrão'
    });
  } catch (error) {
    console.error('Erro ao salvar layout personalizado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export async function generateCustomLayoutPDF(req: Request, res: Response) {
  try {
    const books = await storage.getAllBooks();
    
    if (books.length === 0) {
      return res.status(400).json({ error: 'Nenhum livro cadastrado' });
    }

    // Get custom layout and template
    const layoutSetting = await storage.getSetting('custom_layout_elements');
    const templateDataSetting = await storage.getSetting('custom_template_data');
    const templateNameSetting = await storage.getSetting('custom_template_name');
    const templateTypeSetting = await storage.getSetting('custom_template_type');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="etiquetas-layout-personalizado.pdf"');

    // Dimensions: 10cm height x 2.5cm width (1cm = 28.35 points)
    const labelWidth = 2.5 * 28.35; // ~71 points
    const labelHeight = 10 * 28.35; // ~284 points
    
    const doc = new PDFDocument({ 
      margin: 10,
      size: 'A4'
    });
    
    doc.pipe(res);

    doc.fontSize(16).text('Etiquetas com Layout Personalizado', { align: 'center' });
    if (templateNameSetting?.value) {
      doc.fontSize(10).text(`Modelo: ${templateNameSetting.value}`, { align: 'center' });
    }
    doc.fontSize(10).text('Dimensões: 10cm altura × 2,5cm largura | 6 etiquetas por página', { align: 'center' });
    doc.moveDown(2);

    const pageWidth = 595; // A4 width
    const pageHeight = 842; // A4 height
    const margin = 10;
    
    // Fixed layout: 6 etiquetas horizontais por página
    const labelsPerPage = 6;
    const cols = 6; // 6 colunas horizontais
    
    // Calculate spacing to center labels on page
    const availableWidth = pageWidth - 2 * margin;
    const totalLabelsWidth = cols * labelWidth;
    const extraSpace = availableWidth - totalLabelsWidth;
    const spacing = extraSpace / (cols - 1); // Espaçamento entre etiquetas
    
    let currentY = doc.y + 50; // Start position for labels
    let labelCount = 0;

    // Parse custom layout elements
    let customElements = [];
    if (layoutSetting?.value) {
      try {
        customElements = JSON.parse(layoutSetting.value);
      } catch (error) {
        console.warn('Error parsing custom layout, using default');
      }
    }

    books.forEach((book) => {
      if (labelCount > 0 && labelCount % labelsPerPage === 0) {
        doc.addPage();
        currentY = margin + 80; // Reset Y position for new page
        labelCount = 0;
      }

      const col = labelCount % cols;
      const x = margin + col * (labelWidth + spacing);
      const y = currentY;

      // If custom template exists, use it as background
      if (templateDataSetting?.value && templateTypeSetting?.value) {
        try {
          const templateData = templateDataSetting.value;
          const templateType = templateTypeSetting.value;
          
          // For images, insert as background from base64 data
          if (templateType.startsWith('image/')) {
            const base64Data = templateData.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            doc.image(imageBuffer, x, y, {
              width: labelWidth,
              height: labelHeight,
              opacity: 0.3
            });
          }
        } catch (error) {
          console.warn('Error loading custom template:', error);
        }
      }

      // Draw label border
      doc.rect(x, y, labelWidth, labelHeight).stroke();

      // Render custom elements or fallback to default
      if (customElements.length > 0) {
        customElements.forEach((element: any) => {
          const elementX = x + (element.x / 100) * labelWidth;
          const elementY = y + (element.y / 100) * labelHeight;
          const elementWidth = (element.width / 100) * labelWidth;
          const elementHeight = (element.height / 100) * labelHeight;

          // Background
          if (element.backgroundColor && element.opacity > 0) {
            doc.save();
            doc.fillOpacity(element.opacity);
            doc.rect(elementX, elementY, elementWidth, elementHeight).fill(element.backgroundColor);
            doc.restore();
          }

          // Get content based on element type
          let content = '';
          switch (element.type) {
            case 'price':
              const finalPrice = book.used_price || book.new_price || 0;
              content = finalPrice > 0 ? `R$ ${finalPrice.toFixed(2)}` : '';
              break;
            case 'title':
              content = book.title.toUpperCase();
              break;
            case 'author':
              content = book.author;
              break;
            case 'synopsis':
              content = book.synopsis ? book.synopsis.substring(0, 100) + '...' : '';
              break;
            case 'code':
              content = book.unique_code || '';
              break;
            case 'condition':
              content = book.condition || '';
              break;
          }

          // Render text
          if (content) {
            doc.save();
            doc.fontSize(element.fontSize);
            doc.font(element.fontWeight === 'bold' ? 'Helvetica-Bold' : 'Helvetica');
            doc.fillColor(element.color);
            doc.text(content, elementX + 2, elementY + 2, {
              width: elementWidth - 4,
              height: elementHeight - 4,
              align: element.textAlign,
              ellipsis: true
            });
            doc.restore();
          }
        });
      } else {
        // Default layout if no custom elements
        const finalPrice = book.used_price || book.new_price || 0;
        
        if (finalPrice > 0) {
          doc.fontSize(8).font('Helvetica-Bold')
            .text(`R$ ${finalPrice.toFixed(2)}`, x + 2, y + 5, { 
              width: labelWidth - 4, 
              align: 'center'
            });
        }
        
        doc.fontSize(6).font('Helvetica-Bold')
          .text(book.title.toUpperCase(), x + 2, y + 20, { 
            width: labelWidth - 4, 
            align: 'center'
          });
        
        doc.fontSize(5).font('Helvetica')
          .text(book.author, x + 2, y + 35, { 
            width: labelWidth - 4, 
            align: 'center'
          });
      }

      labelCount++;
    });

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar PDF com layout personalizado:', error);
    res.status(500).json({ error: 'Erro ao gerar PDF com layout personalizado' });
  }
}