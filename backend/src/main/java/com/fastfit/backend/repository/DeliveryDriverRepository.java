package com.fastfit.backend.repository;
import com.fastfit.backend.entity.DeliveryDriver;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface DeliveryDriverRepository extends JpaRepository<DeliveryDriver, Long> {
    List<DeliveryDriver> findAllByOrderByNameAsc();
    List<DeliveryDriver> findByActiveTrueOrderByNameAsc();
}
