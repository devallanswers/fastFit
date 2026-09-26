package com.fastfit.backend.dto.request;

import com.fastfit.backend.entity.Promotion;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

public class PromotionRequests {

    @Data
    public static class CreatePromotionRequest {
        @NotBlank String title;
        String subtitle;
        String imageUrl;
        String backgroundColor;
        String ctaLabel;
        Promotion.LinkType linkType;
        Long linkTargetId;
        String linkUrl;
        String activeDays; // "0,1,2,3,4,5,6" ou null = todos
        boolean active = true;
        Integer displayOrder;
    }

    @Data
    public static class UpdatePromotionRequest {
        String title;
        String subtitle;
        String imageUrl;
        String backgroundColor;
        String ctaLabel;
        Promotion.LinkType linkType;
        Long linkTargetId;
        String linkUrl;
        String activeDays;
        Boolean active;
        Integer displayOrder;
    }
}
