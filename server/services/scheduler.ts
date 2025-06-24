// Daily export scheduler service
class DailyExportScheduler {
  private scheduledTimeout: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.scheduleNextExport();
  }

  private scheduleNextExport() {
    // Calculate time until next 14:00 (2 PM)
    const now = new Date();
    const next14h = new Date();
    
    next14h.setHours(14, 0, 0, 0); // Set to 14:00:00.000
    
    // If current time is past 14:00 today, schedule for tomorrow
    if (now >= next14h) {
      next14h.setDate(next14h.getDate() + 1);
    }
    
    const timeUntilExport = next14h.getTime() - now.getTime();
    
    console.log(`Próxima exportação automática agendada para: ${next14h.toLocaleString('pt-BR')}`);
    
    this.scheduledTimeout = setTimeout(() => {
      this.performDailyExport();
    }, timeUntilExport);
  }

  private async performDailyExport() {
    if (this.isRunning) {
      console.log("Exportação já em andamento, pulando...");
      return;
    }

    this.isRunning = true;
    console.log("Iniciando exportação diária automática do acervo...");

    try {
      // Import storage to get books
      const { storage } = await import("../storage");
      const { formatBooksForEstanteVirtual, generateExcelFile } = await import("./export");
      
      // Get all books from database
      const books = await storage.getAllBooks();
      
      if (books.length === 0) {
        console.log("Nenhum livro encontrado para exportação");
        this.scheduleNextExport(); // Schedule next day
        this.isRunning = false;
        return;
      }

      // Format books for Estante Virtual
      const formattedBooks = formatBooksForEstanteVirtual(books);
      
      // Generate Excel file
      const excelBuffer = generateExcelFile(formattedBooks);
      
      // In a real implementation, you would:
      // 1. Upload the file to Estante Virtual using their API
      // 2. Send notification email/webhook
      // 3. Save export log to database
      
      console.log(`Exportação concluída: ${books.length} livros processados`);
      
      // Log export completion
      await this.logExportCompletion(books.length);
      
      // Send notification (placeholder for now)
      await this.sendNotification(books.length);
      
    } catch (error) {
      console.error("Erro na exportação diária:", error);
      
      // Log error
      await this.logExportError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      this.isRunning = false;
      this.scheduleNextExport(); // Schedule next day
    }
  }

  private async logExportCompletion(bookCount: number) {
    try {
      const { storage } = await import("../storage");
      
      await storage.setSetting('last_export_date', new Date().toISOString());
      await storage.setSetting('last_export_count', bookCount.toString());
      await storage.setSetting('last_export_status', 'success');
      
      console.log(`Export log salvo: ${bookCount} livros exportados`);
    } catch (error) {
      console.error("Erro ao salvar log da exportação:", error);
    }
  }

  private async logExportError(errorMessage: string) {
    try {
      const { storage } = await import("../storage");
      
      await storage.setSetting('last_export_date', new Date().toISOString());
      await storage.setSetting('last_export_status', 'error');
      await storage.setSetting('last_export_error', errorMessage);
      
      console.log(`Export error log salvo: ${errorMessage}`);
    } catch (error) {
      console.error("Erro ao salvar log de erro da exportação:", error);
    }
  }

  private async sendNotification(bookCount: number) {
    // In a real implementation, this would send email/SMS/webhook
    // For now, just log the notification
    console.log(`🔔 NOTIFICAÇÃO: Exportação diária concluída com sucesso!`);
    console.log(`📊 Total de livros exportados: ${bookCount}`);
    console.log(`🕐 Horário: ${new Date().toLocaleString('pt-BR')}`);
    console.log(`🔗 Link: https://painel.estantevirtual.com.br/acervo/export_request`);
    
    // Save notification to database for API access
    try {
      const { storage } = await import("../storage");
      const notification = {
        message: `Exportação diária concluída: ${bookCount} livros`,
        timestamp: new Date().toISOString(),
        type: 'export_complete',
        data: { bookCount, exportUrl: 'https://painel.estantevirtual.com.br/acervo/export_request' }
      };
      
      await storage.setSetting('last_notification', JSON.stringify(notification));
    } catch (error) {
      console.error("Erro ao salvar notificação:", error);
    }
  }

  // Manual trigger for testing
  async triggerManualExport(): Promise<{ success: boolean; message: string; bookCount?: number }> {
    if (this.isRunning) {
      return { success: false, message: "Exportação já em andamento" };
    }

    try {
      await this.performDailyExport();
      
      // Get last export count
      const { storage } = await import("../storage");
      const countSetting = await storage.getSetting('last_export_count');
      const bookCount = countSetting ? parseInt(countSetting.value) : 0;
      
      return { 
        success: true, 
        message: "Exportação manual concluída com sucesso",
        bookCount 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Erro na exportação: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      };
    }
  }

  getStatus() {
    const nextExport = new Date();
    nextExport.setHours(14, 0, 0, 0);
    if (new Date() >= nextExport) {
      nextExport.setDate(nextExport.getDate() + 1);
    }

    return {
      isRunning: this.isRunning,
      nextExportTime: nextExport.toISOString(),
      nextExportFormatted: nextExport.toLocaleString('pt-BR')
    };
  }

  stop() {
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }
    console.log("Agendamento de exportação diária cancelado");
  }
}

// Create singleton instance
export const dailyExportScheduler = new DailyExportScheduler();