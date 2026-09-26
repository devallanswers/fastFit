package com.fastfit.backend.repository;

import com.fastfit.backend.entity.CashTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CashTransactionRepository extends JpaRepository<CashTransaction, Long> {
    List<CashTransaction> findByRegisterIdOrderByCreatedAtDesc(Long registerId);
    List<CashTransaction> findByOrderId(Long orderId);
    void deleteByOrderId(Long orderId);
    boolean existsByOrderId(Long orderId);
}
