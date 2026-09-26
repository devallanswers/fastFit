package com.fastfit.backend.service;

import com.fastfit.backend.dto.request.ProductRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.Category;
import com.fastfit.backend.entity.Product;
import com.fastfit.backend.exception.AppException;
import com.fastfit.backend.repository.CategoryRepository;
import com.fastfit.backend.repository.ProductRepository;
import com.fastfit.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final FileStorageService fileStorageService;
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public List<ProductResponse> getPopularProducts() {
        var ranking = orderRepository.findTopSellingProductNames();
        var products = productRepository.findActiveProductsWithCategory();
        return ranking.stream().map(row -> products.stream().filter(p -> p.getName().equals(row[0])).findFirst().orElse(null))
                .filter(java.util.Objects::nonNull).limit(3).map(p -> ProductResponse.from(p, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getActiveProducts() {
        return productRepository.findActiveProductsWithCategory()
                .stream().map(p -> ProductResponse.from(p, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAllProductsWithCategory()
                .stream().map(p -> ProductResponse.from(p, true)).toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse getById(Long id) {
        return productRepository.findByIdWithCategory(id)
                .map(p -> ProductResponse.from(p, false))
                .orElseThrow(() -> new AppException("Produto não encontrado"));
    }

    @Transactional
    public ProductResponse create(CreateProductRequest req, MultipartFile image) {
        Product product = Product.builder()
                .name(req.getName())
                .description(req.getDescription())
                .ingredients(req.getIngredients())
                .differentials(req.getDifferentials())
                .weightVolume(req.getWeightVolume())
                .conservation(req.getConservation())
                .price(req.getPrice())
                .promotionalPrice(req.getPromotionalPrice())
                .promotionActive(Boolean.TRUE.equals(req.getPromotionActive()))
                .cost(req.getCost())
                .active(true)
                .displayOrder((int) productRepository.count())
                .stockQuantity(req.getStockQuantity())
                .build();

        setCategory(product, req.getCategoryId());

        if (image != null && !image.isEmpty()) {
            product.setImageUrl(fileStorageService.storeProductImage(image));
        }

        Product saved = productRepository.save(product);
        return productRepository.findByIdWithCategory(saved.getId())
                .map(p -> ProductResponse.from(p, true))
                .orElse(ProductResponse.from(saved, true));
    }

    @Transactional
    public ProductResponse update(Long id, UpdateProductRequest req, MultipartFile image) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new AppException("Produto não encontrado"));

        if (req.getName() != null) product.setName(req.getName());
        if (req.getDescription() != null) product.setDescription(req.getDescription());
        if (req.getIngredients() != null) product.setIngredients(req.getIngredients());
        if (req.getDifferentials() != null) product.setDifferentials(req.getDifferentials());
        if (req.getWeightVolume() != null) product.setWeightVolume(req.getWeightVolume());
        if (req.getConservation() != null) product.setConservation(req.getConservation());
        if (req.getPrice() != null) product.setPrice(req.getPrice());
        if (req.getPromotionalPrice() != null) product.setPromotionalPrice(req.getPromotionalPrice());
        if (req.getPromotionActive() != null) product.setPromotionActive(req.getPromotionActive());
        if (req.getCost() != null) product.setCost(req.getCost());
        if (req.getActive() != null) product.setActive(req.getActive());
        if (req.getDisplayOrder() != null) product.setDisplayOrder(req.getDisplayOrder());
        if (req.getStockQuantity() != null) product.setStockQuantity(req.getStockQuantity());
        if (req.getCategoryId() != null) setCategory(product, req.getCategoryId());

        if (image != null && !image.isEmpty()) {
            if (product.getImageUrl() != null) fileStorageService.deleteFile(product.getImageUrl());
            product.setImageUrl(fileStorageService.storeProductImage(image));
        }

        Product saved = productRepository.save(product);
        return productRepository.findByIdWithCategory(saved.getId())
                .map(p -> ProductResponse.from(p, true))
                .orElse(ProductResponse.from(saved, true));
    }

    @Transactional
    public void reorder(ReorderProductsRequest req) {
        AtomicInteger order = new AtomicInteger(0);
        for (Long productId : req.getOrderedIds()) {
            productRepository.findById(productId).ifPresent(p -> {
                p.setDisplayOrder(order.getAndIncrement());
                productRepository.save(p);
            });
        }
    }

    @Transactional
    public void delete(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new AppException("Produto não encontrado"));
        if (product.getImageUrl() != null) fileStorageService.deleteFile(product.getImageUrl());
        productRepository.delete(product);
    }

    @Transactional
    public ProductResponse toggleActive(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new AppException("Produto não encontrado"));
        product.setActive(!product.isActive());
        Product saved = productRepository.save(product);
        return productRepository.findByIdWithCategory(saved.getId())
                .map(p -> ProductResponse.from(p, true))
                .orElse(ProductResponse.from(saved, true));
    }

    private void setCategory(Product product, Long categoryId) {
        if (categoryId != null) {
            Category cat = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new AppException("Categoria não encontrada"));
            product.setCategory(cat);
        }
    }
}
