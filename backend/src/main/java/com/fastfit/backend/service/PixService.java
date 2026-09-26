package com.fastfit.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Gera o código Pix copia-e-cola (padrão EMV/BR Code) sem nenhuma API externa.
 * Compatível com qualquer banco/app de pagamento brasileiro.
 *
 * Chave configurada por PIX_KEY.
 */
@Service
public class PixService {

    @Value("${pix.key}")
    private String pixKey;
    private static final String PIX_NAME = "FastFit";         // nome do recebedor
    private static final String PIX_CITY = "Guarabira";       // cidade do recebedor

    /**
     * Gera o payload Pix copia-e-cola para um valor específico.
     *
     * @param orderId  ID do pedido (usado como txid para identificar o pagamento)
     * @param amount   valor a cobrar
     * @return string no formato EMV pronta para exibir ao cliente
     */
    public String generatePixCode(Long orderId, BigDecimal amount) {
        String txid = "FASTFIT" + orderId; // max 25 chars

        String merchantAccount = buildField("00", "BR.GOV.BCB.PIX")
            + buildField("01", pixKey);

        String payload =
            buildField("00", "01")                              // payload format indicator
            + buildField("26", merchantAccount)                 // merchant account info
            + buildField("52", "0000")                         // merchant category code
            + buildField("53", "986")                          // transaction currency (BRL)
            + buildField("54", formatAmount(amount))            // transaction amount
            + buildField("58", "BR")                           // country code
            + buildField("59", PIX_NAME)                       // merchant name
            + buildField("60", PIX_CITY)                       // merchant city
            + buildField("62", buildField("05", txid))         // additional data (txid)
            + "6304";                                           // CRC placeholder

        return payload + crc16(payload);
    }

    private String buildField(String id, String value) {
        String len = String.format("%02d", value.length());
        return id + len + value;
    }

    private String formatAmount(BigDecimal amount) {
        return String.format(Locale.ROOT, "%.2f", amount);
    }

    private String crc16(String payload) {
        int crc = 0xFFFF;
        for (byte b : payload.getBytes(StandardCharsets.US_ASCII)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) {
                if ((crc & 0x8000) != 0) crc = (crc << 1) ^ 0x1021;
                else crc <<= 1;
            }
        }
        return String.format("%04X", crc & 0xFFFF);
    }
}