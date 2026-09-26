package com.fastfit.backend.service;

import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.User;
import com.fastfit.backend.exception.AppException;
import com.fastfit.backend.repository.UserRepository;
import com.fastfit.backend.security.JwtUtil;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FirebaseAuthService {

    private static final Logger log = LoggerFactory.getLogger(FirebaseAuthService.class);

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    /**
     * Valida o Firebase ID Token e retorna (ou cria) o usuário local.
     * Retorna o JWT do nosso próprio sistema.
     */
    @Transactional
    public AuthResponse loginWithFirebaseToken(String idToken) {
        // 1. Verificar token com Firebase
        FirebaseToken firebaseToken;
        try {
            firebaseToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
        } catch (FirebaseAuthException e) {
            log.warn("Token Firebase inválido: {}", e.getMessage());
            throw new AppException("Token de autenticação inválido");
        }

        String uid      = firebaseToken.getUid();
        String email    = firebaseToken.getEmail();
        String name     = firebaseToken.getName();
        String provider = extractProvider(firebaseToken);

        if (email == null || email.isBlank()) {
            throw new AppException("Email não encontrado na conta social");
        }

        // 2. Buscar usuário existente por UID ou email
        Optional<User> byUid   = userRepository.findByFirebaseUid(uid);
        Optional<User> byEmail = userRepository.findByEmail(email.toLowerCase());

        User user;

        if (byUid.isPresent()) {
            // Usuário já autenticado antes com Firebase
            user = byUid.get();

        } else if (byEmail.isPresent()) {
            // Usuário tem conta por email/senha — vincular ao Firebase UID
            user = byEmail.get();
            user.setFirebaseUid(uid);
            user.setAuthProvider(provider);
            user.setEmailVerified(true); // Google/Apple já verificam o email
            user = userRepository.save(user);

        } else {
            // Novo usuário — criar conta automaticamente
            user = User.builder()
                .name(name != null && !name.isBlank() ? name : email.split("@")[0])
                .email(email.toLowerCase())
                .password("") // sem senha — login só via Firebase
                .firebaseUid(uid)
                .authProvider(provider)
                .role(User.Role.USER)
                .active(true)
                .emailVerified(true) // Google/Apple já verificam
                .build();
            user = userRepository.save(user);
        }

        if (!user.isActive()) {
            throw new AppException("Conta desativada. Entre em contato com o suporte.");
        }

        // 3. Gerar nosso próprio JWT
        String token = jwtUtil.generateToken(user);
        return AuthResponse.builder()
            .token(token)
            .tokenType("Bearer")
            .user(UserResponse.from(user))
            .build();
    }

    private String extractProvider(FirebaseToken token) {
        // O campo sign_in_provider vem nos claims do token
        Object provider = token.getClaims().get("firebase");
        if (provider instanceof java.util.Map<?, ?> map) {
            Object signInProvider = map.get("sign_in_provider");
            if (signInProvider instanceof String s) return s;
        }
        return "google.com";
    }
}
