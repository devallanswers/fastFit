package com.fastfit.backend.controller;

import com.fastfit.backend.dto.request.PackageRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.service.FileStorageService;
import com.fastfit.backend.service.PackageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class PackageController {

    private final PackageService packageService;
    private final FileStorageService fileStorageService;

    // ── Public ────────────────────────────────────────────────────────────────
    @GetMapping("/api/packages")
    public ResponseEntity<ApiResponse<List<PackageResponse>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(packageService.getActivePackages()));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    @GetMapping("/api/admin/packages")
    public ResponseEntity<ApiResponse<List<PackageResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(packageService.getAllPackages()));
    }

    @PostMapping("/api/admin/packages")
    public ResponseEntity<ApiResponse<PackageResponse>> create(@Valid @RequestBody CreatePackageRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(packageService.create(req)));
    }

    @PutMapping("/api/admin/packages/{id}")
    public ResponseEntity<ApiResponse<PackageResponse>> update(@PathVariable Long id, @RequestBody UpdatePackageRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(packageService.update(id, req)));
    }

    @PostMapping("/api/admin/packages/{id}/image")
    public ResponseEntity<ApiResponse<String>> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        String imageUrl = fileStorageService.storeProductImage(file);
        packageService.updateImage(id, imageUrl);
        return ResponseEntity.ok(ApiResponse.ok(imageUrl));
    }

    @PatchMapping("/api/admin/packages/reorder")
    public ResponseEntity<ApiResponse<String>> reorder(@RequestBody java.util.Map<String, java.util.List<Long>> body) {
        packageService.reorder(body.get("orderedIds"));
        return ResponseEntity.ok(ApiResponse.ok("Ordem atualizada"));
    }

    @DeleteMapping("/api/admin/packages/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        packageService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}