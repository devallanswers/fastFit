package com.fastfit.backend.repository;

import com.fastfit.backend.entity.EmailVerificationToken;
import com.fastfit.backend.entity.EmailVerificationToken.TokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    Optional<EmailVerificationToken> findByTokenAndType(String token, TokenType type);

    @Modifying @Transactional
    @Query("DELETE FROM EmailVerificationToken t WHERE t.user.id = :userId AND t.type = :type")
    void deleteByUserIdAndType(Long userId, TokenType type);
}
