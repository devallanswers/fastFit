package com.fastfit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "package_slots")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PackageSlot {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "package_id", nullable = false)
    private Package pkg;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer quantity;

    @Builder.Default
    @Column(nullable = false)
    private Integer displayOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    // Use @BatchSize to avoid N+1 AND avoid "multiple bags" error with JPQL JOIN FETCH
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "package_slot_products",
        joinColumns = @JoinColumn(name = "slot_id"),
        inverseJoinColumns = @JoinColumn(name = "product_id")
    )
    @BatchSize(size = 30)
    @Builder.Default
    private List<Product> allowedProducts = new ArrayList<>();
}
