package com.fastfit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "delivery_drivers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DeliveryDriver {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(precision = 10, scale = 2)
    private BigDecimal defaultPayment;
    @Builder.Default @Column(nullable = false)
    private boolean active = true;
}
