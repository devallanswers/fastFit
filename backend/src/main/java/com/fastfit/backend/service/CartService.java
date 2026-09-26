package com.fastfit.backend.service;

import com.fastfit.backend.dto.request.CartRequests.*;
import com.fastfit.backend.dto.request.PackageRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.*;
import com.fastfit.backend.exception.AppException;
import com.fastfit.backend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final PackageRepository packageRepository;
    private final ObjectMapper objectMapper;

    private Cart getOrCreateCart(User user) {
        return cartRepository.findByUserId(user.getId()).orElseGet(() -> {
            Cart cart = Cart.builder().user(user).build();
            return cartRepository.save(cart);
        });
    }

    @Transactional
    public CartResponse getCart(User user) {
        Cart cart = getOrCreateCart(user);
        return mapCart(cart);
    }

    @Transactional
    public CartResponse addItem(User user, AddCartItemRequest req) {
        Cart cart = getOrCreateCart(user);
        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new AppException("Produto não encontrado"));
        if (!product.isActive()) throw new AppException("Produto indisponível");

        BigDecimal totalPrice = product.getEffectivePrice();

        // Procura item existente com o mesmo produto
        var existingItem = cart.getItems().stream()
                .filter(i -> i.getProduct() != null && i.getProduct().getId().equals(product.getId()))
                .findFirst();

        if (existingItem.isPresent()) {
            if (product.getStockQuantity() != null && existingItem.get().getQuantity() + req.getQuantity() > product.getStockQuantity())
                throw new AppException("Estoque insuficiente. Restam " + product.getStockQuantity() + " unidade(s) de " + product.getName());
            existingItem.get().setQuantity(existingItem.get().getQuantity() + req.getQuantity());
        } else {
            if (product.getStockQuantity() != null && req.getQuantity() > product.getStockQuantity())
                throw new AppException("Estoque insuficiente. Restam " + product.getStockQuantity() + " unidade(s) de " + product.getName());
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .product(product)
                    .quantity(req.getQuantity())
                    .priceSnapshot(totalPrice)
                    .build();
            cart.getItems().add(newItem);
        }

        return mapCart(cartRepository.save(cart));
    }

    @Transactional
    public CartResponse addPackage(User user, AddPackageToCartRequest req) {
        Cart cart = getOrCreateCart(user);

        com.fastfit.backend.entity.Package pkg = packageRepository.findAllWithSlots().stream()
                .filter(p -> p.getId().equals(req.getPackageId()))
                .findFirst()
                .orElseThrow(() -> new AppException("Pacote não encontrado"));

        if (!pkg.isActive()) throw new AppException("Pacote indisponível");

        for (var slot : pkg.getSlots()) {
            var sel = req.getSelections().stream()
                    .filter(s -> s.getSlotId().equals(slot.getId()))
                    .findFirst()
                    .orElseThrow(() -> new AppException("Seleção ausente para slot: " + slot.getName()));

            if (sel.getProductIds().size() != slot.getQuantity()) {
                throw new AppException(String.format(
                    "Slot '%s' requer %d item(s), mas %d foram selecionados",
                    slot.getName(), slot.getQuantity(), sel.getProductIds().size()
                ));
            }
        }

        String selectionsJson;
        try {
            selectionsJson = objectMapper.writeValueAsString(req.getSelections());
        } catch (Exception e) {
            selectionsJson = "[]";
        }

        CartItem item = CartItem.builder()
                .cart(cart)
                .product(null)
                .packageRef(pkg)
                .packageSelectionsJson(selectionsJson)
                .quantity(1)
                .priceSnapshot(pkg.getPrice())
                .build();

        cart.getItems().add(item);
        return mapCart(cartRepository.save(cart));
    }

    @Transactional
    public CartResponse updateItem(User user, Long itemId, UpdateCartItemRequest req) {
        Cart cart = getOrCreateCart(user);
        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst().orElseThrow(() -> new AppException("Item não encontrado"));

        if (req.getQuantity() <= 0) cart.getItems().remove(item);
        else {
            if (item.getProduct() != null && item.getProduct().getStockQuantity() != null && req.getQuantity() > item.getProduct().getStockQuantity())
                throw new AppException("Estoque insuficiente. Restam " + item.getProduct().getStockQuantity() + " unidade(s)");
            item.setQuantity(req.getQuantity());
        }

        return mapCart(cartRepository.save(cart));
    }

    @Transactional
    public CartResponse removeItem(User user, Long itemId) {
        Cart cart = getOrCreateCart(user);
        cart.getItems().removeIf(i -> i.getId().equals(itemId));
        return mapCart(cartRepository.save(cart));
    }

    @Transactional
    public void clearCart(User user) {
        Cart cart = getOrCreateCart(user);
        cart.getItems().clear();
        cartRepository.save(cart);
    }

    private CartResponse mapCart(Cart cart) {
    List<CartItemResponse> items = cart.getItems().stream().map(item -> {
        boolean isPkg = item.getPackageRef() != null;
        return CartItemResponse.builder()
            .id(item.getId())
            .productId(isPkg ? null : (item.getProduct() != null ? item.getProduct().getId() : null))
            .productName(isPkg ? item.getPackageRef().getName() : (item.getProduct() != null ? item.getProduct().getName() : ""))
            .productImage(isPkg ? item.getPackageRef().getImageUrl() : (item.getProduct() != null ? item.getProduct().getImageUrl() : null))
            .quantity(item.getQuantity())
            .priceSnapshot(item.getPriceSnapshot())
            .subtotal(item.getPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())))
            .packageItem(isPkg)
            .packageId(isPkg ? item.getPackageRef().getId() : null)
            .packageSelectionsJson(item.getPackageSelectionsJson())
            .build();
    }).toList();

    BigDecimal total = items.stream()
            .map(CartItemResponse::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

    return CartResponse.builder()
            .id(cart.getId()).items(items).totalAmount(total)
            .createdAt(cart.getCreatedAt()).build();
    }
}
