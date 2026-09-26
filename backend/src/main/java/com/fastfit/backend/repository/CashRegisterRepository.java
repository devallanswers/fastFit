package com.fastfit.backend.repository;

import com.fastfit.backend.entity.CashRegister;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CashRegisterRepository extends JpaRepository<CashRegister, Long> {
    Optional<CashRegister> findFirstByOpenTrue();
}
