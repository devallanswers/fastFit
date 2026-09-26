package com.fastfit.backend.service;

import com.fastfit.backend.entity.User;
import com.fastfit.backend.entity.UserAddress;
import com.fastfit.backend.exception.AppException;
import com.fastfit.backend.repository.UserAddressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserAddressService {

    private final UserAddressRepository addressRepository;

    public List<UserAddress> getAddresses(User user) {
        return addressRepository.findByUserIdOrderByIsDefaultDescIdAsc(user.getId());
    }

    @Transactional
    public UserAddress create(User user, UserAddress req) {
        if (addressRepository.countByUserId(user.getId()) >= 3) {
            throw new AppException("Limite de 3 endereços atingido");
        }
        req.setUser(user);
        if (addressRepository.countByUserId(user.getId()) == 0) {
            req.setDefault(true);
        }
        return addressRepository.save(req);
    }

    @Transactional
    public UserAddress update(User user, Long id, UserAddress req) {
        UserAddress address = addressRepository.findById(id)
                .orElseThrow(() -> new AppException("Endereço não encontrado"));
        if (!address.getUser().getId().equals(user.getId())) {
            throw new AppException("Endereço não pertence ao usuário");
        }
        address.setLabel(req.getLabel());
        address.setStreet(req.getStreet());
        address.setNumber(req.getNumber());
        address.setComplement(req.getComplement());
        address.setNeighborhood(req.getNeighborhood());
        address.setCity(req.getCity());
        address.setState(req.getState());
        address.setZipCode(req.getZipCode());
        return addressRepository.save(address);
    }

    @Transactional
    public void delete(User user, Long id) {
        UserAddress address = addressRepository.findById(id)
                .orElseThrow(() -> new AppException("Endereço não encontrado"));
        if (!address.getUser().getId().equals(user.getId())) {
            throw new AppException("Endereço não pertence ao usuário");
        }
        addressRepository.delete(address);
        // se era o default, torna o próximo o default
        List<UserAddress> remaining = addressRepository.findByUserIdOrderByIsDefaultDescIdAsc(user.getId());
        if (!remaining.isEmpty() && remaining.stream().noneMatch(UserAddress::isDefault)) {
            remaining.get(0).setDefault(true);
            addressRepository.save(remaining.get(0));
        }
    }

    @Transactional
    public UserAddress setDefault(User user, Long id) {
        List<UserAddress> all = addressRepository.findByUserIdOrderByIsDefaultDescIdAsc(user.getId());
        all.forEach(a -> a.setDefault(false));
        addressRepository.saveAll(all);
        UserAddress address = all.stream().filter(a -> a.getId().equals(id))
                .findFirst().orElseThrow(() -> new AppException("Endereço não encontrado"));
        address.setDefault(true);
        return addressRepository.save(address);
    }
}
