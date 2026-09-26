package com.fastfit.backend.controller;

import com.fastfit.backend.dto.request.OrderRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.User;
import com.fastfit.backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // GET /api/orders?phone=xxx  → busca por telefone (guest ou logado)
    // GET /api/orders            → busca por usuário logado (fallback)
    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrders(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String phone) {
        if (phone != null && !phone.isBlank()) {
            return ResponseEntity.ok(ApiResponse.ok(orderService.getOrdersByPhone(phone)));
        }
        if (user != null) {
            return ResponseEntity.ok(ApiResponse.ok(orderService.getUserOrders(user)));
        }
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateOrderRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.createOrder(user, req)));
    }

    // Cancelar: usuário logado usa sua autenticação; guest envia phone como param
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestParam(required = false) String phone) {
        if (phone != null && !phone.isBlank()) {
            return ResponseEntity.ok(ApiResponse.ok(orderService.cancelOrderByPhone(phone, id)));
        }
        return ResponseEntity.ok(ApiResponse.ok(orderService.cancelOrder(user, id)));
    }
}
