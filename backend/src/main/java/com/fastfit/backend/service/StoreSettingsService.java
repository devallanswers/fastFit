package com.fastfit.backend.service;

import com.fastfit.backend.dto.request.StoreSettingsRequest;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.StoreSettings;
import com.fastfit.backend.repository.StoreSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StoreSettingsService {

    private final StoreSettingsRepository storeSettingsRepository;
    private final StoreScheduleService scheduleService;

    public StoreSettingsResponse getSettings() {
        StoreSettings s = storeSettingsRepository.findFirstBy()
                .orElse(StoreSettings.builder().build());
        return mapSettings(s);
    }

    public StoreSettings getRaw() {
        return storeSettingsRepository.findFirstBy()
                .orElse(StoreSettings.builder().build());
    }

    @Transactional
    public StoreSettingsResponse updateSettings(StoreSettingsRequest req) {
        StoreSettings settings = storeSettingsRepository.findFirstBy()
                .orElse(StoreSettings.builder().build());

        if (req.getOpen() != null) settings.setOpen(req.getOpen());
        if (req.getOpeningTime() != null) settings.setOpeningTime(req.getOpeningTime());
        if (req.getClosingTime() != null) settings.setClosingTime(req.getClosingTime());
        if (req.getClosedMessage() != null) settings.setClosedMessage(req.getClosedMessage());
        if (req.getScheduleJson() != null) settings.setScheduleJson(
            req.getScheduleJson().isBlank() ? null : req.getScheduleJson());
        if (req.getStoreName() != null) settings.setStoreName(req.getStoreName());
        if (req.getStorePhone() != null) settings.setStorePhone(req.getStorePhone());
        if (req.getWhatsappNumber() != null) settings.setWhatsappNumber(req.getWhatsappNumber());
        if (req.getAdminPhoneNumbers() != null) settings.setAdminPhoneNumbers(req.getAdminPhoneNumbers());
        if (req.getInstagramUrl() != null) settings.setInstagramUrl(req.getInstagramUrl());
        if (req.getStoreAddress() != null) settings.setStoreAddress(req.getStoreAddress());
        if (req.getStoreDescription() != null) settings.setStoreDescription(req.getStoreDescription());
        if (req.getEstimatedDeliveryMinutes() != null) settings.setEstimatedDeliveryMinutes(req.getEstimatedDeliveryMinutes());
        if (req.getAcceptDelivery() != null) settings.setAcceptDelivery(req.getAcceptDelivery());
        if (req.getAcceptPickup() != null) settings.setAcceptPickup(req.getAcceptPickup());
        if (req.getDeliveryFee() != null) settings.setDeliveryFee(req.getDeliveryFee());
        if (req.getDeliveryNeighborhoods() != null) settings.setDeliveryNeighborhoods(req.getDeliveryNeighborhoods());
        if (req.getAcceptScheduled() != null) settings.setAcceptScheduled(req.getAcceptScheduled());
        if (req.getScheduledStartTime() != null) settings.setScheduledStartTime(req.getScheduledStartTime());
        if (req.getScheduledEndTime() != null) settings.setScheduledEndTime(req.getScheduledEndTime());
        if (req.getScheduledMinDaysAhead() != null) settings.setScheduledMinDaysAhead(req.getScheduledMinDaysAhead());
        if (req.getScheduledMinHoursAhead() != null) settings.setScheduledMinHoursAhead(req.getScheduledMinHoursAhead());
        if (req.getScheduledMinMinutesAhead() != null) settings.setScheduledMinMinutesAhead(req.getScheduledMinMinutesAhead());

        return mapSettings(storeSettingsRepository.save(settings));
    }

    public StoreSettingsResponse mapSettings(StoreSettings s) {
        var result = scheduleService.checkNow(s);
        return StoreSettingsResponse.builder()
                .id(s.getId()).open(s.isOpen())
                .openingTime(s.getOpeningTime()).closingTime(s.getClosingTime())
                .closedMessage(s.getClosedMessage())
                .scheduleJson(s.getScheduleJson())
                .storeName(s.getStoreName())
                .storePhone(s.getStorePhone())
                .whatsappNumber(s.getWhatsappNumber())
                .adminPhoneNumbers(s.getAdminPhoneNumbers())
                .instagramUrl(s.getInstagramUrl())
                .storeAddress(s.getStoreAddress())
                .storeDescription(s.getStoreDescription()).logoUrl(s.getLogoUrl())
                .estimatedDeliveryMinutes(s.getEstimatedDeliveryMinutes())
                .acceptDelivery(s.isAcceptDelivery()).acceptPickup(s.isAcceptPickup())
                .deliveryFee(s.getDeliveryFee())
                .deliveryNeighborhoods(s.getDeliveryNeighborhoods())
                .acceptScheduled(s.isAcceptScheduled())
                .scheduledStartTime(s.getScheduledStartTime())
                .scheduledEndTime(s.getScheduledEndTime())
                .scheduledMinDaysAhead(s.getScheduledMinDaysAhead())
                .scheduledMinHoursAhead(s.getScheduledMinHoursAhead())
                .scheduledMinMinutesAhead(s.getScheduledMinMinutesAhead())
                .isOpenNow(result.status() == StoreScheduleService.StoreStatus.OPEN)
                .currentStatus(result.status().name())
                .build();
    }
}
