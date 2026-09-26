package com.fastfit.backend.service;

import com.fastfit.backend.dto.request.PackageRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.*;
import com.fastfit.backend.exception.AppException;
import com.fastfit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PackageService {

    private final PackageRepository packageRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<PackageResponse> getActivePackages() {
        return packageRepository.findActiveWithSlots().stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public List<PackageResponse> getAllPackages() {
        return packageRepository.findAllWithSlots().stream().map(this::map).toList();
    }

    @Transactional
    public PackageResponse create(CreatePackageRequest req) {
        com.fastfit.backend.entity.Package pkg = com.fastfit.backend.entity.Package.builder()
                .name(req.getName())
                .description(req.getDescription())
                .price(req.getPrice())
                .active(req.isActive())
                .displayOrder((int) packageRepository.count())
                .build();

        if (req.getSlots() != null) {
            req.getSlots().forEach(sr -> pkg.getSlots().add(buildSlot(sr, pkg)));
        }

        return map(packageRepository.save(pkg));
    }

    @Transactional
    public PackageResponse update(Long id, UpdatePackageRequest req) {
        com.fastfit.backend.entity.Package pkg = packageRepository.findById(id)
                .orElseThrow(() -> new AppException("Pacote não encontrado"));

        if (req.getName() != null) pkg.setName(req.getName());
        if (req.getDescription() != null) pkg.setDescription(req.getDescription());
        if (req.getPrice() != null) pkg.setPrice(req.getPrice());
        if (req.getActive() != null) pkg.setActive(req.getActive());
        if (req.getDisplayOrder() != null) pkg.setDisplayOrder(req.getDisplayOrder());

        if (req.getSlots() != null) {
            pkg.getSlots().clear();
            req.getSlots().forEach(sr -> pkg.getSlots().add(buildSlot(sr, pkg)));
        }

        return map(packageRepository.save(pkg));
    }

    @Transactional
    public void updateImage(Long id, String imageUrl) {
        com.fastfit.backend.entity.Package pkg = packageRepository.findById(id)
                .orElseThrow(() -> new AppException("Pacote não encontrado"));
        pkg.setImageUrl(imageUrl);
        packageRepository.save(pkg);
    }

    @Transactional
    public void delete(Long id) {
        if (!packageRepository.existsById(id)) throw new AppException("Pacote não encontrado");
        packageRepository.deleteById(id);
    }

    private PackageSlot buildSlot(SlotRequest sr, com.fastfit.backend.entity.Package pkg) {
        PackageSlot slot = PackageSlot.builder()
                .pkg(pkg)
                .name(sr.getName())
                .quantity(sr.getQuantity())
                .displayOrder(sr.getDisplayOrder() != null ? sr.getDisplayOrder() : 0)
                .build();

        if (sr.getCategoryId() != null) {
            slot.setCategory(categoryRepository.findById(sr.getCategoryId())
                    .orElseThrow(() -> new AppException("Categoria não encontrada: " + sr.getCategoryId())));
        }

        if (sr.getAllowedProductIds() != null && !sr.getAllowedProductIds().isEmpty()) {
            List<Product> products = productRepository.findAllById(sr.getAllowedProductIds());
            slot.setAllowedProducts(products);
        }

        return slot;
    }

    public PackageResponse map(com.fastfit.backend.entity.Package pkg) {
        return PackageResponse.builder()
                .id(pkg.getId())
                .name(pkg.getName())
                .description(pkg.getDescription())
                .price(pkg.getPrice())
                .imageUrl(pkg.getImageUrl())
                .active(pkg.isActive())
                .displayOrder(pkg.getDisplayOrder())
                .slots(pkg.getSlots().stream().map(slot -> PackageSlotResponse.builder()
                        .id(slot.getId())
                        .name(slot.getName())
                        .quantity(slot.getQuantity())
                        .displayOrder(slot.getDisplayOrder())
                        .categoryId(slot.getCategory() != null ? slot.getCategory().getId() : null)
                        .categoryName(slot.getCategory() != null ? slot.getCategory().getName() : null)
                        .allowedProducts(buildEligibleProducts(slot))
                        .build()
                ).toList())
                .build();
    }

    private List<ProductInSlotResponse> buildEligibleProducts(PackageSlot slot) {
        List<Product> products = new ArrayList<>();

        if (slot.getCategory() != null) {
            products.addAll(productRepository.findByCategoryIdAndActiveTrue(slot.getCategory().getId()));
        }

        if (slot.getAllowedProducts() != null) {
            for (Product p : slot.getAllowedProducts()) {
                if (products.stream().noneMatch(x -> x.getId().equals(p.getId()))) {
                    products.add(p);
                }
            }
        }

        return products.stream()
                .filter(Product::isActive)
                .map(p -> ProductInSlotResponse.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .imageUrl(p.getImageUrl())
                        .price(p.getPrice())
                        .promotionalPrice(p.getPromotionalPrice())
                        .promotionActive(p.isPromotionActive())
                        .build())
                .toList();
    }

    @Transactional
    public void reorder(List<Long> orderedIds) {
        java.util.concurrent.atomic.AtomicInteger order = new java.util.concurrent.atomic.AtomicInteger(0);
        for (Long id : orderedIds) {
            packageRepository.findById(id).ifPresent(pkg -> {
                pkg.setDisplayOrder(order.getAndIncrement());
                packageRepository.save(pkg);
            });
        }
    }

}