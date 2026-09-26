package com.fastfit.backend.repository;
import com.fastfit.backend.entity.DeliveryExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface DeliveryExpenseRepository extends JpaRepository<DeliveryExpense, Long> {
    List<DeliveryExpense> findAllByOrderByCreatedAtDesc();
}
