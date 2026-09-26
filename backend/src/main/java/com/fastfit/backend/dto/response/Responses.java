package com.fastfit.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fastfit.backend.entity.*;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public class Responses {

    @Data @Builder
    public static class ApiResponse<T> {
        private boolean success;
        private T data;
        private String error;
        public static <T> ApiResponse<T> ok(T data) { return ApiResponse.<T>builder().success(true).data(data).build(); }
        public static <T> ApiResponse<T> error(String msg) { return ApiResponse.<T>builder().success(false).error(msg).build(); }
    }

    @Data @Builder
    public static class AuthResponse {
        private String token;
        private String tokenType;
        private UserResponse user;
    }

    @Data @Builder
    public static class UserResponse {
        private Long id;
        private String name;
        private String email;
        private String phone;
        private String role;
        private boolean emailVerified;
        private boolean active;
        private LocalDateTime createdAt;
        public static UserResponse from(User u) {
            return UserResponse.builder()
                .id(u.getId()).name(u.getName()).email(u.getEmail())
                .phone(u.getPhone()).role(u.getRole().name())
                .emailVerified(u.isEmailVerified()).active(u.isActive())
                .createdAt(u.getCreatedAt()).build();
        }
    }

    @Data @Builder
    public static class CategoryResponse {
        private Long id;
        private String name;
        private String description;
        private String imageUrl;
        private boolean active;
        private Integer displayOrder;
        private String slideType;
        private long productCount;
        public static CategoryResponse from(Category c) {
            long count = 0;
            try {
                // Só conta se a coleção já foi carregada (evita LazyInitializationException)
                if (c.getProducts() != null) {
                    count = c.getProducts().stream().filter(Product::isActive).count();
                }
            } catch (Exception ignored) { /* lazy not loaded — count stays 0 */ }
            return CategoryResponse.builder()
                .id(c.getId()).name(c.getName()).description(c.getDescription())
                .imageUrl(c.getImageUrl()).active(c.isActive()).displayOrder(c.getDisplayOrder())
                .productCount(count)
                .build();
        }
    }

    @Data @Builder
    public static class ProductResponse {
        private Long id;
        private String name;
        private String description;
        private String ingredients;
        private String differentials;
        private String weightVolume;
        private String conservation;
        private BigDecimal price;
        private BigDecimal promotionalPrice;
        private boolean promotionActive;
        private BigDecimal effectivePrice;
        private BigDecimal cost;
        private String imageUrl;
        private boolean active;
        private Integer displayOrder;
        private Integer stockQuantity;
        private CategoryResponse category;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private String scheduledDateTime;

        public static ProductResponse from(Product p) {
            return from(p, false);
        }

        public static ProductResponse from(Product p, boolean includeAdminFields) {
            return ProductResponse.builder()
                .id(p.getId()).name(p.getName()).description(p.getDescription())
                .ingredients(p.getIngredients()).differentials(p.getDifferentials())
                .weightVolume(p.getWeightVolume()).conservation(p.getConservation())
                .price(p.getPrice())
                .promotionalPrice(p.getPromotionalPrice())
                .promotionActive(p.isPromotionActive())
                .effectivePrice(p.getEffectivePrice())
                .cost(includeAdminFields ? p.getCost() : null)
                .imageUrl(p.getImageUrl()).active(p.isActive())
                .displayOrder(p.getDisplayOrder())
                .stockQuantity(p.getStockQuantity())
                .category(p.getCategory() != null ? CategoryResponse.from(p.getCategory()) : null)
                .createdAt(p.getCreatedAt()).updatedAt(p.getUpdatedAt()).build();
        }
    }

    @Data @Builder
    public static class CartItemResponse {
        private Long id;
        private Long productId;
        private String productName;
        private String productImage;
        private Integer quantity;
        private BigDecimal priceSnapshot;
        private BigDecimal subtotal;
        @com.fasterxml.jackson.annotation.JsonProperty("isPackage")
        private boolean packageItem;
        private Long packageId;
        private String packageSelectionsJson;
    }

    @Data @Builder
    public static class CartResponse {
        private Long id;
        private List<CartItemResponse> items;
        private BigDecimal totalAmount;
        private LocalDateTime createdAt;
    }

    @Data @Builder
    public static class OrderItemResponse {
        private Long id;
        private Long productId;
        private String productName;
        private String productImage;
        private Integer quantity;
        private BigDecimal price;
        private BigDecimal subtotal;
        private String packageName;
        private String packageSelectionsJson;
    }

    @Data @Builder
    public static class OrderResponse {
        private Long id;
        private Long userId;
        private String userName;
        private String userEmail;
        private String userPhone;
        private String status;
        private BigDecimal totalAmount;
        private String type;
        private String deliveryAddress;
        private String notes;
        private String paymentMethod;     // PIX, CASH, DEBIT, CREDIT
        private String paymentStatus;     // PENDING, PAID
        private String pixCode;           // código copia-e-cola (só pedidos Pix)
        private Integer changeAmount;     // troco (para pagamento em dinheiro)
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private String scheduledDateTime;
        private Long deliveryDriverId;
        private String deliveryDriverName;
        private BigDecimal deliveryPayment;
        private List<OrderItemResponse> items;
    }

    @Data @Builder
    public static class StoreSettingsResponse {
        private Long id;
        private boolean open;
        private LocalTime openingTime;
        private LocalTime closingTime;
        private String closedMessage;
        private String scheduleJson;
        private String storeName;
        private String storePhone;
        private String whatsappNumber;
        private String adminPhoneNumbers;
        private String deliveryNeighborhoods;
        private boolean acceptScheduled;
        private String scheduledStartTime;
        private String scheduledEndTime;
        private Integer scheduledMinDaysAhead;
        private Integer scheduledMinHoursAhead;
        private Integer scheduledMinMinutesAhead;
        private String instagramUrl;
        private String storeAddress;
        private String storeDescription;
        private String logoUrl;
        private Integer estimatedDeliveryMinutes;
        private boolean acceptDelivery;
        private boolean acceptPickup;
        private BigDecimal deliveryFee;

        @JsonProperty("isOpenNow")
        private boolean isOpenNow;   // calculado no backend
        
        private String currentStatus; // "OPEN" | "CLOSED" | "NO_SCHEDULE"
    }

    @Data @Builder
    public static class DeliveryDriverResponse {
        private Long id; private String name; private BigDecimal defaultPayment; private boolean active;
    }
    @Data @Builder
    public static class DeliveryExpenseResponse {
        private Long id; private LocalDateTime createdAt; private BigDecimal amount; private String category; private String notes;
    }
    @Data @Builder
    public static class DeliveryControlResponse {
        private List<OrderResponse> deliveries;
        private List<DeliveryDriverResponse> drivers;
        private List<DeliveryExpenseResponse> expenses;
        private BigDecimal totalDueToDrivers;
        private BigDecimal totalFuelExpense;
        private List<DeliveryDriverBalanceResponse> driverBalances;
        private List<DeliveryPaymentResponse> payments;
    }
    @Data @Builder
    public static class DeliveryDriverBalanceResponse {
        private Long driverId; private String driverName; private long deliveryCount;
        private BigDecimal earned; private BigDecimal paid; private BigDecimal balance;
    }
    @Data @Builder
    public static class DeliveryPaymentResponse {
        private Long id; private Long driverId; private String driverName; private BigDecimal amount; private String notes; private LocalDateTime createdAt;
    }

    @Data @Builder
    public static class DashboardResponse {
        private long totalOrders;
        private long todayOrders;
        private BigDecimal todayRevenue;
        private long activeOrders;
        private long totalUsers;
        private long activeProducts;
    }

    // Para relatórios mensais
    @Data @Builder
    public static class MonthlyReportResponse {
        private int year;
        private int month;
        private String monthName;
        private long totalOrders;
        private long canceledOrders;
        // Deliveries
        private long deliveryCount;
        private BigDecimal deliveryRevenue;
        private long pickupCount;
        // Financeiro
        private BigDecimal totalRevenue;
        private BigDecimal totalCost;
        private BigDecimal totalProfit;
        private List<ProductSalesResponse> topProducts;
    }

    @Data @Builder
    public static class ProductSalesResponse {
        private Long productId;
        private String productName;
        private Integer quantitySold;
        private BigDecimal revenue;
        private BigDecimal cost;
        private BigDecimal profit;
    }

    @lombok.Data @lombok.Builder @lombok.NoArgsConstructor @lombok.AllArgsConstructor
    public static class PackageSlotResponse {
        private Long id;
        private String name;
        private Integer quantity;
        private Integer displayOrder;
        private Long categoryId;
        private String categoryName;
        private java.util.List<ProductInSlotResponse> allowedProducts;
    }

    @lombok.Data @lombok.Builder @lombok.NoArgsConstructor @lombok.AllArgsConstructor
    public static class ProductInSlotResponse {
        private Long id;
        private String name;
        private String imageUrl;
        private java.math.BigDecimal price;
        private java.math.BigDecimal promotionalPrice;
        private boolean promotionActive;
    }

    @lombok.Data @lombok.Builder @lombok.NoArgsConstructor @lombok.AllArgsConstructor
    public static class PackageResponse {
        private Long id;
        private String name;
        private String description;
        private java.math.BigDecimal price;
        private String imageUrl;
        private boolean active;
        private Integer displayOrder;
        private java.util.List<PackageSlotResponse> slots;
    }





    @lombok.Data @lombok.Builder @lombok.NoArgsConstructor @lombok.AllArgsConstructor
    public static class PromotionResponse {
        private Long id;
        private String title;
        private String subtitle;
        private String imageUrl;
        private String backgroundColor;
        private String ctaLabel;
        private String linkType;
        private Long linkTargetId;
        private String linkUrl;
        private String activeDays;
        private boolean active;
        private Integer displayOrder;
        private String slideType;
    }

    @lombok.Data @lombok.Builder @lombok.NoArgsConstructor @lombok.AllArgsConstructor
    public static class PromotionGalleryImageResponse {
        private Long id;
        private String imageUrl;
        private String label;
        private boolean active;
        private Integer displayOrder;
    }

}
