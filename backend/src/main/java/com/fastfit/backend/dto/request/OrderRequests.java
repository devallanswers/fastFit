package com.fastfit.backend.dto.request;

import com.fastfit.backend.entity.Order;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

public class OrderRequests {

    @Data
    public static class CreateOrderRequest {
        @NotNull Order.OrderType type;
        String deliveryAddress;
        String notes;
        @NotNull Order.PaymentMethod paymentMethod;
        Integer changeAmount;
        // Para SCHEDULED: data/hora desejada pelo cliente
        String scheduledDateTime; // ISO format: "2024-03-15T14:00"

        // Dados do cliente sem login (obrigatórios quando não autenticado)
        String guestName;
        String guestPhone;

        // Itens do carrinho local (enviados pelo frontend quando não há sessão)
        List<GuestCartItem> cartItems;
    }

    @Data
    public static class GuestCartItem {
        Long productId;
        Long packageId;
        Integer quantity;
        java.math.BigDecimal priceSnapshot;
        String productName;
        String productImage;
        String packageSelectionsJson;
    }

    @Data
    public static class UpdateOrderStatusRequest {
        @NotNull Order.OrderStatus status;
    }
}

