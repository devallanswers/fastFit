package com.fastfit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_payments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DeliveryPayment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_driver_id", nullable = false)
    private DeliveryDriver driver;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;
    @Column(columnDefinition = "TEXT")
    private String notes;
    @Column(nullable = false)
    private LocalDateTime createdAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }
}
