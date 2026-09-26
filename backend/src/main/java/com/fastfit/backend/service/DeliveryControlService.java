package com.fastfit.backend.service;

import com.fastfit.backend.dto.request.DeliveryRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.*;
import com.fastfit.backend.exception.AppException;
import com.fastfit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service @RequiredArgsConstructor
public class DeliveryControlService {
    private final DeliveryDriverRepository driverRepository;
    private final DeliveryExpenseRepository expenseRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final DeliveryPaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public List<DeliveryDriverResponse> drivers() {
        return driverRepository.findAllByOrderByNameAsc().stream().map(this::mapDriver).toList();
    }
    @Transactional public DeliveryDriverResponse createDriver(DriverRequest req) {
        return mapDriver(driverRepository.save(DeliveryDriver.builder().name(req.getName().trim())
            .defaultPayment(req.getDefaultPayment()).active(req.getActive() == null || req.getActive()).build()));
    }
    @Transactional public DeliveryDriverResponse updateDriver(Long id, DriverRequest req) {
        DeliveryDriver d = driverRepository.findById(id).orElseThrow(() -> new AppException("Entregador não encontrado"));
        d.setName(req.getName().trim()); d.setDefaultPayment(req.getDefaultPayment());
        if (req.getActive() != null) d.setActive(req.getActive());
        return mapDriver(driverRepository.save(d));
    }
    @Transactional public void removeDriver(Long id) { driverRepository.delete(driverRepository.findById(id).orElseThrow(() -> new AppException("Entregador não encontrado"))); }
    @Transactional public OrderResponse assign(Long orderId, AssignDriverRequest req) {
        Order o = orderRepository.findById(orderId).orElseThrow(() -> new AppException("Pedido não encontrado"));
        if (o.getType() == Order.OrderType.PICKUP) throw new AppException("Pedidos para retirada não possuem entregador");
        DeliveryDriver d = driverRepository.findById(req.getDriverId()).orElseThrow(() -> new AppException("Entregador não encontrado"));
        o.setDeliveryDriver(d);
        o.setDeliveryPayment(req.getPayment() != null ? req.getPayment() : d.getDefaultPayment());
        return orderService.mapOrder(orderRepository.save(o));
    }
    @Transactional public DeliveryExpenseResponse addExpense(ExpenseRequest req) {
        return mapExpense(expenseRepository.save(DeliveryExpense.builder().amount(req.getAmount()).category(req.getCategory().trim().toUpperCase()).notes(req.getNotes()).build()));
    }
    @Transactional public void removeExpense(Long id) { expenseRepository.deleteById(id); }
    @Transactional public DeliveryPaymentResponse pay(PaymentRequest req) {
        DeliveryDriver driver = driverRepository.findById(req.getDriverId()).orElseThrow(() -> new AppException("Entregador não encontrado"));
        BigDecimal earned = orderRepository.findAllWithItems().stream()
                .filter(o -> driver.getId().equals(o.getDeliveryDriver() != null ? o.getDeliveryDriver().getId() : null) && o.getStatus() != Order.OrderStatus.CANCELED)
                .map(Order::getDeliveryPayment).filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal alreadyPaid = paymentRepository.findByDriverIdOrderByCreatedAtDesc(driver.getId()).stream()
                .map(DeliveryPayment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (req.getAmount().compareTo(earned.subtract(alreadyPaid)) > 0)
            throw new AppException("O pagamento é maior que o saldo pendente deste entregador");
        return mapPayment(paymentRepository.save(DeliveryPayment.builder().driver(driver).amount(req.getAmount()).notes(req.getNotes()).build()));
    }
    @Transactional(readOnly = true) public DeliveryControlResponse control() {
        var deliveries = orderRepository.findAllWithItems().stream().filter(o -> o.getType() != Order.OrderType.PICKUP).map(orderService::mapOrder).toList();
        var expenses = expenseRepository.findAllByOrderByCreatedAtDesc().stream().map(this::mapExpense).toList();
        var payments = paymentRepository.findAllByOrderByCreatedAtDesc().stream().map(this::mapPayment).toList();
        var balances = driverRepository.findAllByOrderByNameAsc().stream().map(driver -> {
            var assigned = deliveries.stream().filter(o -> driver.getId().equals(o.getDeliveryDriverId()) && !"CANCELED".equals(o.getStatus())).toList();
            BigDecimal earned = assigned.stream().map(OrderResponse::getDeliveryPayment).filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal paid = payments.stream().filter(p -> driver.getId().equals(p.getDriverId())).map(DeliveryPaymentResponse::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            return DeliveryDriverBalanceResponse.builder().driverId(driver.getId()).driverName(driver.getName()).deliveryCount(assigned.size()).earned(earned).paid(paid).balance(earned.subtract(paid)).build();
        }).toList();
        BigDecimal due = balances.stream().map(DeliveryDriverBalanceResponse::getBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal fuel = expenses.stream().filter(e -> "GASOLINA".equals(e.getCategory()) || "COMBUSTIVEL".equals(e.getCategory())).map(DeliveryExpenseResponse::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return DeliveryControlResponse.builder().deliveries(deliveries).drivers(drivers()).expenses(expenses).payments(payments).driverBalances(balances).totalDueToDrivers(due).totalFuelExpense(fuel).build();
    }
    private DeliveryDriverResponse mapDriver(DeliveryDriver d) { return DeliveryDriverResponse.builder().id(d.getId()).name(d.getName()).defaultPayment(d.getDefaultPayment()).active(d.isActive()).build(); }
    private DeliveryExpenseResponse mapExpense(DeliveryExpense e) { return DeliveryExpenseResponse.builder().id(e.getId()).createdAt(e.getCreatedAt()).amount(e.getAmount()).category(e.getCategory()).notes(e.getNotes()).build(); }
    private DeliveryPaymentResponse mapPayment(DeliveryPayment p) { return DeliveryPaymentResponse.builder().id(p.getId()).driverId(p.getDriver().getId()).driverName(p.getDriver().getName()).amount(p.getAmount()).notes(p.getNotes()).createdAt(p.getCreatedAt()).build(); }
}
