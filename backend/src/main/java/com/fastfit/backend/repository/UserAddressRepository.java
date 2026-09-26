package com.fastfit.backend.repository;

import com.fastfit.backend.entity.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserAddressRepository extends JpaRepository<UserAddress, Long> {
    List<UserAddress> findByUserIdOrderByIsDefaultDescIdAsc(Long userId);
    long countByUserId(Long userId);
}
