package com.fastfit.backend.controller;

import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(productService.getActiveProducts()));
    }

    @GetMapping("")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(productService.getAllProducts()));
    }

    @GetMapping("/popular")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getPopular() {
        return ResponseEntity.ok(ApiResponse.ok(productService.getPopularProducts()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getById(id)));
    }
}
