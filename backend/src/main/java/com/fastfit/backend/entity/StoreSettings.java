package com.fastfit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalTime;

@Entity
@Table(name = "store_settings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StoreSettings {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Builder.Default
    @Column(nullable = false)
    private boolean open = false;

    @Column
    private LocalTime openingTime;

    @Column
    private LocalTime closingTime;

    @Column
    private String closedMessage;

    @Column(columnDefinition = "TEXT")
    private String scheduleJson;

    @Column
    private String storeName;

    @Column
    private String storePhone;

    @Column
    private String whatsappNumber;

    // Números de telefone dos administradores que devem receber notificações de novos pedidos
    // Armazenados como texto (separados por vírgula, ponto-e-vírgula ou nova linha)
    @Column(columnDefinition = "TEXT")
    private String adminPhoneNumbers;

    @Column
    private String instagramUrl;

    @Column
    private String storeAddress;

    @Column(columnDefinition = "TEXT")
    private String storeDescription;

    @Column
    private String logoUrl;

    @Builder.Default
    @Column(nullable = false)
    private Integer estimatedDeliveryMinutes = 45;

    @Builder.Default
    @Column(nullable = false)
    private boolean acceptDelivery = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean acceptPickup = true;

    @Builder.Default
    @Column(nullable = false)
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    // Encomenda agendada
    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean not null default false")
    private boolean acceptScheduled = false;

    @Column
    private String scheduledStartTime; // ex: "08:00"

    @Column
    private String scheduledEndTime;   // ex: "18:00"

    // Intervalo mínimo em dias (ex: 1 = só aceita com 1 dia de antecedência)
    @Builder.Default
    @Column(nullable = false, columnDefinition = "integer not null default 1")
    private Integer scheduledMinDaysAhead = 1;
    
    // Novo: prazo mínimo em horas (tem prioridade sobre days se definido)
    @Column
    private Integer scheduledMinHoursAhead;

    // Novo: prazo mínimo em minutos (maior prioridade se definido)
    @Column
    private Integer scheduledMinMinutesAhead;

    // Lista de bairros que recebem entrega, separados por vírgula
    // Ex: "Centro,Jardim América,Vila Nova"
    // Vazio = sem restrição
    @Column(columnDefinition = "TEXT")
    private String deliveryNeighborhoods;
}
