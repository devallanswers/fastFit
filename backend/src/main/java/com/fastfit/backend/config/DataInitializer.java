package com.fastfit.backend.config;

import com.fastfit.backend.entity.StoreSettings;
import com.fastfit.backend.entity.User;
import com.fastfit.backend.repository.StoreSettingsRepository;
import com.fastfit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalTime;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    @Bean
    public CommandLineRunner init(
            UserRepository userRepository,
            StoreSettingsRepository storeSettingsRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            if (!userRepository.existsByEmail("admin@fastfit.com")) {
                User admin = User.builder()
                        .name("Administrador FastFit")
                        .email("admin@fastfit.com")
                        .password(passwordEncoder.encode("admin123"))
                        .phone("+5511999999999")
                        .role(User.Role.ADMIN)
                        .active(true)
                        .emailVerified(true)
                        .build();
                userRepository.save(admin);
                log.info("✅ Admin criado: admin@fastfit.com / senha: admin123");
            }

            if (storeSettingsRepository.findFirstBy().isEmpty()) {
                StoreSettings settings = StoreSettings.builder()
                        .open(true)
                        .openingTime(LocalTime.of(8, 0))
                        .closingTime(LocalTime.of(22, 0))
                        .closedMessage("Estamos fechados no momento. Volte em breve!")
                        .storeName("FastFit Store")
                        .estimatedDeliveryMinutes(45)
                        .acceptDelivery(true)
                        .acceptPickup(true)
                        .deliveryFee(java.math.BigDecimal.ZERO)
                        .build();
                storeSettingsRepository.save(settings);
                log.info("✅ Configurações da loja inicializadas");
            }
        };
    }
}
