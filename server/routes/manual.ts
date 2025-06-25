import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export async function generateManualPDF(req: Request, res: Response) {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: 'Manual do Sistema Luar Sebo',
        Author: 'Luar Sebo',
        Subject: 'Manual Completo de Instruções',
        Creator: 'Sistema Luar Sebo'
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Manual-Sistema-Luar-Sebo.pdf"');
    doc.pipe(res);

    // Função auxiliar para adicionar título
    const addTitle = (text: string, fontSize = 16, topMargin = 20) => {
      doc.moveDown(topMargin / 12);
      doc.fontSize(fontSize).font('Helvetica-Bold').fillColor('#2563eb');
      doc.text(text, { align: 'left' });
      doc.moveDown(0.5);
    };

    // Função auxiliar para adicionar subtítulo
    const addSubtitle = (text: string, fontSize = 12) => {
      doc.moveDown(0.3);
      doc.fontSize(fontSize).font('Helvetica-Bold').fillColor('#1f2937');
      doc.text(text);
      doc.moveDown(0.2);
    };

    // Função auxiliar para adicionar texto
    const addText = (text: string, fontSize = 10) => {
      doc.fontSize(fontSize).font('Helvetica').fillColor('#374151');
      doc.text(text, { align: 'justify' });
      doc.moveDown(0.3);
    };

    // Função auxiliar para adicionar lista
    const addList = (items: string[], fontSize = 10) => {
      doc.fontSize(fontSize).font('Helvetica').fillColor('#374151');
      items.forEach(item => {
        doc.text(`• ${item}`, { indent: 20 });
        doc.moveDown(0.1);
      });
      doc.moveDown(0.3);
    };

    // Capa
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1f2937');
    doc.text('MANUAL DO SISTEMA', { align: 'center' });
    doc.fontSize(32).fillColor('#2563eb');
    doc.text('LUAR SEBO', { align: 'center' });
    doc.moveDown(2);
    
    doc.fontSize(16).font('Helvetica').fillColor('#6b7280');
    doc.text('Sistema Completo de Gestão para Livrarias e Sebos', { align: 'center' });
    doc.moveDown(4);
    
    doc.fontSize(12).fillColor('#374151');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });

    // Nova página para conteúdo
    doc.addPage();

    // Índice
    addTitle('ÍNDICE', 18);
    const indiceItems = [
      '1. Visão Geral do Sistema',
      '2. Dashboard (Página Inicial)',
      '3. Gestão de Livros',
      '4. Controle de Estoque',
      '5. Sistema de Etiquetas Personalizadas',
      '6. Gestão de Vendas',
      '7. Sistema de Trocas',
      '8. Integração Estante Virtual',
      '9. Relatórios e Análises',
      '10. Configurações do Sistema',
      '11. Lista de Livros Clássicos',
      '12. Busca e Filtros Avançados',
      '13. Interface Responsiva',
      '14. Segurança e Backup',
      '15. Suporte e Ajuda',
      '16. Dicas de Produtividade'
    ];
    addList(indiceItems, 11);

    doc.addPage();

    // 1. Visão Geral
    addTitle('1. VISÃO GERAL DO SISTEMA', 18);
    addText('O Sistema Luar Sebo é uma solução completa para gestão de livrarias e sebos, oferecendo controle total sobre inventário, vendas, etiquetas personalizadas e integração com a Estante Virtual.');
    
    addSubtitle('Principais Benefícios:');
    addList([
      'Controle completo do inventário de livros',
      'Sistema de etiquetas personalizáveis e profissionais',
      'Integração automática com Estante Virtual',
      'Relatórios detalhados para tomada de decisão',
      'Interface moderna e intuitiva',
      'Sistema de trocas integrado',
      'Backup automático dos dados'
    ]);

    // 2. Dashboard
    addTitle('2. DASHBOARD (PÁGINA INICIAL)', 16);
    addText('O Dashboard oferece uma visão geral completa do seu negócio em tempo real.');
    
    addSubtitle('Funcionalidades Principais:');
    addList([
      'Estatísticas em tempo real: Total de livros, vendas diárias, estoque baixo',
      'Resumo de vendas com gráficos e métricas de performance',
      'Alertas importantes para livros com estoque baixo e pedidos pendentes',
      'Acesso rápido às principais funcionalidades do sistema',
      'Status da integração com Estante Virtual'
    ]);

    addSubtitle('Como usar:');
    addList([
      'Acesse a página inicial para visão geral do negócio',
      'Monitore as estatísticas principais no painel superior',
      'Use os cards de acesso rápido para navegar para outras seções',
      'Verifique alertas de estoque baixo regularmente'
    ]);

    // 3. Gestão de Livros
    addTitle('3. GESTÃO DE LIVROS', 16);
    addText('Sistema completo para cadastro, edição e gerenciamento do catálogo de livros.');
    
    addSubtitle('Funcionalidades:');
    addList([
      'Cadastro completo: ISBN, título, autor, editora, ano, edição',
      'Busca automática com integração a APIs para preenchimento automático',
      'Controle de preços: novo, usado e custo',
      'Informações detalhadas: sinopse, categoria, condição',
      'Geração automática de códigos únicos de identificação',
      'Upload de capas dos livros',
      'Edição em lote para alterações múltiplas'
    ]);

    addSubtitle('Passo a passo para adicionar um livro:');
    addList([
      '1. Clique em "Novo Livro"',
      '2. Digite o ISBN para preenchimento automático',
      '3. Complete campos não preenchidos automaticamente',
      '4. Configure preços novo, usado e custo',
      '5. Selecione categoria apropriada',
      '6. Confirme o cadastro'
    ]);

    doc.addPage();

    // 4. Controle de Estoque
    addTitle('4. CONTROLE DE ESTOQUE', 16);
    addText('Gestão completa do inventário físico com localização e alertas automatizados.');
    
    addSubtitle('Funcionalidades:');
    addList([
      'Inventário detalhado: quantidade disponível, reservada, vendida',
      'Sistema de localização física com prateleiras e posições',
      'Alertas automáticos para reposição de estoque',
      'Histórico completo de movimentações (entradas e saídas)',
      'Relatórios de estoque para análises e balanços',
      'Integração automática com sistema de vendas'
    ]);

    // 5. Sistema de Etiquetas (seção mais detalhada)
    addTitle('5. SISTEMA DE ETIQUETAS PERSONALIZADAS', 16);
    addText('O recurso mais avançado do sistema, permitindo criação de etiquetas profissionais com design personalizado.');
    
    addSubtitle('Funcionalidades Principais:');
    addList([
      'Templates customizáveis com upload de imagens de fundo',
      'Editor visual com posicionamento livre de elementos',
      'Elementos disponíveis: preço, título, autor, sinopse, código',
      'Configurações de marca: nome da loja, logo, endereço, telefone',
      'Formato otimizado: 6 etiquetas por página (10cm x 2.5cm)',
      'Geração em PDF de alta qualidade para impressão',
      'Salvamento automático de configurações como padrão'
    ]);

    addSubtitle('Como configurar etiquetas personalizadas:');
    
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1f2937');
    doc.text('Passo 1: Configurar Template');
    addText('• Acesse "Estoque" → "Customizar Etiquetas"\n• Clique em "Upload Template" para enviar imagem de fundo\n• A imagem será aplicada como fundo de todas as etiquetas');

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1f2937');
    doc.text('Passo 2: Posicionar Elementos');
    addText('• Preço: Arraste para posição desejada, configure tamanho e fonte\n• Título: Posicione e ajuste formatação (negrito, tamanho, alinhamento)\n• Autor: Configure posição e estilo\n• Sinopse: Define área para descrição do livro\n• Código: Posicione código único do livro');

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1f2937');
    doc.text('Passo 3: Configurar Formatação');
    addText('• Tamanho da fonte: Ajustável para cada elemento individualmente\n• Cor do texto: Escolha cores adequadas ao design\n• Alinhamento: Centro, esquerda ou direita\n• Fundo semi-transparente: Para melhor legibilidade sobre a imagem');

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1f2937');
    doc.text('Passo 4: Salvar e Gerar');
    addText('• Clique "Salvar Layout" para definir como padrão\n• Todas as configurações são mantidas para próximas gerações\n• Use "Lista + Etiquetas" para gerar PDF com lista e etiquetas\n• "Demo PDF" testa o layout com livros de exemplo');

    doc.addPage();

    // 6. Gestão de Vendas
    addTitle('6. GESTÃO DE VENDAS', 16);
    addSubtitle('Funcionalidades:');
    addList([
      'Registro de vendas com PDV integrado',
      'Múltiplos itens no carrinho de compras',
      'Diferentes formas de pagamento: dinheiro, cartão, PIX',
      'Sistema de desconto e promoções flexível',
      'Impressão de cupons e recibos personalizados',
      'Histórico completo de todas as transações',
      'Relatórios de vendas por período, produto e vendedor'
    ]);

    // 7. Sistema de Trocas
    addTitle('7. SISTEMA DE TROCAS', 16);
    addSubtitle('Funcionalidades:');
    addList([
      'Recebimento e avaliação de livros trazidos por clientes',
      'Política de trocas com cálculo automático de valores',
      'Sistema de pré-catalogação para análise antes da inclusão',
      'Processamento em lote para aprovação múltipla',
      'Histórico completo das operações de troca',
      'Relatórios detalhados das trocas realizadas'
    ]);

    // 8. Integração Estante Virtual
    addTitle('8. INTEGRAÇÃO ESTANTE VIRTUAL', 16);
    addSubtitle('Funcionalidades:');
    addList([
      'Sincronização automática de livros para marketplace',
      'Importação automática de pedidos e vendas',
      'Controle de estoque bidirecional',
      'Configuração de preços com markup automático',
      'Relatórios integrados de performance no marketplace',
      'Sistema de credenciais seguras para autenticação'
    ]);

    // 9. Relatórios e Análises
    addTitle('9. RELATÓRIOS E ANÁLISES', 16);
    addSubtitle('Funcionalidades:');
    addList([
      'Dashboard executivo com KPIs principais',
      'Relatórios de vendas por período, produto e categoria',
      'Análise de estoque: giro, sazonalidade, performance',
      'Relatórios financeiros: faturamento, custos, margem',
      'Exportação em Excel, PDF e CSV',
      'Gráficos interativos com visualizações dinâmicas'
    ]);

    // 10. Configurações
    addTitle('10. CONFIGURAÇÕES DO SISTEMA', 16);
    addSubtitle('Funcionalidades:');
    addList([
      'Dados da empresa: nome, endereço, CNPJ, contatos',
      'Configurações de preços: margens e descontos padrão',
      'Política de trocas: valores e percentuais',
      'Integração externa: APIs e marketplaces',
      'Sistema de backup e restauração',
      'Controle de usuários e permissões'
    ]);

    doc.addPage();

    // Dicas de Produtividade
    addTitle('11. DICAS DE PRODUTIVIDADE', 16);
    
    addSubtitle('Fluxo de Trabalho Recomendado:');
    addList([
      'Manhã: Verificar dashboard e pedidos da Estante Virtual',
      'Cadastro: Registrar novos livros recebidos',
      'Organização: Atualizar localizações e estoque',
      'Vendas: Processar vendas do dia',
      'Relatórios: Análise semanal/mensal'
    ]);

    addSubtitle('Atalhos Úteis:');
    addList([
      'Busca rápida: Use código ou ISBN para localização instantânea',
      'Cadastro express: ISBN + Enter para preenchimento automático',
      'Duplicação: Copie livros similares para agilizar cadastro',
      'Filtros salvos: Mantenha buscas frequentes salvas'
    ]);

    addSubtitle('Melhores Práticas:');
    addList([
      'Mantenha códigos únicos para facilitar rastreamento',
      'Atualize estoque regularmente para evitar vendas incorretas',
      'Use etiquetas personalizadas para profissionalizar apresentação',
      'Monitore relatórios para identificar tendências e oportunidades',
      'Realize backup regular para proteger dados importantes'
    ]);

    // Conclusão
    addTitle('12. CONSIDERAÇÕES FINAIS', 16);
    addText('O Sistema Luar Sebo foi desenvolvido especificamente para atender às necessidades de livrarias e sebos, oferecendo todas as ferramentas necessárias para uma gestão eficiente e profissional.');
    
    addText('Com este manual, você possui todas as informações necessárias para utilizar o sistema em sua capacidade máxima. Lembre-se de que a prática regular com as funcionalidades aumentará sua produtividade e aproveitamento do sistema.');

    addSubtitle('Suporte:');
    addText('Para dúvidas adicionais ou suporte técnico, utilize os recursos de ajuda integrados ao sistema ou consulte a documentação online atualizada.');

    // Rodapé final
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280');
    doc.text('Sistema Luar Sebo - Gestão Completa para Livrarias e Sebos', { align: 'center' });
    doc.text(`Manual gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Error generating manual PDF:', error);
    res.status(500).json({ error: 'Erro ao gerar manual em PDF' });
  }
}