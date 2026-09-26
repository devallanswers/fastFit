package com.fastfit.backend.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

public class DeliveryRequests {
    @Data public static class DriverRequest {
        @NotBlank private String name;
        @DecimalMin("0.00") private BigDecimal defaultPayment;
        private Boolean active;
    }
    @Data public static class AssignDriverRequest {
        @NotNull private Long driverId;
        @DecimalMin("0.00") private BigDecimal payment;
    }
    @Data public static class ExpenseRequest {
        @NotNull @DecimalMin("0.01") private BigDecimal amount;
        @NotBlank private String category;
        private String notes;
    }
    @Data public static class PaymentRequest {
        @NotNull private Long driverId;
        @NotNull @DecimalMin("0.01") private BigDecimal amount;
        private String notes;
    }
}
