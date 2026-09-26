package com.fastfit.backend.repository;

import com.fastfit.backend.entity.PromotionGalleryImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PromotionGalleryImageRepository extends JpaRepository<PromotionGalleryImage, Long> {
    List<PromotionGalleryImage> findAllByOrderByCreatedAtDesc();
    List<PromotionGalleryImage> findByActiveTrueOrderByDisplayOrderAscCreatedAtDesc();
}
