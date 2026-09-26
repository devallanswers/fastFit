package com.fastfit.backend.repository;

import com.fastfit.backend.entity.StoreSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StoreSettingsRepository extends JpaRepository<StoreSettings, Long> {
    Optional<StoreSettings> findFirstBy();
}
