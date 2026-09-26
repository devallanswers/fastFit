package com.fastfit.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.from}")
    private String fromEmail;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Async
    public void sendVerificationEmail(String toEmail, String name, String token) {
        String verifyUrl = frontendUrl + "/verify-email?token=" + token;
        String html = buildVerificationEmail(name, verifyUrl);
        sendHtml(toEmail, "✅ Confirme seu email — FastFit", html);
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String name, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        String html = buildPasswordResetEmail(name, resetUrl);
        sendHtml(toEmail, "🔑 Redefinir senha — FastFit", html);
    }

    @Async
    public void sendOrderStatusEmail(String toEmail, String name, String orderId, String status) {
        String html = buildOrderStatusEmail(name, orderId, status);
        sendHtml(toEmail, "📦 Atualização do seu pedido #" + orderId + " — FastFit", html);
    }

    private void sendHtml(String to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("Email enviado para: {}", to);
        } catch (Exception e) {
            log.error("Erro ao enviar email para {}: {}", to, e.getMessage());
        }
    }

    private String buildVerificationEmail(String name, String url) {
        return """
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <div style="background:#2E7D5B;padding:20px 24px;border-radius:12px 12px 0 0;text-align:center">
                <h1 style="color:white;margin:0;font-size:24px">🥗 FastFit Store</h1>
              </div>
              <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
                <h2 style="color:#1F2937;margin-top:0">Olá, %s! 👋</h2>
                <p style="color:#6B7280;line-height:1.6">
                  Obrigado por se cadastrar no FastFit! Para ativar sua conta, clique no botão abaixo:
                </p>
                <div style="text-align:center;margin:32px 0">
                  <a href="%s" style="background:#2E7D5B;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">
                    Verificar Email
                  </a>
                </div>
                <p style="color:#9CA3AF;font-size:13px">
                  Este link expira em 24 horas. Se não foi você, ignore este email.
                </p>
              </div>
            </div>
            """.formatted(name, url);
    }

    private String buildPasswordResetEmail(String name, String url) {
        return """
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <div style="background:#2E7D5B;padding:20px 24px;border-radius:12px 12px 0 0;text-align:center">
                <h1 style="color:white;margin:0;font-size:24px">🥗 FastFit Store</h1>
              </div>
              <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
                <h2 style="color:#1F2937;margin-top:0">Olá, %s!</h2>
                <p style="color:#6B7280;line-height:1.6">
                  Recebemos uma solicitação para redefinir a senha da sua conta FastFit.
                </p>
                <div style="text-align:center;margin:32px 0">
                  <a href="%s" style="background:#2E7D5B;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">
                    Redefinir Senha
                  </a>
                </div>
                <p style="color:#9CA3AF;font-size:13px">
                  Este link expira em 1 hora. Se não foi você, ignore este email.
                </p>
              </div>
            </div>
            """.formatted(name, url);
    }

    private String buildOrderStatusEmail(String name, String orderId, String status) {
        return """
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <div style="background:#2E7D5B;padding:20px 24px;border-radius:12px 12px 0 0;text-align:center">
                <h1 style="color:white;margin:0;font-size:24px">🥗 FastFit Store</h1>
              </div>
              <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
                <h2 style="color:#1F2937;margin-top:0">Olá, %s! 📦</h2>
                <p style="color:#6B7280;line-height:1.6">
                  Seu pedido <strong>#%s</strong> teve o status atualizado para:
                </p>
                <div style="background:#E8F5EE;padding:16px;border-radius:10px;text-align:center;margin:24px 0">
                  <span style="color:#2E7D5B;font-size:20px;font-weight:700">%s</span>
                </div>
              </div>
            </div>
            """.formatted(name, orderId, status);
    }
}
