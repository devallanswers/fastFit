package com.fastfit.backend.controller;

import com.fastfit.backend.dto.request.PromotionRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.service.PromotionService;
import com.fastfit.backend.service.FileStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class PromotionController {

    private final PromotionService promotionService;
    private final FileStorageService fileStorageService;

    // ── Public ────────────────────────────────────────────────────────────────
    @GetMapping("/api/promotions/today")
    public ResponseEntity<ApiResponse<List<PromotionResponse>>> getToday() {
        return ResponseEntity.ok(ApiResponse.ok(promotionService.getActiveForToday()));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    @GetMapping("/api/admin/promotions")
    public ResponseEntity<ApiResponse<List<PromotionResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(promotionService.getAll()));
    }

    @GetMapping("/api/admin/promotions/gallery")
    public ResponseEntity<ApiResponse<List<PromotionGalleryImageResponse>>> getGallery() {
        return ResponseEntity.ok(ApiResponse.ok(promotionService.getGallery()));
    }

    @PostMapping("/api/admin/promotions/gallery")
    public ResponseEntity<ApiResponse<PromotionGalleryImageResponse>> uploadGalleryImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "label", required = false) String label) throws IOException {
        String url = fileStorageService.storePromotionImage(file);
        return ResponseEntity.ok(ApiResponse.ok(promotionService.addGalleryImage(url, label)));
    }

    @DeleteMapping("/api/admin/promotions/gallery/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteGalleryImage(@PathVariable Long id) {
        promotionService.deleteGalleryImage(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PatchMapping("/api/admin/promotions/gallery/{id}")
    public ResponseEntity<ApiResponse<PromotionGalleryImageResponse>> updateGalleryImage(
            @PathVariable Long id, @RequestBody java.util.Map<String, Object> body) {
        Boolean active = body.containsKey("active") ? (Boolean) body.get("active") : null;
        Integer displayOrder = body.containsKey("displayOrder") ? ((Number) body.get("displayOrder")).intValue() : null;
        return ResponseEntity.ok(ApiResponse.ok(promotionService.updateGalleryImage(id, active, displayOrder)));
    }

    @PostMapping("/api/admin/promotions")
    public ResponseEntity<ApiResponse<PromotionResponse>> create(
            @Valid @RequestBody CreatePromotionRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(promotionService.create(req)));
    }

    @PutMapping("/api/admin/promotions/{id}")
    public ResponseEntity<ApiResponse<PromotionResponse>> update(
            @PathVariable Long id,
            @RequestBody UpdatePromotionRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(promotionService.update(id, req)));
    }

    @PostMapping("/api/admin/promotions/{id}/image")
    public ResponseEntity<ApiResponse<String>> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        String url = fileStorageService.storeProductImage(file);
        promotionService.updateImage(id, url);
        return ResponseEntity.ok(ApiResponse.ok(url));
    }

    @DeleteMapping("/api/admin/promotions/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        promotionService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
