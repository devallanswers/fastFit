package com.fastfit.backend.repository;

import com.fastfit.backend.entity.Order;
import com.fastfit.backend.entity.Order.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items LEFT JOIN FETCH o.user WHERE o.user.id = :userId ORDER BY o.createdAt DESC")
    List<Order> findByUserIdWithItems(@Param("userId") Long userId);

    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items LEFT JOIN FETCH o.user WHERE o.guestPhone = :phone OR (o.user IS NOT NULL AND o.user.phone = :phone) ORDER BY o.createdAt DESC")
    List<Order> findByGuestPhoneOrUserPhone(@Param("phone") String phone);

    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items LEFT JOIN FETCH o.user ORDER BY o.createdAt DESC")
    List<Order> findAllWithItems();

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Order> findAllByOrderByCreatedAtDesc();

    @Query("SELECT i.productName, SUM(i.quantity) FROM OrderItem i WHERE i.order.status <> 'CANCELED' GROUP BY i.productName ORDER BY SUM(i.quantity) DESC")
    List<Object[]> findTopSellingProductNames();

    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items LEFT JOIN FETCH o.user WHERE o.status IN ('RECEIVED','IN_PREPARATION','READY','DELIVERED_PAYMENT_DUE') ORDER BY o.createdAt ASC")
    List<Order> findActiveOrders();

    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :since AND o.status <> 'CANCELED'")
    long countOrdersSince(@Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.createdAt >= :since AND o.status <> 'CANCELED'")
    BigDecimal revenueSince(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status IN ('RECEIVED','IN_PREPARATION','READY')")
    long countActiveOrders();

    // ── Relatórios mensais ─────────────────────────────────────────
    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items WHERE o.createdAt >= :start AND o.createdAt < :end")
    List<Order> findByYearAndMonth(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :start AND o.createdAt < :end AND o.status <> 'CANCELED'")
    long countByYearAndMonth(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :start AND o.createdAt < :end AND o.status = 'CANCELED'")
    long countCanceledByYearAndMonth(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.createdAt >= :start AND o.createdAt < :end AND o.status <> 'CANCELED'")
    BigDecimal revenueByYearAndMonth(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    // Deliveries
    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :start AND o.createdAt < :end AND o.type = 'DELIVERY' AND o.status <> 'CANCELED'")
    long countDeliveriesByYearAndMonth(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.createdAt >= :start AND o.createdAt < :end AND o.type = 'DELIVERY' AND o.status <> 'CANCELED'")
    BigDecimal deliveryRevenueByYearAndMonth(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :start AND o.createdAt < :end AND o.type = 'PICKUP' AND o.status <> 'CANCELED'")
    long countPickupsByYearAndMonth(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    // Por dia (para relatório diário)
    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items WHERE o.createdAt >= :start AND o.createdAt < :end")
    List<Order> findTodaysOrders(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :start AND o.createdAt < :end AND o.status <> 'CANCELED'")
    long countByDateRange(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.createdAt >= :start AND o.createdAt < :end AND o.status <> 'CANCELED'")
    BigDecimal revenueByDateRange(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :start AND o.createdAt < :end AND o.type = 'DELIVERY' AND o.status <> 'CANCELED'")
    long countDeliveriesByDateRange(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.createdAt >= :start AND o.createdAt < :end AND o.type = 'DELIVERY' AND o.status <> 'CANCELED'")
    BigDecimal deliveryRevenueByDateRange(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);
}
