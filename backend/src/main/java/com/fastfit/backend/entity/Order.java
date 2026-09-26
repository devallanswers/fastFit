package com.fastfit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    // Dados do cliente sem login
    @Column(length = 150)
    private String guestName;

    @Column(length = 30)
    private String guestPhone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderType type;

    @Column
    private String deliveryAddress;

    @Column
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column
    private PaymentMethod paymentMethod;

    @Column
    private Integer changeAmount; // troco em reais (para dinheiro)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_driver_id")
    private DeliveryDriver deliveryDriver;

    @Column(precision = 10, scale = 2)
    private BigDecimal deliveryPayment;

    @Column(nullable = false)
    private LocalDateTime createdAt;
    // updatedAt é atualizado automaticamente via @PreUpdate
    @Column
    private LocalDateTime updatedAt;

    @Column
    private LocalDateTime scheduledTime;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public enum OrderStatus { RECEIVED, IN_PREPARATION, READY, FINISHED, DELIVERED_PAYMENT_DUE, CANCELED }
    public enum OrderType { DELIVERY, PICKUP, SCHEDULED }
    public enum PaymentMethod { PIX, CASH, DEBIT, CREDIT }
}
