package com.fastfit.backend.controller;

import com.fastfit.backend.dto.response.Responses.ApiResponse;
import com.fastfit.backend.entity.CashRegister;
import com.fastfit.backend.entity.CashTransaction;
import com.fastfit.backend.service.CashRegisterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/admin/cash")
@RequiredArgsConstructor
public class AdminCashController {
    private final CashRegisterService cashService;

    /** Returns the open register, creating one automatically if none exists. */
    @GetMapping("/open")
    public ResponseEntity<ApiResponse<CashRegister>> getOpen() {
        return ResponseEntity.ok(ApiResponse.ok(cashService.getOrCreateOpenRegister()));
    }

    /** Legacy endpoint kept for compatibility — returns existing register if already open. */
    @PostMapping("/open")
    public ResponseEntity<ApiResponse<CashRegister>> open(@RequestParam String user, @RequestParam BigDecimal initial) {
        return ResponseEntity.ok(ApiResponse.ok(cashService.openRegister(user, initial)));
    }

    @PostMapping("/close")
    public ResponseEntity<ApiResponse<CashRegister>> close(@RequestParam Long id, @RequestParam String user) {
        return ResponseEntity.ok(ApiResponse.ok(cashService.closeRegister(id, user)));
    }

    @PostMapping("/tx")
    public ResponseEntity<ApiResponse<CashTransaction>> addTx(@RequestParam Long registerId,
                                                              @RequestParam String user,
                                                              @RequestParam String type,
                                                              @RequestParam BigDecimal amount,
                                                              @RequestParam(required = false) String category,
                                                              @RequestParam(required = false) String notes,
                                                              @RequestParam(required = false) Long orderId) {
        return ResponseEntity.ok(ApiResponse.ok(cashService.addTransaction(registerId, user, type, amount, category, notes, orderId)));
    }

    @GetMapping("/txs/{registerId}")
    public ResponseEntity<ApiResponse<List<CashTransaction>>> list(@PathVariable Long registerId) {
        return ResponseEntity.ok(ApiResponse.ok(cashService.listTransactions(registerId)));
    }
}
