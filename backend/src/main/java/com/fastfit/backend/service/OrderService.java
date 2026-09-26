package com.fastfit.backend.service;

import com.fastfit.backend.dto.request.OrderRequests.*;
import com.fastfit.backend.entity.CashRegister;
import com.fastfit.backend.entity.Order.OrderStatus;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.*;
import com.fastfit.backend.exception.AppException;
import com.fastfit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final CashRegisterService cashRegisterService;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final StoreSettingsRepository storeSettingsRepository;
    private final CashRegisterRepository cashRegisterRepository;
    private final CashTransactionRepository cashTransactionRepository;
    private final WhatsAppService whatsAppService;
    private final StoreScheduleService scheduleService;
    private final PixService pixService;
    private final ObjectMapper objectMapper;

    @Transactional
    public OrderResponse createOrder(User user, CreateOrderRequest req) {
        StoreSettings settings = storeSettingsRepository.findFirstBy()
                .orElseThrow(() -> new AppException("Configurações da loja não encontradas"));

        // SCHEDULED orders bypass the open/closed check
        if (req.getType() != Order.OrderType.SCHEDULED) {
            var scheduleResult = scheduleService.checkNow(settings);
            if (scheduleResult.status() != StoreScheduleService.StoreStatus.OPEN) {
                throw new AppException(scheduleResult.message());
            }
        }

        if (req.getType() == Order.OrderType.DELIVERY && !settings.isAcceptDelivery())
            throw new AppException("Entrega não disponível no momento");
        if (req.getType() == Order.OrderType.PICKUP && !settings.isAcceptPickup())
            throw new AppException("Retirada não disponível no momento");
        if (req.getType() == Order.OrderType.SCHEDULED && !settings.isAcceptScheduled())
            throw new AppException("Encomendas não disponíveis no momento");

        if (req.getType() == Order.OrderType.DELIVERY &&
            (req.getDeliveryAddress() == null || req.getDeliveryAddress().isBlank()))
            throw new AppException("Endereço de entrega é obrigatório");

        if (req.getType() == Order.OrderType.SCHEDULED &&
            (req.getScheduledDateTime() == null || req.getScheduledDateTime().isBlank()))
            throw new AppException("Data e hora da encomenda são obrigatórias");

        // Se for retirada (NOW ou SCHEDULED sem deliveryAddress), exigir horário nas observações
        boolean isPickupRequest = req.getType() == Order.OrderType.PICKUP
                || (req.getType() == Order.OrderType.SCHEDULED && (req.getDeliveryAddress() == null || req.getDeliveryAddress().isBlank()));
        if (isPickupRequest) {
            String notes = req.getNotes() != null ? req.getNotes() : "";
            if (!notes.matches("(?s).*\\d{2}:\\d{2}.*")) {
                throw new AppException("Horário de retirada é obrigatório para pedidos de retirada (informe HH:MM nas observações)");
            }
        }

        // Parse scheduled time
        LocalDateTime scheduledTime = null;
        if (req.getScheduledDateTime() != null) {
            try {
                scheduledTime = LocalDateTime.parse(req.getScheduledDateTime(),
                        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
            } catch (Exception e) {
                throw new AppException("Formato de data inválido. Use: YYYY-MM-DDTHH:MM");
            }
        }

        // Validar antecedência mínima (minutos -> horas -> dias)
        if (req.getType() == Order.OrderType.SCHEDULED && scheduledTime != null) {
            long leadMs;
            if (settings.getScheduledMinMinutesAhead() != null) {
                leadMs = settings.getScheduledMinMinutesAhead() * 60L * 1000L;
            } else if (settings.getScheduledMinHoursAhead() != null) {
                leadMs = settings.getScheduledMinHoursAhead() * 60L * 60L * 1000L;
            } else {
                leadMs = settings.getScheduledMinDaysAhead() * 24L * 60L * 60L * 1000L;
            }
            long earliest = System.currentTimeMillis() + leadMs;
            if (scheduledTime.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli() < earliest) {
                throw new AppException("Escolha uma data/hora respeitando o prazo mínimo de antecedência configurado");
            }
        }

        Order order = Order.builder()
                .user(user)
                .guestName(req.getGuestName())
                .guestPhone(req.getGuestPhone())
                .status(Order.OrderStatus.RECEIVED)
                .type(req.getType())
                .deliveryAddress(req.getDeliveryAddress())
                .notes(req.getNotes())
                .paymentMethod(req.getPaymentMethod())
                .changeAmount(req.getChangeAmount())
                .scheduledTime(scheduledTime)
                .totalAmount(BigDecimal.ZERO)
                .build();

        // Determinar itens: carrinho local (guest) ou carrinho do banco (logado)
        List<OrderItem> orderItems;
        Map<Long, Integer> stockUsage = new HashMap<>();
        boolean hasGuestItems = req.getCartItems() != null && !req.getCartItems().isEmpty();

        if (hasGuestItems) {
            // Cliente sem login: itens vêm no body do request
            orderItems = req.getCartItems().stream().map(ci -> {
                BigDecimal price = ci.getPriceSnapshot() != null ? ci.getPriceSnapshot() : BigDecimal.ZERO;
                int qty = ci.getQuantity() != null ? ci.getQuantity() : 1;
                return OrderItem.builder()
                    .order(order)
                    .productId(ci.getProductId())
                    .productName(ci.getProductName() != null ? ci.getProductName() : "Produto")
                    .productImage(ci.getProductImage())
                    .quantity(qty)
                    .price(price)
                    .subtotal(price.multiply(BigDecimal.valueOf(qty)))
                    .packageSelectionsJson(ci.getPackageSelectionsJson())
                    .build();
            }).toList();
            req.getCartItems().forEach(ci -> collectStockUsage(stockUsage, ci.getProductId(), ci.getQuantity(), ci.getPackageSelectionsJson()));
        } else if (user != null) {
            // Cliente logado: itens vêm do carrinho no banco
            Cart cart = cartRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new AppException("Carrinho não encontrado"));
            if (cart.getItems().isEmpty()) throw new AppException("Carrinho vazio");

            orderItems = cart.getItems().stream().map(cartItem -> {
                boolean isPkg = cartItem.getPackageRef() != null;
                String name = isPkg
                    ? cartItem.getPackageRef().getName()
                    : (cartItem.getProduct() != null ? cartItem.getProduct().getName() : "");
                String image = isPkg
                    ? cartItem.getPackageRef().getImageUrl()
                    : (cartItem.getProduct() != null ? cartItem.getProduct().getImageUrl() : null);

                return OrderItem.builder()
                    .order(order)
                    .productId(isPkg || cartItem.getProduct() == null ? null : cartItem.getProduct().getId())
                    .productName(name)
                    .productImage(image)
                    .quantity(cartItem.getQuantity())
                    .price(cartItem.getPriceSnapshot())
                    .subtotal(cartItem.getPriceSnapshot().multiply(BigDecimal.valueOf(cartItem.getQuantity())))
                    .packageName(isPkg ? cartItem.getPackageRef().getName() : null)
                    .packageSelectionsJson(cartItem.getPackageSelectionsJson())
                    .build();
            }).toList();
            cart.getItems().forEach(ci -> collectStockUsage(stockUsage,
                    ci.getProduct() != null ? ci.getProduct().getId() : null, ci.getQuantity(), ci.getPackageSelectionsJson()));

            // Limpar carrinho
            cart.getItems().clear();
            cartRepository.save(cart);
        } else {
            throw new AppException("Carrinho vazio");
        }

        if (orderItems.isEmpty()) throw new AppException("Carrinho vazio");

        decrementStock(stockUsage);

        order.getItems().addAll(orderItems);
        BigDecimal subtotal = orderItems.stream().map(OrderItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Add delivery fee: include for DELIVERY or for SCHEDULED orders that have a delivery address, inclusao valor entrega
        boolean isDeliveryOrder = req.getType() == Order.OrderType.DELIVERY
            || (req.getType() == Order.OrderType.SCHEDULED
                && req.getDeliveryAddress() != null && !req.getDeliveryAddress().isBlank());
        BigDecimal deliveryFee = (isDeliveryOrder && settings.getDeliveryFee() != null)
            ? settings.getDeliveryFee() : BigDecimal.ZERO;
        order.setTotalAmount(subtotal.add(deliveryFee));

        Order saved = orderRepository.save(order);

        // Registrar receita no caixa aberto (se houver)
        try {
            var open = cashRegisterRepository.findFirstByOpenTrue();
            if (open.isPresent()) {
                CashRegister reg = open.get();
                // registrar como IN com categoria VENDA
                CashTransaction tx = CashTransaction.builder()
                        .register(reg)
                        .createdAt(java.time.LocalDateTime.now())
                        .createdBy(req.getGuestName() != null ? req.getGuestName() : "system")
                        .type("IN")
                        .amount(saved.getTotalAmount())
                        .category("VENDA")
                        .notes("Pedido #" + saved.getId())
                        .orderId(saved.getId())
                        .build();
                reg.setCurrentBalance(reg.getCurrentBalance().add(saved.getTotalAmount()));
                // persistir
                cashRegisterRepository.save(reg);
                cashTransactionRepository.save(tx);
            }
        } catch (Exception e) {
            log.warn("Falha ao registrar transação no caixa: {}", e.getMessage());
        }
        // Gera código Pix se necessário
        String pixCode = null;
        if (saved.getPaymentMethod() == Order.PaymentMethod.PIX) {
            pixCode = pixService.generatePixCode(saved.getId(), saved.getTotalAmount());
        }

        // Envia confirmação para TODAS as formas de pagamento
        try {
            sendOrderConfirmationMessage(saved, pixCode);
        } catch (Exception e) {
            log.warn("[WhatsApp] Erro ao enviar confirmação do pedido #{}: {}", saved.getId(), e.getMessage());
        }

        return mapOrderWithPixCode(saved, pixCode);
    }

    @Transactional
    public OrderResponse cancelOrder(User user, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException("Pedido não encontrado"));
        boolean isOwner = false;
        if (user != null && order.getUser() != null) {
            isOwner = order.getUser().getId().equals(user.getId());
        }
        if (!isOwner) throw new AppException("Pedido não encontrado");
        if (order.getStatus() != Order.OrderStatus.RECEIVED)
            throw new AppException("Apenas pedidos com status 'Recebido' podem ser cancelados");
        order.setStatus(Order.OrderStatus.CANCELED);
        restoreStock(order);
        Order saved = orderRepository.save(order);
        cashRegisterService.removeTransactionsForOrder(saved.getId());
        return mapOrder(saved);
    }

    @Transactional
    public OrderResponse cancelOrderByPhone(String phone, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException("Pedido não encontrado"));
        String orderPhone = order.getGuestPhone() != null ? order.getGuestPhone()
                : (order.getUser() != null ? order.getUser().getPhone() : null);
        if (orderPhone == null || !orderPhone.equals(phone))
            throw new AppException("Pedido não encontrado");
        if (order.getStatus() != Order.OrderStatus.RECEIVED)
            throw new AppException("Apenas pedidos com status 'Recebido' podem ser cancelados");
        order.setStatus(Order.OrderStatus.CANCELED);
        restoreStock(order);
        Order saved = orderRepository.save(order);
        cashRegisterService.removeTransactionsForOrder(saved.getId());
        return mapOrder(saved);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getUserOrders(User user) {
        return orderRepository.findByUserIdWithItems(user.getId())
                .stream().map(this::mapOrder).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByPhone(String phone) {
        return orderRepository.findByGuestPhoneOrUserPhone(phone)
                .stream().map(this::mapOrder).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllWithItems().stream().map(this::mapOrder).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getActiveOrders() {
        return orderRepository.findActiveOrders().stream().map(this::mapOrder).toList();
    }

    @Transactional
    public OrderResponse updateStatus(Long orderId, UpdateOrderStatusRequest req) {
        log.info("[Order] Atualizando status do pedido #{} para: {}", orderId, req.getStatus());
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException("Pedido não encontrado"));
        OrderStatus previousStatus = order.getStatus();
        order.setStatus(req.getStatus());
        Order saved = orderRepository.save(order);
        if (saved.getStatus() == Order.OrderStatus.FINISHED) {
            registerOrderPayment(saved);
        } else if (saved.getStatus() == Order.OrderStatus.DELIVERED_PAYMENT_DUE) {
            cashRegisterService.removeTransactionsForOrder(saved.getId());
        }
        if (saved.getStatus() == Order.OrderStatus.CANCELED && previousStatus != Order.OrderStatus.CANCELED) {
            restoreStock(saved);
            cashRegisterService.removeTransactionsForOrder(saved.getId());
        }
        log.info("[Order] Pedido #{} salvo com status: {}", orderId, saved.getStatus());
        sendWhatsAppStatusMessage(saved);
        return mapOrder(saved);
    }

    private void registerOrderPayment(Order order) {
        if (cashTransactionRepository.existsByOrderId(order.getId())) return;
        CashRegister openRegister = cashRegisterService.getOrCreateOpenRegister();
        cashRegisterService.addTransaction(openRegister.getId(), "sistema", "IN",
                order.getTotalAmount(), "Pedido", "Pedido #" + order.getId(), order.getId());
    }

    private void sendWhatsAppStatusMessage(Order order) {
        String phone = order.getGuestPhone() != null ? order.getGuestPhone()
                : (order.getUser() != null ? order.getUser().getPhone() : null);
        String name = order.getGuestName() != null ? order.getGuestName()
                : (order.getUser() != null ? order.getUser().getName() : "Cliente");

        log.info("[WhatsApp-Order] Tentando enviar notificação para pedido #{}: status={}, phone={}",
                order.getId(), order.getStatus(), phone);

        if (phone == null || phone.isBlank()) {
            log.warn("[WhatsApp-Order] Número de telefone não encontrado para pedido #{}", order.getId());
            return;
        }

        StoreSettings settings = storeSettingsRepository.findFirstBy().orElse(null);
        String storeName = settings != null && settings.getStoreName() != null
                ? settings.getStoreName() : "FastFit Store";

        String typeLabel = switch (order.getType()) {
            case DELIVERY -> " Saiu para entrega agora. 🛵";
            case PICKUP -> " Pode vir retirar. 🏃";
            case SCHEDULED -> " Sua encomenda está a caminho! 📦";
        };

        String msg = switch (order.getStatus()) {
            case IN_PREPARATION -> String.format(
                "Olá %s! 👨‍🍳 Seu pedido *#%d* na %s está sendo preparado com carinho. Em breve ficará pronto!",
                name, order.getId(), storeName);
            case READY -> String.format(
                "Olá %s! ✅ Seu pedido *#%d* na %s está pronto!%s",
                name, order.getId(), storeName, typeLabel);
            case CANCELED -> String.format(
                "Olá %s! ❌ Infelizmente seu pedido *#%d* na %s foi cancelado. Entre em contato para mais informações.",
                name, order.getId(), storeName);
            default -> null;
        };

        if (msg != null) {
            log.info("[WhatsApp-Order] Enviando mensagem para {} (pedido #{}): {}", phone, order.getId(), msg);
            whatsAppService.sendText(phone, msg);
            log.info("[WhatsApp-Order] Mensagem enviada com sucesso para pedido #{}", order.getId());
        } else {
            log.debug("[WhatsApp-Order] Status {} não dispara notificação", order.getStatus());
        }
    }

    private void collectStockUsage(Map<Long, Integer> usage, Long productId, Integer quantity, String packageSelectionsJson) {
        int qty = quantity == null ? 1 : quantity;
        if (productId != null) usage.merge(productId, qty, Integer::sum);
        if (packageSelectionsJson == null || packageSelectionsJson.isBlank()) return;
        try {
            JsonNode selections = objectMapper.readTree(packageSelectionsJson);
            for (JsonNode selection : selections) {
                for (JsonNode id : selection.path("productIds")) {
                    if (id.canConvertToLong()) usage.merge(id.asLong(), qty, Integer::sum);
                }
            }
        } catch (Exception e) {
            throw new AppException("Não foi possível validar o estoque dos itens do pacote");
        }
    }

    private void decrementStock(Map<Long, Integer> usage) {
        for (var entry : usage.entrySet()) {
            Product product = productRepository.findByIdForStockUpdate(entry.getKey())
                    .orElseThrow(() -> new AppException("Produto não encontrado"));
            if (!product.isActive()) throw new AppException(product.getName() + " está indisponível");
            if (product.getStockQuantity() != null) {
                if (product.getStockQuantity() < entry.getValue()) {
                    throw new AppException("Estoque insuficiente para " + product.getName() + ". Restam " + product.getStockQuantity() + " unidade(s)");
                }
                product.setStockQuantity(product.getStockQuantity() - entry.getValue());
                if (product.getStockQuantity() == 0) product.setActive(false);
                productRepository.save(product);
            }
        }
    }

    private void restoreStock(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getProductId() == null) continue;
            productRepository.findByIdForStockUpdate(item.getProductId()).ifPresent(product -> {
                if (product.getStockQuantity() != null) {
                    product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
                    product.setActive(true);
                    productRepository.save(product);
                }
            });
        }
    }

    // mapOrder sem pixCode (para listagens, updates de status, etc.)
    public OrderResponse mapOrder(Order o) {
        return mapOrderWithPixCode(o, null);
    }

    // mapOrderWithPixCode — usado ao criar pedido PIX
    public OrderResponse mapOrderWithPixCode(Order o, String pixCode) {
        String scheduledDt = null;
        if (o.getScheduledTime() != null) {
            scheduledDt = o.getScheduledTime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm"));
        }
        String displayName = o.getGuestName() != null ? o.getGuestName()
                : (o.getUser() != null ? o.getUser().getName() : "");
        String displayPhone = o.getGuestPhone() != null ? o.getGuestPhone()
                : (o.getUser() != null ? o.getUser().getPhone() : null);
        String displayEmail = o.getUser() != null ? o.getUser().getEmail() : null;
        Long displayUserId = o.getUser() != null ? o.getUser().getId() : null;

        return OrderResponse.builder()
                .id(o.getId())
                .userId(displayUserId)
                .userName(displayName)
                .userEmail(displayEmail)
                .userPhone(displayPhone)
                .status(o.getStatus().name())
                .totalAmount(o.getTotalAmount())
                .type(o.getType().name())
                .deliveryAddress(o.getDeliveryAddress())
                .notes(o.getNotes())
                .paymentMethod(o.getPaymentMethod() != null ? o.getPaymentMethod().name() : null)
                .deliveryDriverId(o.getDeliveryDriver() != null ? o.getDeliveryDriver().getId() : null)
                .deliveryDriverName(o.getDeliveryDriver() != null ? o.getDeliveryDriver().getName() : null)
                .deliveryPayment(o.getDeliveryPayment())
                .changeAmount(o.getChangeAmount())
                .scheduledDateTime(scheduledDt)
                .pixCode(pixCode)
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .items(o.getItems().stream().map(i ->
                    OrderItemResponse.builder()
                        .id(i.getId()).productId(i.getProductId()).productName(i.getProductName())
                        .productImage(i.getProductImage())
                        .quantity(i.getQuantity()).price(i.getPrice())
                        .subtotal(i.getSubtotal())
                        .packageName(i.getPackageName())
                        .packageSelectionsJson(i.getPackageSelectionsJson())
                        .build()
                ).toList())
                .build();
    }

    private void sendOrderConfirmationMessage(Order order, String pixCode) {
        String phone = order.getGuestPhone() != null ? order.getGuestPhone()
                : (order.getUser() != null ? order.getUser().getPhone() : null);
        String name = order.getGuestName() != null ? order.getGuestName()
                : (order.getUser() != null ? order.getUser().getName() : "Cliente");

        if (phone == null || phone.isBlank()) return;

        // Monta resumo dos itens
        StringBuilder itens = new StringBuilder();
        for (OrderItem item : order.getItems()) {
            itens.append(String.format("• %s x%d — R$ %s\n",
                item.getProductName(),
                item.getQuantity(),
                item.getSubtotal().toPlainString().replace(".", ",")));
        }

        // Bloco de pagamento — varia conforme o método
        String pagamentoInfo;
        if (order.getPaymentMethod() == Order.PaymentMethod.PIX && pixCode != null) {
    pagamentoInfo =
        "💳 *Pagamento via Pix*\n" +
        "O código será enviado na próxima mensagem para facilitar a cópia.\n\n" +
        "✅ Após pagar, envie o comprovante aqui nesta conversa para confirmarmos seu pedido!";
        } else if (order.getPaymentMethod() == Order.PaymentMethod.CASH) {
            String troco = order.getChangeAmount() != null
                ? String.format(" (troco para R$ %s)", new java.math.BigDecimal(order.getChangeAmount()).toPlainString().replace(".", ",")): "";
            pagamentoInfo = "💵 *Pagamento em Dinheiro*" + troco + "\nTenha o valor separado na hora da entrega.";
        } else if (order.getPaymentMethod() == Order.PaymentMethod.CREDIT) {
            pagamentoInfo = "💳 *Pagamento no Cartão de Crédito*\nA maquininha será levada até você.";
        } else if (order.getPaymentMethod() == Order.PaymentMethod.DEBIT) {
            pagamentoInfo = "💳 *Pagamento no Cartão de Débito*\nA maquininha será levada até você.";
        } else {
            pagamentoInfo = "💳 Forma de pagamento: " +
                (order.getPaymentMethod() != null ? order.getPaymentMethod().name() : "não informada");
        }

        StoreSettings settings = storeSettingsRepository.findFirstBy().orElse(null);
        String storeAddress = settings != null && settings.getStoreAddress() != null
                ? settings.getStoreAddress() : "endereço não configurado";

        String scheduledDt = order.getScheduledTime() != null
            ? order.getScheduledTime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm"))
            : null;

        // Se for encomenda (SCHEDULED), adicionar rótulo indicando ENCOMENDA + RETIRADA/ENTREGA
        String encomendaLabel = "";
        if (order.getType() == Order.OrderType.SCHEDULED) {
            boolean isScheduledDelivery = order.getDeliveryAddress() != null && !order.getDeliveryAddress().isBlank();
            encomendaLabel = isScheduledDelivery
                ? "📦 *ENCOMENDA — ENTREGA*\n\n"
                : "📦 *ENCOMENDA — RETIRADA*\n\n";
        }

        String enderecoInfo = switch (order.getType()) {
            case DELIVERY -> order.getDeliveryAddress() != null
                ? String.format("🛵 *Entrega no endereço:*\n%s\n\n", order.getDeliveryAddress())
                : "";
            case PICKUP -> String.format("🏠 *Retirada em nossa loja:*\n%s\n\n", storeAddress);
            case SCHEDULED -> {
                String tipoEntrega = order.getDeliveryAddress() != null
                    ? String.format("🛵 *Entrega no endereço:*\n%s", order.getDeliveryAddress())
                    : String.format("🏠 *Retirada em nossa loja:*\n%s", storeAddress);
                yield String.format(
                    "📅 *Encomenda agendada para:*\n%s\n\n%s\n\n",
                    scheduledDt != null ? scheduledDt : "data não informada",
                    tipoEntrega
                );
            }
        };

        String msg = String.format(
            "🎉 Pedido *#%d* recebido, %s!\n\n" +
            "%s" +
            "📋 *Resumo:*\n%s\n" +
            "💰 *Total: R$ %s*\n\n" +
            "%s" +
            "%s",
            order.getId(),
            name,
            encomendaLabel,
            itens.toString(),
            order.getTotalAmount().toPlainString().replace(".", ","),
            enderecoInfo,
            pagamentoInfo
        );

        whatsAppService.sendText(phone, msg);

        // Notifica administradores configurados (se houver)
        if (settings != null && settings.getAdminPhoneNumbers() != null && !settings.getAdminPhoneNumbers().isBlank()) {
            String adminMsg = String.format(
                "📣 *Novo pedido #%d* — Total: R$ %s\nTipo: %s\nCliente: %s\nTelefone: %s\n\nResumo:\n",
                order.getId(), order.getTotalAmount().toPlainString().replace(".", ","), order.getType().name(), name, phone
            );
            // Anexa itens ao texto
            String adminFullMsg = adminMsg + itens.toString();

            // Suporta separadores: vírgula, ponto-e-vírgula ou nova linha
            String[] numbers = settings.getAdminPhoneNumbers().split("[,;\\n]");
            for (String n : numbers) {
                String to = n.trim();
                if (to.isBlank()) continue;
                try {
                    whatsAppService.sendText(to, adminFullMsg);
                } catch (Exception e) {
                    log.warn("[WhatsApp-Admin] Falha ao enviar notificação para {}: {}", to, e.getMessage());
                }
            }
        }
        // Envia o código Pix isolado para facilitar a cópia
        if (order.getPaymentMethod() == Order.PaymentMethod.PIX && pixCode != null) {
            whatsAppService.sendText(phone, pixCode);
        }
    }
}
