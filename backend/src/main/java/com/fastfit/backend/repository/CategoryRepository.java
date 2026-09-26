package com.fastfit.backend.repository;

import com.fastfit.backend.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByActiveTrueOrderByDisplayOrderAsc();
    boolean existsByNameIgnoreCase(String name);

    // Busca categorias com contagem de produtos ativos (sem lazy loading)
    @Query("SELECT c FROM Category c LEFT JOIN FETCH c.products WHERE c.active = true ORDER BY c.displayOrder ASC")
    List<Category> findActiveCategoriesWithProducts();

    @Query("SELECT c FROM Category c LEFT JOIN FETCH c.products ORDER BY c.displayOrder ASC")
    List<Category> findAllCategoriesWithProducts();
}
