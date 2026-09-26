package com.fastfit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Promoção exibida no banner da Home.
 * O admin escolhe imagem, texto, link e dias da semana em que aparece.
 */
@Entity
@Table(name = "promotions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Promotion {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column
    private String subtitle;

    @Column
    private String imageUrl;

    /** Cor de fundo do slide (hex ou gradiente CSS). Padrão: verde da marca */
    @Column
    private String backgroundColor;

    /** Texto do botão de ação */
    @Column
    private String ctaLabel;

    // ── Link de destino ──────────────────────────────────────────────────────
    /** Tipo do link: PRODUCT, PACKAGE, URL */
    @Enumerated(EnumType.STRING)
    @Column
    private LinkType linkType;

    /** ID do produto ou pacote vinculado */
    @Column
    private Long linkTargetId;

    /** URL externa opcional */
    @Column
    private String linkUrl;

    // ── Agendamento ──────────────────────────────────────────────────────────
    /**
     * Dias da semana separados por vírgula (0=DOM, 1=SEG, ... 6=SAB).
     * Vazio/null = todos os dias.
     * Ex: "1,2,3,4,5" = seg a sex
     */
    @Column
    private String activeDays;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Builder.Default
    @Column(nullable = false)
    private Integer displayOrder = 0;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public enum LinkType { PRODUCT, PACKAGE, URL, NONE }
}
