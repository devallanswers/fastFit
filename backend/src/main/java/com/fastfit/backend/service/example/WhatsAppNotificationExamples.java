package com.fastfit.backend.service.example;

import com.fastfit.backend.entity.Order;
import com.fastfit.backend.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * EXEMPLOS DE USO DO WhatsAppService NO PROJETO FFstore
 *
 * Notificações de atualização de status de pedido via WhatsApp
 */

@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsAppNotificationExamples {

    private final WhatsAppService whatsAppService;

    /**
     * Notifica quando o pedido é recebido
     */
    public void notifyOrderReceived(Order order) {
        String clientPhone = order.getUser() != null ? order.getUser().getPhone() : order.getGuestPhone();

        String message = String.format(
            "✓ Pedido Recebido!\n\n" +
            "Número: #%d\n" +
            "Total: R$ %s\n" +
            "Status: Recebido\n\n" +
            "Acompanhe o progresso aqui: https://seu-site.com/pedido/%d",
            order.getId(),
            order.getTotalAmount(),
            order.getId()
        );

        whatsAppService.sendText(clientPhone, message);
    }

    /**
     * Notifica quando o pedido está em preparação
     */
    public void notifyOrderInPreparation(Order order) {
        String clientPhone = order.getUser() != null ? order.getUser().getPhone() : order.getGuestPhone();

        String message = String.format(
            "👨‍🍳 Seu Pedido Está em Preparação!\n\n" +
            "Número: #%d\n" +
            "Status: Em preparação\n\n" +
            "Você será notificado quando sair para entrega."
        );

        whatsAppService.sendText(clientPhone, message);
    }

    /**
     * Notifica quando o pedido está pronto para retirada/entrega
     */
    public void notifyOrderReady(Order order) {
        String clientPhone = order.getUser() != null ? order.getUser().getPhone() : order.getGuestPhone();

        String message = String.format(
            "📦 Seu Pedido Saiu para Entrega!\n\n" +
            "Número: #%d\n" +
            "Status: Saiu para a entrega\n\n" +
            "Acompanhe sua entrega: https://seu-site.com/pedido/%d",
            order.getId(),
            order.getId()
        );

        whatsAppService.sendText(clientPhone, message);
    }

    /**
     * Notifica quando o pedido é entregue/finalizado
     */
    public void notifyOrderFinished(Order order) {
        String clientPhone = order.getUser() != null ? order.getUser().getPhone() : order.getGuestPhone();

        String message = String.format(
            "✅ Seu Pedido Foi Entregue!\n\n" +
            "Número: #%d\n" +
            "Status: Finalizado\n\n" +
            "Obrigado pela compra! Volte sempre.",
            order.getId()
        );

        whatsAppService.sendText(clientPhone, message);
    }

    /**
     * Notifica quando o pedido é cancelado
     */
    public void notifyOrderCancelled(Order order, String reason) {
        String clientPhone = order.getUser() != null ? order.getUser().getPhone() : order.getGuestPhone();

        String message = String.format(
            "❌ Seu Pedido Foi Cancelado\n\n" +
            "Número: #%d\n" +
            "Motivo: %s\n\n" +
            "Se tiver dúvidas, entre em contato conosco.",
            order.getId(),
            reason
        );

        whatsAppService.sendText(clientPhone, message);
    }

    // ============ EXEMPLOS DE INTEGRAÇÃO ============
    /*
     * Use em OrderService:
     *
     * @Service
     * public class OrderService {
     *
     *     private final OrderRepository orderRepository;
     *     private final WhatsAppNotificationExamples whatsAppNotifications;
     *
     *     public void updateOrderStatus(Long orderId, OrderStatus newStatus) {
     *         Order order = orderRepository.findById(orderId).orElseThrow();
     *         order.setStatus(newStatus);
     *         orderRepository.save(order);
     *
     *         // Notificar cliente baseado no novo status
     *         switch (newStatus) {
     *             case RECEIVED:
     *                 whatsAppNotifications.notifyOrderReceived(order);
     *                 break;
     *             case IN_PREPARATION:
     *                 whatsAppNotifications.notifyOrderInPreparation(order);
     *                 break;
     *             case READY:
     *                 whatsAppNotifications.notifyOrderReady(order);
     *                 break;
     *             case FINISHED:
     *                 whatsAppNotifications.notifyOrderFinished(order);
     *                 break;
     *             case CANCELED:
     *                 whatsAppNotifications.notifyOrderCancelled(order, "Solicitado pelo cliente");
     *                 break;
     *         }
     *     }
     * }
     */
}
