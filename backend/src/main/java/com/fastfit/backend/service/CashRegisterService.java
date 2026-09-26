package com.fastfit.backend.service;

import com.fastfit.backend.entity.CashRegister;
import com.fastfit.backend.entity.CashTransaction;
import com.fastfit.backend.exception.AppException;
import com.fastfit.backend.repository.CashRegisterRepository;
import com.fastfit.backend.repository.CashTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CashRegisterService {
    private final CashRegisterRepository registerRepository;
    private final CashTransactionRepository transactionRepository;

    /**
     * Returns the currently open register, or creates one automatically if none exists.
     * This replaces the manual open flow — the register is always kept open.
     */
    @Transactional
    public CashRegister getOrCreateOpenRegister() {
        return registerRepository.findFirstByOpenTrue().orElseGet(() -> {
            CashRegister r = CashRegister.builder()
                    .openedAt(LocalDateTime.now())
                    .openedBy("sistema")
                    .initialBalance(BigDecimal.ZERO)
                    .currentBalance(BigDecimal.ZERO)
                    .open(true)
                    .build();
            return registerRepository.save(r);
        });
    }

    @Transactional
    public CashRegister openRegister(String user, BigDecimal initialBalance) {
        var current = registerRepository.findFirstByOpenTrue();
        if (current.isPresent()) return current.get();
        CashRegister r = CashRegister.builder()
                .openedAt(LocalDateTime.now())
                .openedBy(user)
                .initialBalance(initialBalance)
                .currentBalance(initialBalance)
                .open(true)
                .build();
        return registerRepository.save(r);
    }

    @Transactional
    public CashRegister closeRegister(Long registerId, String user) {
        CashRegister r = registerRepository.findById(registerId)
                .orElseThrow(() -> new AppException("Caixa não encontrado"));
        if (!r.isOpen()) throw new AppException("Caixa já está fechado");
        r.setClosedAt(LocalDateTime.now());
        r.setClosedBy(user);
        r.setOpen(false);
        return registerRepository.save(r);
    }

    @Transactional
    public CashTransaction addTransaction(Long registerId, String user, String type, BigDecimal amount, String category, String notes, Long orderId) {
        CashRegister r = registerRepository.findById(registerId).orElseThrow(() -> new AppException("Caixa não encontrado"));
        if (!r.isOpen()) throw new AppException("Caixa fechado");
        CashTransaction t = CashTransaction.builder()
                .register(r)
                .createdAt(LocalDateTime.now())
                .createdBy(user)
                .type(type)
                .amount(amount)
                .category(category)
                .notes(notes)
                .orderId(orderId)
                .build();
        if ("IN".equals(type)) r.setCurrentBalance(r.getCurrentBalance().add(amount));
        else r.setCurrentBalance(r.getCurrentBalance().subtract(amount));
        registerRepository.save(r);
        return transactionRepository.save(t);
    }

    public CashRegister getOpenRegister() {
        return registerRepository.findFirstByOpenTrue().orElse(null);
    }

    @Transactional
    public void removeTransactionsForOrder(Long orderId) {
        List<CashTransaction> txs = transactionRepository.findByOrderId(orderId);
        if (txs.isEmpty()) return;

        for (CashTransaction tx : txs) {
            CashRegister register = tx.getRegister();
            if (register == null) continue;
            if ("IN".equals(tx.getType())) {
                register.setCurrentBalance(register.getCurrentBalance().subtract(tx.getAmount()));
            } else {
                register.setCurrentBalance(register.getCurrentBalance().add(tx.getAmount()));
            }
            registerRepository.save(register);
        }
        transactionRepository.deleteByOrderId(orderId);
    }

    public List<CashTransaction> listTransactions(Long registerId) {
        return transactionRepository.findByRegisterIdOrderByCreatedAtDesc(registerId);
    }
}
