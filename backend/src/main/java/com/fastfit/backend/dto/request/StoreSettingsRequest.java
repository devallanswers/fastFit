package com.fastfit.backend.dto.request;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalTime;

@Data
public class StoreSettingsRequest {
    private Boolean open;
    private LocalTime openingTime;
    private LocalTime closingTime;
    private String closedMessage;
    private String scheduleJson;   // JSON com horários por dia da semana
    private String storeName;
    private String storePhone;
    private String whatsappNumber;
    private String adminPhoneNumbers; // lista separada por vírgula/; / nova linha
    private String instagramUrl;
    private String storeAddress;
    private String storeDescription;
    private Integer estimatedDeliveryMinutes;
    private Boolean acceptDelivery;
    private Boolean acceptPickup;
    private BigDecimal deliveryFee;

    private String deliveryNeighborhoods;

    private Boolean acceptScheduled;
    private String scheduledStartTime;
    private String scheduledEndTime;
    private Integer scheduledMinDaysAhead;
    private Integer scheduledMinHoursAhead;
    private Integer scheduledMinMinutesAhead;
}
