package com.fastfit.backend.repository;

import com.fastfit.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.active = true ORDER BY p.displayOrder ASC, p.createdAt DESC")
    List<Product> findActiveProductsWithCategory();

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category ORDER BY p.displayOrder ASC, p.createdAt DESC")
    List<Product> findAllProductsWithCategory();

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.id = :id")
    Optional<Product> findByIdWithCategory(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForStockUpdate(@Param("id") Long id);

    // Mantidos para compatibilidade
    List<Product> findByActiveTrueOrderByDisplayOrderAscCreatedAtDesc();
    List<Product> findByCategoryIdOrderByDisplayOrderAsc(Long categoryId);
    long countByActiveTrue();

    java.util.List<com.fastfit.backend.entity.Product> findByCategoryIdAndActiveTrue(Long categoryId);
}
