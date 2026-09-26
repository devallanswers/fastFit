package com.fastfit.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fastfit.backend.entity.StoreSettings;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

/**
 * Serviço responsável por calcular se a loja está aberta
 * com base no scheduleJson (horários por dia da semana).
 *
 * Formato do JSON:
 * [
 *   { "day": "MONDAY",    "active": true,  "open": "08:00", "close": "22:00" },
 *   { "day": "TUESDAY",   "active": true,  "open": "08:00", "close": "22:00" },
 *   { "day": "WEDNESDAY", "active": true,  "open": "08:00", "close": "22:00" },
 *   { "day": "THURSDAY",  "active": true,  "open": "08:00", "close": "22:00" },
 *   { "day": "FRIDAY",    "active": true,  "open": "08:00", "close": "22:00" },
 *   { "day": "SATURDAY",  "active": true,  "open": "09:00", "close": "20:00" },
 *   { "day": "SUNDAY",    "active": false, "open": "09:00", "close": "14:00" }
 * ]
 */
@Service
@Slf4j
public class StoreScheduleService {

    private static final ObjectMapper mapper = new ObjectMapper();

    public enum StoreStatus { OPEN, CLOSED, NO_SCHEDULE }

    public record ScheduleResult(StoreStatus status, String message) {}

    /**
     * Verifica se a loja está aberta agora, considerando:
     * 1. Flag global settings.open (se false, sempre fechada)
     * 2. scheduleJson (se existir, usa os horários por dia)
     * 3. openingTime/closingTime globais (fallback legado)
     */
    public ScheduleResult checkNow(StoreSettings settings) {
        if (!settings.isOpen()) {
            String msg = settings.getClosedMessage() != null
                ? settings.getClosedMessage()
                : "Loja fechada no momento.";
            return new ScheduleResult(StoreStatus.CLOSED, msg);
        }

        String scheduleJson = settings.getScheduleJson();
        if (scheduleJson != null && !scheduleJson.isBlank()) {
            return checkSchedule(scheduleJson, settings.getClosedMessage());
        }

        // Fallback: horário global
        if (settings.getOpeningTime() != null && settings.getClosingTime() != null) {
            LocalTime now = ZonedDateTime.now(ZoneId.of("America/Sao_Paulo")).toLocalTime();
            if (now.isBefore(settings.getOpeningTime()) || now.isAfter(settings.getClosingTime())) {
                return new ScheduleResult(StoreStatus.CLOSED,
                    "Fora do horário: " + settings.getOpeningTime() + " às " + settings.getClosingTime());
            }
        }

        return new ScheduleResult(StoreStatus.OPEN, "Aberto");
    }

    private ScheduleResult checkSchedule(String json, String closedMessage) {
        try {
            List<Map<String, Object>> schedule = mapper.readValue(json,
                new TypeReference<>() {});

            // Fix: usar ZoneId explícito e consistente para dia E hora
            // Antes: getDayOfWeek() usava ZonedDateTime (com fuso) mas LocalTime.now()
            // usava o relógio do sistema sem fuso — podiam divergir em servidores UTC
            ZoneId zone = ZoneId.of("America/Sao_Paulo");
            ZonedDateTime nowZoned = ZonedDateTime.now(zone);
            DayOfWeek today = nowZoned.getDayOfWeek();
            LocalTime now = nowZoned.toLocalTime();

            for (Map<String, Object> entry : schedule) {
                String day = (String) entry.get("day");
                if (!today.name().equals(day)) continue;

                Boolean active = (Boolean) entry.get("active");
                if (active == null || !active) {
                    String msg = closedMessage != null ? closedMessage
                        : "Não funcionamos às " + dayName(today) + ".";
                    return new ScheduleResult(StoreStatus.CLOSED, msg);
                }

                String openStr  = (String) entry.get("open");
                String closeStr = (String) entry.get("close");
                if (openStr == null || closeStr == null) {
                    return new ScheduleResult(StoreStatus.OPEN, "Aberto");
                }

                LocalTime openTime  = LocalTime.parse(openStr);
                LocalTime closeTime = LocalTime.parse(closeStr);

                if (now.isBefore(openTime)) {
                    return new ScheduleResult(StoreStatus.CLOSED,
                        "Ainda não abrimos hoje. Abrimos às " + openStr + ".");
                }
                if (now.isAfter(closeTime)) {
                    return new ScheduleResult(StoreStatus.CLOSED,
                        "Já encerramos hoje. Voltamos " + nextOpenDay(schedule, today) + ".");
                }

                return new ScheduleResult(StoreStatus.OPEN,
                    "Aberto até " + closeStr);
            }

            // Dia não encontrado no schedule
            String msg = closedMessage != null ? closedMessage : "Não funcionamos hoje.";
            return new ScheduleResult(StoreStatus.CLOSED, msg);

        } catch (Exception e) {
            log.warn("Erro ao parsear scheduleJson: {}", e.getMessage());
            return new ScheduleResult(StoreStatus.NO_SCHEDULE, "Aberto");
        }
    }

    private String nextOpenDay(List<Map<String, Object>> schedule, DayOfWeek today) {
        for (int i = 1; i <= 7; i++) {
            DayOfWeek next = today.plus(i);
            for (Map<String, Object> entry : schedule) {
                if (next.name().equals(entry.get("day"))) {
                    Boolean active = (Boolean) entry.get("active");
                    if (Boolean.TRUE.equals(active)) {
                        String openStr = (String) entry.get("open");
                        return "amanhã" + (i == 1 ? "" : " (" + dayName(next) + ")")
                            + (openStr != null ? " às " + openStr : "");
                    }
                }
            }
        }
        return "em breve";
    }

    private String dayName(DayOfWeek day) {
        return switch (day) {
            case MONDAY    -> "segunda-feira";
            case TUESDAY   -> "terça-feira";
            case WEDNESDAY -> "quarta-feira";
            case THURSDAY  -> "quinta-feira";
            case FRIDAY    -> "sexta-feira";
            case SATURDAY  -> "sábado";
            case SUNDAY    -> "domingo";
        };
    }
}