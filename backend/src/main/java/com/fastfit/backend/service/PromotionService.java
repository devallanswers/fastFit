package com.fastfit.backend.service;

import com.fastfit.backend.dto.request.PromotionRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.Promotion;
import com.fastfit.backend.entity.PromotionGalleryImage;
import com.fastfit.backend.exception.AppException;
import com.fastfit.backend.repository.PromotionRepository;
import com.fastfit.backend.repository.PromotionGalleryImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final PromotionGalleryImageRepository galleryImageRepository;
    private final FileStorageService fileStorageService;

    /**
     * Retorna promoções ativas e válidas para o dia atual.
     * 0=DOM, 1=SEG, 2=TER, 3=QUA, 4=QUI, 5=SEX, 6=SAB
     */
    @Transactional(readOnly = true)
    public List<PromotionResponse> getActiveForToday() {
        int todayIdx = LocalDate.now().getDayOfWeek().getValue() % 7; // 0=DOM, 1=SEG...
        List<PromotionResponse> promotionSlides = promotionRepository.findActiveOrdered().stream()
                .filter(p -> isActiveToday(p, todayIdx))
                .map(this::map)
                .toList();
        List<PromotionResponse> imageSlides = galleryImageRepository.findByActiveTrueOrderByDisplayOrderAscCreatedAtDesc().stream()
                .map(this::mapImageSlide).toList();
        return java.util.stream.Stream.concat(promotionSlides.stream(), imageSlides.stream())
                .sorted(java.util.Comparator.comparing(PromotionResponse::getDisplayOrder, java.util.Comparator.nullsLast(Integer::compareTo)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PromotionResponse> getAll() {
        return promotionRepository.findAllOrdered().stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public List<PromotionGalleryImageResponse> getGallery() {
        return galleryImageRepository.findAllByOrderByCreatedAtDesc().stream().map(this::mapGallery).toList();
    }

    @Transactional
    public PromotionGalleryImageResponse addGalleryImage(String imageUrl, String label) {
        PromotionGalleryImage image = PromotionGalleryImage.builder()
                .imageUrl(imageUrl)
                .label(label == null || label.isBlank() ? "Imagem da galeria" : label.trim())
                .build();
        return mapGallery(galleryImageRepository.save(image));
    }

    @Transactional
    public void deleteGalleryImage(Long id) {
        PromotionGalleryImage image = galleryImageRepository.findById(id)
                .orElseThrow(() -> new AppException("Imagem não encontrada"));
        if (promotionRepository.countByImageUrl(image.getImageUrl()) > 0) {
            throw new AppException("Esta imagem está sendo usada em uma promoção. Troque-a antes de removê-la.");
        }
        galleryImageRepository.delete(image);
        fileStorageService.deleteFile(image.getImageUrl());
    }

    @Transactional
    public PromotionGalleryImageResponse updateGalleryImage(Long id, Boolean active, Integer displayOrder) {
        PromotionGalleryImage image = galleryImageRepository.findById(id)
                .orElseThrow(() -> new AppException("Imagem não encontrada"));
        if (active != null) image.setActive(active);
        if (displayOrder != null) image.setDisplayOrder(displayOrder);
        return mapGallery(galleryImageRepository.save(image));
    }

    @Transactional
    public PromotionResponse create(CreatePromotionRequest req) {
        Promotion p = Promotion.builder()
                .title(req.getTitle())
                .subtitle(req.getSubtitle())
                .imageUrl(req.getImageUrl())
                .backgroundColor(req.getBackgroundColor())
                .ctaLabel(req.getCtaLabel())
                .linkType(req.getLinkType() != null ? req.getLinkType() : Promotion.LinkType.NONE)
                .linkTargetId(req.getLinkTargetId())
                .linkUrl(req.getLinkUrl())
                .activeDays(req.getActiveDays())
                .active(req.isActive())
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 0)
                .build();
        return map(promotionRepository.save(p));
    }

    @Transactional
    public PromotionResponse update(Long id, UpdatePromotionRequest req) {
        Promotion p = promotionRepository.findById(id)
                .orElseThrow(() -> new AppException("Promoção não encontrada"));
        if (req.getTitle() != null) p.setTitle(req.getTitle());
        if (req.getSubtitle() != null) p.setSubtitle(req.getSubtitle());
        if (req.getImageUrl() != null) p.setImageUrl(req.getImageUrl());
        if (req.getBackgroundColor() != null) p.setBackgroundColor(req.getBackgroundColor());
        if (req.getCtaLabel() != null) p.setCtaLabel(req.getCtaLabel());
        if (req.getLinkType() != null) p.setLinkType(req.getLinkType());
        if (req.getLinkTargetId() != null) p.setLinkTargetId(req.getLinkTargetId());
        if (req.getLinkUrl() != null) p.setLinkUrl(req.getLinkUrl());
        p.setActiveDays(req.getActiveDays());  // null = todos os dias (sempre atualiza)
        if (req.getActive() != null) p.setActive(req.getActive());
        if (req.getDisplayOrder() != null) p.setDisplayOrder(req.getDisplayOrder());
        return map(promotionRepository.save(p));
    }

    @Transactional
    public void updateImage(Long id, String imageUrl) {
        Promotion p = promotionRepository.findById(id)
                .orElseThrow(() -> new AppException("Promoção não encontrada"));
        p.setImageUrl(imageUrl);
        promotionRepository.save(p);
    }

    @Transactional
    public void delete(Long id) {
        if (!promotionRepository.existsById(id)) throw new AppException("Promoção não encontrada");
        promotionRepository.deleteById(id);
    }

    private boolean isActiveToday(Promotion p, int todayIdx) {
        if (p.getActiveDays() == null || p.getActiveDays().isBlank()) return true; // todos os dias
        return Arrays.stream(p.getActiveDays().split(","))
                .map(String::trim).filter(s -> !s.isEmpty())
                .anyMatch(d -> d.equals(String.valueOf(todayIdx)));
    }

    private PromotionResponse map(Promotion p) {
        return PromotionResponse.builder()
                .id(p.getId())
                .title(p.getTitle())
                .subtitle(p.getSubtitle())
                .imageUrl(p.getImageUrl())
                .backgroundColor(p.getBackgroundColor())
                .ctaLabel(p.getCtaLabel())
                .linkType(p.getLinkType() != null ? p.getLinkType().name() : "NONE")
                .linkTargetId(p.getLinkTargetId())
                .linkUrl(p.getLinkUrl())
                .activeDays(p.getActiveDays())
                .active(p.isActive())
                .displayOrder(p.getDisplayOrder())
                .slideType("PROMOTION")
                .build();
    }

    private PromotionResponse mapImageSlide(PromotionGalleryImage image) {
        return PromotionResponse.builder().id(image.getId()).imageUrl(image.getImageUrl())
                .active(image.isActive()).displayOrder(image.getDisplayOrder()).linkType("NONE").slideType("IMAGE").build();
    }

    private PromotionGalleryImageResponse mapGallery(PromotionGalleryImage image) {
        return PromotionGalleryImageResponse.builder()
                .id(image.getId())
                .imageUrl(image.getImageUrl())
                .label(image.getLabel())
                .active(image.isActive())
                .displayOrder(image.getDisplayOrder())
                .build();
    }
}
