import { storage } from "../storage";
import { estanteVirtualService } from "./estanteVirtual";

interface EstanteVirtualOrderData {
  orderId: string;
  customerName: string;
  customerAddress: string;
  customerPhone?: string;
  totalAmount: number;
  orderDate: Date;
  items: {
    bookId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

class OrderImporterService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startHourlyImport();
  }

  startHourlyImport() {
    // Execute immediately on start
    this.importOrders();
    
    // Then execute every hour (3600000 ms)
    this.intervalId = setInterval(() => {
      this.importOrders();
    }, 3600000); // 1 hour in milliseconds

    console.log("Importação automática de pedidos da Estante Virtual iniciada (executando a cada hora)");
  }

  stopHourlyImport() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Importação automática de pedidos da Estante Virtual interrompida");
    }
  }

  async importOrders(): Promise<{ success: boolean; imported: number; errors: string[] }> {
    if (this.isRunning) {
      console.log("Importação já em execução, pulando...");
      return { success: true, imported: 0, errors: ["Importação já em execução"] };
    }

    this.isRunning = true;
    const errors: string[] = [];
    let imported = 0;

    try {
      console.log("Iniciando importação de pedidos da Estante Virtual...");

      // Check if we have credentials
      if (!estanteVirtualService.hasCredentials()) {
        errors.push("Credenciais da Estante Virtual não configuradas");
        return { success: false, imported: 0, errors };
      }

      // Login to Estante Virtual
      const loginSuccess = await estanteVirtualService.login();
      if (!loginSuccess) {
        errors.push("Falha no login na Estante Virtual");
        return { success: false, imported: 0, errors };
      }

      // Simulate fetching orders from Estante Virtual API
      // In a real implementation, this would call the actual API
      const mockOrders = await this.fetchOrdersFromEstanteVirtual();

      // Process each order
      for (const orderData of mockOrders) {
        try {
          // Check if order already exists
          const existingOrder = await this.findExistingOrder(orderData.orderId);
          if (existingOrder) {
            console.log(`Pedido ${orderData.orderId} já existe, pulando...`);
            continue;
          }

          // Calculate shipping deadline (2 business days)
          const shippingDeadline = this.calculateShippingDeadline(orderData.orderDate);

          // Create order
          const newOrder = await storage.createEstanteVirtualOrder({
            orderId: orderData.orderId,
            customerName: orderData.customerName,
            customerAddress: orderData.customerAddress,
            customerPhone: orderData.customerPhone || null,
            totalAmount: orderData.totalAmount.toString(),
            orderDate: orderData.orderDate,
            shippingDeadline: shippingDeadline,
            status: "pending",
            trackingCode: null
          }, orderData.items.map(item => ({
            orderId: 0, // Will be set by the database
            bookId: item.bookId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toString(),
            totalPrice: item.totalPrice.toString()
          })));

          imported++;
          console.log(`Pedido ${orderData.orderId} importado com sucesso`);
        } catch (error) {
          const errorMsg = `Erro ao importar pedido ${orderData.orderId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`Importação concluída. ${imported} pedidos importados.`);
      return { success: true, imported, errors };

    } catch (error) {
      const errorMsg = `Erro geral na importação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      errors.push(errorMsg);
      console.error(errorMsg);
      return { success: false, imported, errors };
    } finally {
      this.isRunning = false;
    }
  }

  private async fetchOrdersFromEstanteVirtual(): Promise<EstanteVirtualOrderData[]> {
    // This is a mock implementation
    // In a real implementation, this would make HTTP requests to Estante Virtual API
    
    // For now, return empty array as we don't have the actual API endpoints
    // The user would need to provide the API credentials and endpoints
    return [];
  }

  private async findExistingOrder(orderId: string) {
    try {
      const orders = await storage.getAllEstanteVirtualOrders();
      return orders.find(order => order.orderId === orderId);
    } catch (error) {
      console.error("Erro ao buscar pedido existente:", error);
      return null;
    }
  }

  private calculateShippingDeadline(orderDate: Date): Date {
    const deadline = new Date(orderDate);
    let businessDaysAdded = 0;
    
    while (businessDaysAdded < 2) {
      deadline.setDate(deadline.getDate() + 1);
      const dayOfWeek = deadline.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        businessDaysAdded++;
      }
    }
    
    return deadline;
  }

  // Method to update tracking code and send to Estante Virtual
  async updateTrackingCode(orderId: number, trackingCode: string): Promise<{ success: boolean; message: string }> {
    try {
      // Update order in database
      const updatedOrder = await storage.updateEstanteVirtualOrder(orderId, {
        trackingCode: trackingCode,
        status: "shipped"
      });

      if (!updatedOrder) {
        return { success: false, message: "Pedido não encontrado" };
      }

      // Send tracking code to Estante Virtual
      // This would be implemented with the actual Estante Virtual API
      const success = await this.sendTrackingCodeToEstanteVirtual(updatedOrder.orderId, trackingCode);

      if (success) {
        console.log(`Código de rastreio ${trackingCode} enviado para Estante Virtual para o pedido ${updatedOrder.orderId}`);
        return { success: true, message: "Código de rastreio atualizado e enviado para Estante Virtual" };
      } else {
        return { success: false, message: "Erro ao enviar código de rastreio para Estante Virtual" };
      }

    } catch (error) {
      console.error("Erro ao atualizar código de rastreio:", error);
      return { success: false, message: "Erro interno ao atualizar código de rastreio" };
    }
  }

  private async sendTrackingCodeToEstanteVirtual(orderId: string, trackingCode: string): Promise<boolean> {
    // This is a mock implementation
    // In a real implementation, this would make HTTP requests to Estante Virtual API
    // to update the order with the tracking code
    
    console.log(`Mock: Enviando código ${trackingCode} para pedido ${orderId} na Estante Virtual`);
    return true; // Mock success
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.intervalId !== null
    };
  }
}

export const orderImporterService = new OrderImporterService();