package com.fastfit.backend.controller;

import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.getActiveCategories()));
    }
}
