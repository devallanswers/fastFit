package com.fastfit.backend.repository;

import com.fastfit.backend.entity.Package;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface PackageRepository extends JpaRepository<Package, Long> {

    // Fetch slots + category in one query; allowedProducts loaded via @BatchSize
    @Query("SELECT DISTINCT p FROM Package p LEFT JOIN FETCH p.slots s LEFT JOIN FETCH s.category WHERE p.active = true ORDER BY p.displayOrder ASC")
    List<Package> findActiveWithSlots();

    @Query("SELECT DISTINCT p FROM Package p LEFT JOIN FETCH p.slots s LEFT JOIN FETCH s.category ORDER BY p.displayOrder ASC")
    List<Package> findAllWithSlots();
}
