package com.fastfit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_register")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashRegister {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime openedAt;

    @Column
    private LocalDateTime closedAt;

    @Column(nullable = false)
    private String openedBy; // username or id

    @Column
    private String closedBy;

    @Column(nullable = false)
    private BigDecimal initialBalance;

    @Column(nullable = false)
    private BigDecimal currentBalance;

    @Column(nullable = false)
    private boolean open;
}
