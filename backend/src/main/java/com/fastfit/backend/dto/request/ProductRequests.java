package com.fastfit.backend.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

public class ProductRequests {

    @Data
    public static class CreateProductRequest {
        @NotBlank String name;
        String description;
        String ingredients;
        String differentials;
        String weightVolume;
        String conservation;
        @NotNull @DecimalMin("0.01") BigDecimal price;
        BigDecimal promotionalPrice;
        Boolean promotionActive;
        BigDecimal cost;
        Long categoryId;
        Integer displayOrder;
        @Min(0) Integer stockQuantity;
    }

    @Data
    public static class UpdateProductRequest {
        String name;
        String description;
        String ingredients;
        String differentials;
        String weightVolume;
        String conservation;
        @DecimalMin("0.01") BigDecimal price;
        BigDecimal promotionalPrice;
        Boolean promotionActive;
        BigDecimal cost;
        Long categoryId;
        Boolean active;
        Integer displayOrder;
        @Min(0) Integer stockQuantity;
    }

    @Data
    public static class ReorderProductsRequest {
        @NotNull java.util.List<Long> orderedIds;
    }
}
