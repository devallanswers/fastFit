package com.fastfit.backend.controller;

import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.service.StoreSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/store-settings")
@RequiredArgsConstructor
public class StoreSettingsController {

    private final StoreSettingsService storeSettingsService;

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<StoreSettingsResponse>> getPublic() {
        return ResponseEntity.ok(ApiResponse.ok(storeSettingsService.getSettings()));
    }
}
