package com.fastfit.backend.service;

import com.fastfit.backend.dto.request.CategoryRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.Category;
import com.fastfit.backend.exception.AppException;
import com.fastfit.backend.repository.CategoryRepository;
import com.fastfit.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getActiveCategories() {
        return categoryRepository.findActiveCategoriesWithProducts()
                .stream().map(CategoryResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAllCategoriesWithProducts()
                .stream().map(CategoryResponse::from).toList();
    }

    @Transactional
    public CategoryResponse create(CreateCategoryRequest req) {
        if (categoryRepository.existsByNameIgnoreCase(req.getName())) {
            throw new AppException("Categoria já existe: " + req.getName());
        }
        Category cat = Category.builder()
                .name(req.getName())
                .description(req.getDescription())
                .displayOrder((int) categoryRepository.count())
                .active(true)
                .build();
        Category saved = categoryRepository.save(cat);
        // Recarregar com produtos (vazio por enquanto, mas evita NPE)
        return CategoryResponse.from(saved);
    }

    @Transactional
    public CategoryResponse update(Long id, UpdateCategoryRequest req) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new AppException("Categoria não encontrada"));
        if (req.getName() != null) cat.setName(req.getName());
        if (req.getDescription() != null) cat.setDescription(req.getDescription());
        if (req.getActive() != null) cat.setActive(req.getActive());
        if (req.getDisplayOrder() != null) cat.setDisplayOrder(req.getDisplayOrder());
        return CategoryResponse.from(categoryRepository.save(cat));
    }

    @Transactional
    public void delete(Long id) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new AppException("Categoria não encontrada"));
        long productCount = productRepository.findByCategoryIdOrderByDisplayOrderAsc(id).size();
        if (productCount > 0) throw new AppException("Categoria possui produtos. Remova os produtos antes.");
        categoryRepository.delete(cat);
    }

    @Transactional
    public void reorder(List<Long> orderedIds) {
        java.util.concurrent.atomic.AtomicInteger order = new java.util.concurrent.atomic.AtomicInteger(0);
        for (Long id : orderedIds) {
            categoryRepository.findById(id).ifPresent(cat -> {
                cat.setDisplayOrder(order.getAndIncrement());
                categoryRepository.save(cat);
            });
        }
    }

}