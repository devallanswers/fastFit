package com.fastfit.backend.service;

import com.fastfit.backend.dto.request.WhatsAppRequests;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Serviço para envio de mensagens WhatsApp via Evolution API
 *
 * Configuração via variáveis de ambiente:
 * - EVOLUTION_API_URL: URL base da Evolution API (ex: http://localhost:3000)
 * - EVOLUTION_API_KEY: Chave de autenticação da Evolution API
 * - EVOLUTION_INSTANCE: Nome da instância WhatsApp (ex: fastfit)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsAppService {

    private final RestTemplate restTemplate;

    @Value("${evolution.api.enabled:false}")
    private boolean enabled;

    @Value("${evolution.api.url:}")
    private String evolutionUrl;

    @Value("${evolution.api.key:}")
    private String evolutionApiKey;

    @Value("${evolution.api.instance:fastfit}")
    private String evolutionInstance;

    /**
     * Envia uma mensagem de texto simples via WhatsApp
     *
     * @param phoneNumber Número do telefone no formato: 5585999999999 (DDI + DDD + número, sem caracteres especiais)
     * @param message     Texto da mensagem a ser enviada
     */
    public void sendText(String phoneNumber, String message) {
        // Validação de pré-condições
        if (!enabled) {
            log.debug("[WhatsApp] Serviço desabilitado. Mensagem não será enviada para: {}", phoneNumber);
            return;
        }

        String validationError = validateConfiguration(phoneNumber, message);
        if (validationError != null) {
            log.warn("[WhatsApp] {}", validationError);
            return;
        }

        // Formata e valida o número de telefone
        String formattedPhone = formatPhoneNumber(phoneNumber);
        if (formattedPhone == null) {
            log.warn("[WhatsApp] Número de telefone inválido: {}", phoneNumber);
            return;
        }

        // Monta a requisição
        WhatsAppRequests.SendTextRequest request = WhatsAppRequests.SendTextRequest.builder()
        .number(formattedPhone) // Formato esperado pela Evolution API
        .text(message)
        .build();

        try {
            sendWhatsAppMessage(request);
        } catch (Exception e) {
            log.error("[WhatsApp] Erro ao enviar mensagem para {}: {}", formattedPhone, e.getMessage(), e);
        }
    }

    /**
     * Valida as configurações necessárias para enviar mensagens
     *
     * @return null se válido, ou mensagem de erro
     */
    private String validateConfiguration(String phoneNumber, String message) {
        if (evolutionUrl == null || evolutionUrl.isBlank()) {
            return "Evolution API URL não configurada. Defina a variável EVOLUTION_API_URL";
        }
        if (evolutionApiKey == null || evolutionApiKey.isBlank()) {
            return "Evolution API Key não configurada. Defina a variável EVOLUTION_API_KEY";
        }
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return "Número de telefone não fornecido";
        }
        if (message == null || message.isBlank()) {
            return "Mensagem vazia";
        }
        return null;
    }

    /**
     * Formata o número de telefone removendo caracteres especiais
     * e garantindo o prefixo DDI 55 (Brasil)
     *
     * @param phoneNumber Número bruto do telefone
     * @return Número formatado ou null se inválido
     */
    private String formatPhoneNumber(String phoneNumber) {
        // Remove tudo que não é dígito
        String cleaned = phoneNumber.replaceAll("\\D", "");

        // Verifica comprimento mínimo (11 dígitos: DDD + número)
        if (cleaned.length() < 10) {
            return null;
        }

        // Se não começa com 55, adiciona
        if (!cleaned.startsWith("55")) {
            cleaned = "55" + cleaned;
        }

        // Garante que tem no máximo 15 dígitos (padrão E.164)
        if (cleaned.length() > 15) {
            return null;
        }

        return cleaned;
    }

    /**
     * Envia a mensagem via Evolution API
     */
    private void sendWhatsAppMessage(WhatsAppRequests.SendTextRequest request) {
        String url = buildEvolutionApiUrl();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json");
        headers.set("apikey", evolutionApiKey);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                new org.springframework.http.HttpEntity<>(request, headers),String.class);

                if (response.getStatusCode() == HttpStatus.OK || response.getStatusCode() == HttpStatus.CREATED) {
                    log.info("[WhatsApp] Mensagem enviada com sucesso para: {}. Resposta: {}",
                    request.getNumber(), response.getBody());
                } else {
                    log.warn("[WhatsApp] Resposta inesperada da Evolution API. Status: {}. Body: {}",
                    response.getStatusCode(), response.getBody());
                }

        } catch (HttpClientErrorException.BadRequest e) {
            log.error("[WhatsApp] Erro na requisição (400 Bad Request) para {}: {}",
                    request.getNumber(), e.getResponseBodyAsString());
        } catch (HttpClientErrorException.Unauthorized e) {
            log.error("[WhatsApp] Erro de autenticação (401) - Verifique EVOLUTION_API_KEY");
        } catch (HttpClientErrorException.NotFound e) {
            log.error("[WhatsApp] Erro (404) - Endpoint não encontrado. Verifique EVOLUTION_API_URL: {}",
                    evolutionUrl);
        } catch (HttpServerErrorException e) {
            log.error("[WhatsApp] Erro do servidor Evolution API ({}): {}",
                    e.getStatusCode(), e.getResponseBodyAsString());
        } catch (RestClientException e) {
            log.error("[WhatsApp] Erro de comunicação ao enviar para {}: {}",
                    request.getNumber(), e.getMessage());
        }
    }

    /**
     * Constrói a URL completa do endpoint da Evolution API
     */
    private String buildEvolutionApiUrl() {
    String baseUrl = evolutionUrl.replaceAll("/$", "");
    String url = baseUrl + "/message/sendText/" + evolutionInstance;
    log.info("[WhatsApp] URL construída: {} | enabled={} | apikey configurada={}", 
        url, enabled, !evolutionApiKey.isBlank());
    return url;
}

    /**
     * Retorna informações sobre a configuração do serviço WhatsApp
     * Útil para debugging
     */
    public String getConfigurationInfo() {
        return String.format(
                "[WhatsApp Configuration]\n" +
                "Enabled: %s\n" +
                "Evolution API URL: %s\n" +
                "Evolution Instance: %s\n" +
                "API Key Configured: %s",
                enabled,
                evolutionUrl,
                evolutionInstance,
                evolutionApiKey != null && !evolutionApiKey.isBlank()
        );
    }
}