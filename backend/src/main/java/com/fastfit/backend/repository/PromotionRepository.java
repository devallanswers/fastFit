package com.fastfit.backend.repository;

import com.fastfit.backend.entity.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    long countByImageUrl(String imageUrl);

    @Query("SELECT p FROM Promotion p WHERE p.active = true ORDER BY p.displayOrder ASC, p.createdAt DESC")
    List<Promotion> findActiveOrdered();

    @Query("SELECT p FROM Promotion p ORDER BY p.displayOrder ASC, p.createdAt DESC")
    List<Promotion> findAllOrdered();
}
