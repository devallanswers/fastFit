package com.fastfit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_transaction")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "register_id")
    private CashRegister register;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private String createdBy;

    @Column(nullable = false)
    private String type; // IN or OUT

    @Column(nullable = false)
    private BigDecimal amount;

    @Column
    private String category; // ex: VENDA, SAQUE, ABASTECIMENTO

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column
    private Long orderId; // opcional, se origem for pedido
}
