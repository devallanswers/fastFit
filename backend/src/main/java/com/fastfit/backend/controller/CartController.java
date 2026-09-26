package com.fastfit.backend.controller;

import com.fastfit.backend.dto.request.CartRequests.*;
import com.fastfit.backend.dto.request.PackageRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.User;
import com.fastfit.backend.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getCart(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.getCart(user)));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartResponse>> addItem(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AddCartItemRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.addItem(user, req)));
    }

    @PostMapping("/packages")
    public ResponseEntity<ApiResponse<CartResponse>> addPackage(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AddPackageToCartRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.addPackage(user, req)));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> updateItem(
            @AuthenticationPrincipal User user,
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateCartItemRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.updateItem(user, itemId, req)));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> removeItem(
            @AuthenticationPrincipal User user,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.removeItem(user, itemId)));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<String>> clearCart(@AuthenticationPrincipal User user) {
        cartService.clearCart(user);
        return ResponseEntity.ok(ApiResponse.ok("Carrinho limpo"));
    }
}
