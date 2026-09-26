package com.fastfit.backend.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

public class PackageRequests {

    @Data
    public static class CreatePackageRequest {
        @NotBlank String name;
        String description;
        @NotNull BigDecimal price;
        boolean active = true;
        Integer displayOrder = 0;
        List<SlotRequest> slots;
    }

    @Data
    public static class UpdatePackageRequest {
        String name;
        String description;
        BigDecimal price;
        Boolean active;
        Integer displayOrder;
        List<SlotRequest> slots;
    }

    @Data
    public static class SlotRequest {
        Long id; // null = criar novo
        @NotBlank String name;
        @NotNull @Min(1) Integer quantity;
        Integer displayOrder;
        Long categoryId;             // null = sem filtro por categoria
        List<Long> allowedProductIds; // null/empty = sem filtro por produto
    }

    // Adicionado ao carrinho pelo cliente
    @Data
    public static class AddPackageToCartRequest {
        @NotNull Long packageId;
        @NotNull List<SlotSelection> selections;
    }

    @Data
    public static class SlotSelection {
        @NotNull Long slotId;
        @NotNull List<Long> productIds; // tamanho deve ser == slot.quantity
    }
}
