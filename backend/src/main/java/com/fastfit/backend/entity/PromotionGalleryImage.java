package com.fastfit.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Imagem reutilizável que o administrador pode selecionar nos banners. */
@Entity
@Table(name = "promotion_gallery_images")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PromotionGalleryImage {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String imageUrl;

    @Column(nullable = false)
    private String label;

    @Builder.Default @Column(nullable = false)
    private boolean active = true;

    @Builder.Default @Column(nullable = false)
    private Integer displayOrder = 0;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
