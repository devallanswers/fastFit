package com.fastfit.backend.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

public class CategoryRequests {

    @Data
    public static class CreateCategoryRequest {
        @NotBlank String name;
        String description;
        Integer displayOrder;
    }

    @Data
    public static class UpdateCategoryRequest {
        String name;
        String description;
        Boolean active;
        Integer displayOrder;
    }
}
