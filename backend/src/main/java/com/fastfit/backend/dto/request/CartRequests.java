package com.fastfit.backend.dto.request;

import com.fastfit.backend.entity.Order;
import jakarta.validation.constraints.*;
import lombok.Data;

public class CartRequests {

    @Data
    public static class AddCartItemRequest {
        @NotNull Long productId;
        @NotNull @Min(1) Integer quantity;
    }

    @Data
    public static class UpdateCartItemRequest {
        @NotNull @Min(0) Integer quantity;
    }
}
