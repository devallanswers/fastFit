package com.fastfit.backend.controller;

import com.fastfit.backend.entity.Order;
import com.fastfit.backend.entity.User;
import com.fastfit.backend.repository.OrderRepository;
import com.fastfit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/whatsapp")
@RequiredArgsConstructor
public class WhatsAppController {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    @Value("${n8n.webhook.secret:}")
    private String webhookSecret;

    @GetMapping("/customer-info")
    public ResponseEntity<Map<String, Object>> getCustomerInfo(
            @RequestParam String phone,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String secret) {

        // Valida secret
        if (webhookSecret != null && !webhookSecret.isBlank() && !webhookSecret.equals(secret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Normaliza telefone
        String normalized = phone.replaceAll("\\D", "");
        if (normalized.startsWith("55") && normalized.length() > 11) {
            normalized = normalized.substring(2);
        }
        final String finalPhone = normalized;

        // Busca usuário pelo telefone
        User user = userRepository.findAll().stream()
                .filter(u -> u.getPhone() != null &&
                        u.getPhone().replaceAll("\\D", "").endsWith(finalPhone))
                .findFirst()
                .orElse(null);

        if (user == null) {
            return ResponseEntity.ok(Map.of(
                "found", false,
                "message", "Cliente não encontrado. Faça seu cadastro em nosso site!"
            ));
        }

        // Busca pedidos do usuário
        List<Order> allOrders = orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

        // Filtra pedidos ativos
        List<Map<String, Object>> activeOrders = allOrders.stream()
                .filter(o -> List.of(
                    Order.OrderStatus.RECEIVED,
                    Order.OrderStatus.IN_PREPARATION,
                    Order.OrderStatus.READY,
                    Order.OrderStatus.DELIVERED_PAYMENT_DUE
                ).contains(o.getStatus()))
                .limit(3)
                .map(this::mapOrder)
                .toList();

        // Últimos 3 pedidos
        List<Map<String, Object>> recentOrders = allOrders.stream()
                .limit(3)
                .map(this::mapOrder)
                .toList();

        return ResponseEntity.ok(Map.of(
            "found",        true,
            "customerName", user.getName(),
            "activeOrders", activeOrders,
            "recentOrders", recentOrders
        ));
    }

    private Map<String, Object> mapOrder(Order o) {
        return Map.of(
            "id",          o.getId(),
            "status",      o.getStatus().name(),
            "statusLabel", translateStatus(o.getStatus().name()),
            "total",       o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO
        );
    }

    private String translateStatus(String status) {
        return switch (status) {
            case "RECEIVED"       -> "Recebido";
            case "IN_PREPARATION" -> "Em preparo";
            case "READY"          -> "Pronto";
            case "DELIVERED_PAYMENT_DUE" -> "Entregue - falta pagar";
            case "CANCELED"       -> "Cancelado";
            default               -> status;
        };
    }
}