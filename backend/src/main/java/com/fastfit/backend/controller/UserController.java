package com.fastfit.backend.controller;

import com.fastfit.backend.dto.request.AuthRequests.*;
import com.fastfit.backend.dto.response.Responses.*;
import com.fastfit.backend.entity.User;
import com.fastfit.backend.entity.UserAddress;
import com.fastfit.backend.service.AuthService;
import com.fastfit.backend.service.UserAddressService;
import com.fastfit.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AuthService authService;
    private final UserAddressService addressService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getMe(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getMe(user)));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateMe(
            @AuthenticationPrincipal User user,
            @RequestBody UpdateProfileBody body) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateProfile(user, body.getName(), body.getPhone())));
    }

    @PostMapping("/me/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(user.getEmail(), req);
        return ResponseEntity.ok(ApiResponse.ok("Senha alterada com sucesso"));
    }

    @PatchMapping("/me/fcm-token")
    public ResponseEntity<Void> saveFcmToken(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {
        userService.saveFcmToken(user, body.get("token"));
        return ResponseEntity.ok().build();
    }


    // ── Addresses ──────────────────────────────────────────────────────────

    @GetMapping("/me/addresses")
    public ResponseEntity<ApiResponse<List<UserAddress>>> getAddresses(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(addressService.getAddresses(user)));
    }

    @PostMapping("/me/addresses")
    public ResponseEntity<ApiResponse<UserAddress>> createAddress(
            @AuthenticationPrincipal User user,
            @RequestBody AddressBody body) {
        UserAddress addr = buildAddress(body);
        return ResponseEntity.ok(ApiResponse.ok(addressService.create(user, addr)));
    }

    @PutMapping("/me/addresses/{id}")
    public ResponseEntity<ApiResponse<UserAddress>> updateAddress(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody AddressBody body) {
        return ResponseEntity.ok(ApiResponse.ok(addressService.update(user, id, buildAddress(body))));
    }

    @DeleteMapping("/me/addresses/{id}")
    public ResponseEntity<ApiResponse<String>> deleteAddress(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        addressService.delete(user, id);
        return ResponseEntity.ok(ApiResponse.ok("Endereço removido"));
    }

    @PatchMapping("/me/addresses/{id}/default")
    public ResponseEntity<ApiResponse<UserAddress>> setDefault(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(addressService.setDefault(user, id)));
    }

    private UserAddress buildAddress(AddressBody b) {
        UserAddress a = new UserAddress();
        a.setLabel(b.label); a.setStreet(b.street); a.setNumber(b.number);
        a.setComplement(b.complement); a.setNeighborhood(b.neighborhood);
        a.setCity(b.city); a.setState(b.state); a.setZipCode(b.zipCode);
        return a;
    }

    @Data static class UpdateProfileBody { String name; String phone; }

    @Data static class AddressBody {
        String label, street, number, complement, neighborhood, city, state, zipCode;
    }
}
