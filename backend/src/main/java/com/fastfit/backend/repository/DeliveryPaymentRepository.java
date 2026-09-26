package com.fastfit.backend.repository;
import com.fastfit.backend.entity.DeliveryPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface DeliveryPaymentRepository extends JpaRepository<DeliveryPayment, Long> {
    List<DeliveryPayment> findAllByOrderByCreatedAtDesc();
    List<DeliveryPayment> findByDriverIdOrderByCreatedAtDesc(Long driverId);
}
