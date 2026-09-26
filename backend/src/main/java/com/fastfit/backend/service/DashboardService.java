package com.fastfit.backend.service;

import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.Order;
import com.fastfit.backend.entity.OrderItem;
import com.fastfit.backend.entity.Product;
import com.fastfit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.TextStyle;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        return DashboardResponse.builder()
                .totalOrders(orderRepository.count())
                .todayOrders(orderRepository.countOrdersSince(startOfToday))
                .todayRevenue(orderRepository.revenueSince(startOfToday))
                .activeOrders(orderRepository.countActiveOrders())
                .totalUsers(userRepository.count())
                .activeProducts(productRepository.countByActiveTrue())
                .build();
    }

    @Transactional(readOnly = true)
    public MonthlyReportResponse getMonthlyReport(int year, int month) {
        LocalDate today = LocalDate.now();
        if (year == 0) year = today.getYear();
        if (month == 0) month = today.getMonthValue();

        // Calcular range do mês
        YearMonth ym = YearMonth.of(year, month);
        LocalDateTime start = ym.atDay(1).atStartOfDay();
        LocalDateTime end   = ym.atEndOfMonth().plusDays(1).atStartOfDay();

        List<Order> orders = orderRepository.findByYearAndMonth(start, end);
        long canceled      = orderRepository.countCanceledByYearAndMonth(start, end);
        BigDecimal revenue = orderRepository.revenueByYearAndMonth(start, end);

                // Calcular custo e top produtos — agora suporta itens que são pacotes
                List<Product> allProducts = productRepository.findAll();
                Map<String, Product> productByName = allProducts.stream()
                                .collect(Collectors.toMap(Product::getName, p -> p, (a, b) -> a));
                Map<Long, Product> productById = allProducts.stream()
                                .collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a));

                ObjectMapper mapper = new ObjectMapper();

                Map<String, MutableProductAgg> agg = new HashMap<>();
                BigDecimal totalCost = BigDecimal.ZERO;

                for (Order o : orders) {
                        if (o.getStatus() == Order.OrderStatus.CANCELED) continue;
                        for (OrderItem item : o.getItems()) {
                                String name = item.getProductName();
                                MutableProductAgg m = agg.computeIfAbsent(name, k -> new MutableProductAgg());
                                int qty = item.getQuantity() != null ? item.getQuantity() : 0;
                                BigDecimal rev = item.getSubtotal() != null ? item.getSubtotal() : BigDecimal.ZERO;

                                // Calcular custo do item
                                BigDecimal itemCost = BigDecimal.ZERO;
                                if (item.getPackageSelectionsJson() != null && !item.getPackageSelectionsJson().isBlank()) {
                                        try {
                                                List<Map<String, Object>> sels = mapper.readValue(item.getPackageSelectionsJson(), new TypeReference<>(){});
                                                // para cada slot, somar custo dos productIds
                                                BigDecimal perPackageCost = BigDecimal.ZERO;
                                                for (Map<String, Object> s : sels) {
                                                        Object pidsObj = s.get("productIds");
                                                        if (pidsObj instanceof List) {
                                                                List<?> pids = (List<?>) pidsObj;
                                                                for (Object pidObj : pids) {
                                                                        Long pid = null;
                                                                        if (pidObj instanceof Integer) pid = ((Integer) pidObj).longValue();
                                                                        else if (pidObj instanceof Long) pid = (Long) pidObj;
                                                                        else if (pidObj instanceof String) {
                                                                                try { pid = Long.parseLong((String) pidObj); } catch (Exception ignored) {}
                                                                        }
                                                                        if (pid != null) {
                                                                                Product p = productById.get(pid);
                                                                                BigDecimal c = (p != null && p.getCost() != null) ? p.getCost() : BigDecimal.ZERO;
                                                                                perPackageCost = perPackageCost.add(c);
                                                                        }
                                                                }
                                                        }
                                                }
                                                itemCost = perPackageCost.multiply(BigDecimal.valueOf(qty));
                                        } catch (Exception e) {
                                                // fallback: try to get cost by product name
                                                Product p = productByName.get(name);
                                                BigDecimal costPerUnit = p != null && p.getCost() != null ? p.getCost() : BigDecimal.ZERO;
                                                itemCost = costPerUnit.multiply(BigDecimal.valueOf(qty));
                                        }
                                } else {
                                        Product p = productByName.get(name);
                                        BigDecimal costPerUnit = p != null && p.getCost() != null ? p.getCost() : BigDecimal.ZERO;
                                        itemCost = costPerUnit.multiply(BigDecimal.valueOf(qty));
                                }

                                // acumular
                                m.quantity += qty;
                                m.revenue = m.revenue.add(rev);
                                m.cost = m.cost.add(itemCost);
                                totalCost = totalCost.add(itemCost);
                        }
                }

                List<ProductSalesResponse> topProducts = agg.entrySet().stream().map(e -> {
                        String pName = e.getKey();
                        MutableProductAgg m = e.getValue();
                        BigDecimal profit = m.revenue.subtract(m.cost);
                        return ProductSalesResponse.builder()
                                        .productName(pName)
                                        .quantitySold(m.quantity)
                                        .revenue(m.revenue)
                                        .cost(m.cost)
                                        .profit(profit)
                                        .build();
                }).sorted(Comparator.comparing(ProductSalesResponse::getRevenue).reversed()).collect(Collectors.toList());

        topProducts.sort(Comparator.comparing(ProductSalesResponse::getRevenue).reversed());

        String monthName = Month.of(month).getDisplayName(TextStyle.FULL, new Locale("pt", "BR"));
        monthName = monthName.substring(0, 1).toUpperCase() + monthName.substring(1);

        long deliveryCount    = orderRepository.countDeliveriesByYearAndMonth(start, end);
        BigDecimal deliveryRevenue = orderRepository.deliveryRevenueByYearAndMonth(start, end);
        long pickupCount      = orderRepository.countPickupsByYearAndMonth(start, end);

        return MonthlyReportResponse.builder()
                .year(year).month(month).monthName(monthName)
                .totalOrders(orderRepository.countByYearAndMonth(start, end) + canceled)
                .canceledOrders(canceled)
                .deliveryCount(deliveryCount)
                .deliveryRevenue(deliveryRevenue)
                .pickupCount(pickupCount)
                .totalRevenue(revenue)
                .totalCost(totalCost)
                .totalProfit(revenue.subtract(totalCost))
                .topProducts(topProducts)
                .build();
    }

        // helper mutable aggregator
        private static class MutableProductAgg {
                int quantity = 0;
                BigDecimal revenue = BigDecimal.ZERO;
                BigDecimal cost = BigDecimal.ZERO;
        }
}
