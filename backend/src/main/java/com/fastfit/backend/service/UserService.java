package com.fastfit.backend.service;

import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.User;
import com.fastfit.backend.exception.AppException;
import com.fastfit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserResponse getMe(User user) {
        return UserResponse.from(user);
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(UserResponse::from).toList();
    }

    @Transactional
    public UserResponse updateProfile(User user, String name, String phone) {
        if (name != null && !name.isBlank()) user.setName(name);
        if (phone != null && !phone.isBlank()) user.setPhone(phone);
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse toggleUserActive(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("Usuário não encontrado"));
        user.setActive(!user.isActive());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public void saveFcmToken(User user, String token) {
        if (token == null || token.isBlank()) return;
        user.setFcmToken(token);
        userRepository.save(user);
    }
}
