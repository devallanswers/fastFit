package com.fastfit.backend.controller;

import com.fastfit.backend.dto.request.CategoryRequests.*;
import com.fastfit.backend.dto.request.OrderRequests.*;
import com.fastfit.backend.dto.request.ProductRequests.*;
import com.fastfit.backend.dto.request.StoreSettingsRequest;
import com.fastfit.backend.dto.request.DeliveryRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

// ─── Admin: Dashboard ────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
class AdminDashboardController {
    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getDashboard()));
    }

    @GetMapping("/report")
    public ResponseEntity<ApiResponse<MonthlyReportResponse>> getMonthlyReport(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getMonthlyReport(year, month)));
    }
}

// ─── Admin: Products ─────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
class AdminProductController {
    private final ProductService productService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(productService.getAllProducts()));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductResponse>> create(
            @RequestPart("data") @Valid CreateProductRequest req,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        return ResponseEntity.ok(ApiResponse.ok(productService.create(req, image)));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductResponse>> update(
            @PathVariable Long id,
            @RequestPart("data") @Valid UpdateProductRequest req,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        return ResponseEntity.ok(ApiResponse.ok(productService.update(id, req, image)));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<ApiResponse<String>> reorder(@RequestBody ReorderProductsRequest req) {
        productService.reorder(req);
        return ResponseEntity.ok(ApiResponse.ok("Ordem atualizada"));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<ProductResponse>> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(productService.toggleActive(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Produto removido"));
    }
}

// ─── Admin: Categories ───────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
class AdminCategoryController {
    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.getAllCategories()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponse>> create(@Valid @RequestBody CreateCategoryRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.create(req)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateCategoryRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.update(id, req)));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<ApiResponse<String>> reorder(@RequestBody java.util.Map<String, java.util.List<Long>> body) {
        categoryService.reorder(body.get("orderedIds"));
        return ResponseEntity.ok(ApiResponse.ok("Ordem atualizada"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Categoria removida"));
    }
}

// ─── Admin: Orders ───────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
class AdminOrderController {
    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getAllOrders()));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getActiveOrders()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateStatus(
            @PathVariable Long id, @Valid @RequestBody UpdateOrderStatusRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.updateStatus(id, req)));
    }
}

// ─── Admin: Users ────────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
class AdminUserController {
    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsers()));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<UserResponse>> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.toggleUserActive(id)));
    }
}

// ─── Admin: Store Settings ───────────────────────────────────────────────────

@RestController
@RequestMapping("/api/admin/store-settings")
@RequiredArgsConstructor
class AdminStoreSettingsController {
    private final StoreSettingsService storeSettingsService;

    @GetMapping
    public ResponseEntity<ApiResponse<StoreSettingsResponse>> get() {
        return ResponseEntity.ok(ApiResponse.ok(storeSettingsService.getSettings()));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<StoreSettingsResponse>> update(@RequestBody StoreSettingsRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(storeSettingsService.updateSettings(req)));
    }
}

@RestController
@RequestMapping("/api/admin/deliveries")
@RequiredArgsConstructor
class AdminDeliveryController {
    private final DeliveryControlService deliveryControlService;
    @GetMapping public ResponseEntity<ApiResponse<DeliveryControlResponse>> control() { return ResponseEntity.ok(ApiResponse.ok(deliveryControlService.control())); }
    @GetMapping("/drivers") public ResponseEntity<ApiResponse<List<DeliveryDriverResponse>>> drivers() { return ResponseEntity.ok(ApiResponse.ok(deliveryControlService.drivers())); }
    @PostMapping("/drivers") public ResponseEntity<ApiResponse<DeliveryDriverResponse>> createDriver(@Valid @RequestBody DriverRequest req) { return ResponseEntity.ok(ApiResponse.ok(deliveryControlService.createDriver(req))); }
    @PutMapping("/drivers/{id}") public ResponseEntity<ApiResponse<DeliveryDriverResponse>> updateDriver(@PathVariable Long id, @Valid @RequestBody DriverRequest req) { return ResponseEntity.ok(ApiResponse.ok(deliveryControlService.updateDriver(id, req))); }
    @DeleteMapping("/drivers/{id}") public ResponseEntity<ApiResponse<String>> deleteDriver(@PathVariable Long id) { deliveryControlService.removeDriver(id); return ResponseEntity.ok(ApiResponse.ok("Entregador removido")); }
    @PatchMapping("/orders/{id}/driver") public ResponseEntity<ApiResponse<OrderResponse>> assign(@PathVariable Long id, @Valid @RequestBody AssignDriverRequest req) { return ResponseEntity.ok(ApiResponse.ok(deliveryControlService.assign(id, req))); }
    @PostMapping("/expenses") public ResponseEntity<ApiResponse<DeliveryExpenseResponse>> addExpense(@Valid @RequestBody ExpenseRequest req) { return ResponseEntity.ok(ApiResponse.ok(deliveryControlService.addExpense(req))); }
    @PostMapping("/payments") public ResponseEntity<ApiResponse<DeliveryPaymentResponse>> pay(@Valid @RequestBody PaymentRequest req) { return ResponseEntity.ok(ApiResponse.ok(deliveryControlService.pay(req))); }
    @DeleteMapping("/expenses/{id}") public ResponseEntity<ApiResponse<String>> deleteExpense(@PathVariable Long id) { deliveryControlService.removeExpense(id); return ResponseEntity.ok(ApiResponse.ok("Despesa removida")); }
}
