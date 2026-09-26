package com.fastfit.backend.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

public class AuthRequests {

    @Data
    public static class RegisterRequest {
        @NotBlank String name;
        @Email @NotBlank String email;
        @NotBlank @Size(min = 8) String password;
        @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Telefone inválido") String phone;
    }

    @Data
    public static class LoginRequest {
        @Email @NotBlank String email;
        @NotBlank String password;
    }

    @Data
    public static class ForgotPasswordRequest {
        @Email @NotBlank String email;
    }

    @Data
    public static class ResetPasswordRequest {
        @NotBlank String token;
        @NotBlank @Size(min = 8) String newPassword;
    }

    @Data
    public static class ChangePasswordRequest {
        @NotBlank String currentPassword;
        @NotBlank @Size(min = 8) String newPassword;
    }
}
