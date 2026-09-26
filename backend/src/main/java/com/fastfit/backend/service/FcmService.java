package com.fastfit.backend.service;

import com.fastfit.backend.entity.Order;
import com.fastfit.backend.entity.StoreSettings;
import com.fastfit.backend.repository.StoreSettingsRepository;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class FcmService {

    private final StoreSettingsRepository storeSettingsRepository;

    public void sendOrderStatusNotification(Order order) {
        String token = order.getUser().getFcmToken();
        if (token == null || token.isBlank()) return;

        StoreSettings settings = storeSettingsRepository.findFirstBy().orElse(null);
        String storeName = settings != null && settings.getStoreName() != null
                ? settings.getStoreName() : "Fast Fit";

        String title = storeName;
        String body = switch (order.getStatus()) {
            case RECEIVED      -> "Pedido #" + order.getId() + " recebido! Estamos confirmando.";
            case IN_PREPARATION -> "Pedido #" + order.getId() + " em preparo. Logo fica pronto!";
            case READY         -> switch (order.getType()) {
                case PICKUP    -> "Pedido #" + order.getId() + " pronto! Pode vir retirar.";
                case DELIVERY,
                     SCHEDULED -> "Pedido #" + order.getId() + " saiu para entrega!";
            };
            case FINISHED      -> "Pedido #" + order.getId() + " entregue. Bom apetite!";
            case DELIVERED_PAYMENT_DUE -> "Pedido #" + order.getId() + " entregue. Pagamento pendente.";
            case CANCELED      -> "Pedido #" + order.getId() + " foi cancelado. Entre em contato.";
        };

        try {
            Message message = Message.builder()
                    .setToken(token)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .setImage("/icons/icon-192x192.png")
                            .build())
                    .putData("orderId", String.valueOf(order.getId()))
                    .putData("status", order.getStatus().name())
                    .build();

            FirebaseMessaging.getInstance().send(message);
            log.info("FCM enviado para pedido #{} status {}", order.getId(), order.getStatus());
        } catch (Exception e) {
            log.warn("Falha ao enviar FCM para pedido #{}: {}", order.getId(), e.getMessage());
        }
    }
}
