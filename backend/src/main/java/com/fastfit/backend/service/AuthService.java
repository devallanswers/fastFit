package com.fastfit.backend.service;

import com.fastfit.backend.dto.request.AuthRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.User;
import com.fastfit.backend.exception.AppException;
import com.fastfit.backend.entity.EmailVerificationToken;
import com.fastfit.backend.entity.EmailVerificationToken.TokenType;
import com.fastfit.backend.repository.EmailVerificationTokenRepository;
import com.fastfit.backend.repository.UserRepository;
import com.fastfit.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationTokenRepository tokenRepository;
    private final EmailService emailService;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public UserResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new AppException("Email já cadastrado");
        }
        // Firebase é responsável pela verificação de email — conta já ativa aqui
        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(req.getPassword()))
                .phone(req.getPhone())
                .role(User.Role.USER)
                .active(true)
                .emailVerified(true)
                .build();
        return UserResponse.from(userRepository.save(user));
    }

    public AuthResponse login(LoginRequest req) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail().toLowerCase().trim(), req.getPassword())
            );
        } catch (DisabledException e) {
            throw new AppException("Conta desativada. Entre em contato com o suporte.");
        } catch (BadCredentialsException e) {
            throw new AppException("Email ou senha incorretos");
        }

        User user = userRepository.findByEmail(req.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new AppException("Usuário não encontrado"));

        String token = jwtUtil.generateToken(user);
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .user(UserResponse.from(user))
                .build();
    }

    @Transactional
    public void verifyEmail(String token) {
        // Verificação de email delegada ao Firebase — endpoint mantido por compatibilidade
    }

    @Transactional
    public void resendVerification(String email) {
        // Reenvio delegado ao Firebase — endpoint mantido por compatibilidade
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest req) {
        userRepository.findByEmail(req.getEmail().toLowerCase().trim()).ifPresent(user -> {
            tokenRepository.deleteByUserIdAndType(user.getId(), TokenType.PASSWORD_RESET);
            String token = UUID.randomUUID().toString();
            EmailVerificationToken resetToken = EmailVerificationToken.builder()
                    .token(token)
                    .user(user)
                    .type(TokenType.PASSWORD_RESET)
                    .expiresAt(LocalDateTime.now().plusHours(1))
                    .used(false)
                    .build();
            tokenRepository.save(resetToken);
            emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), token);
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        EmailVerificationToken resetToken = tokenRepository
                .findByTokenAndType(req.getToken(), TokenType.PASSWORD_RESET)
                .orElseThrow(() -> new AppException("Token inválido"));

        if (resetToken.isExpired() || resetToken.isUsed()) {
            throw new AppException("Token expirado ou já utilizado");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest req) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("Usuário não encontrado"));

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new AppException("Senha atual incorreta");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
    }


}
