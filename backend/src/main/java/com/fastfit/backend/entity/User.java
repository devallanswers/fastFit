package com.fastfit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User implements UserDetails {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    // nullable para usuários Firebase (sem senha local)
    @Column
    private String password;

    @Column
    private String phone;

    @Column(length = 512)
    private String fcmToken;

    // Firebase UID — null para usuários email/senha
    @Column(unique = true)
    private String firebaseUid;

    // Provedor: "email", "google.com", "apple.com"
    @Column
    @Builder.Default
    private String authProvider = "email";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean emailVerified = false;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (authProvider == null) authProvider = "email";
        if (password == null) password = "";
    }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
    @Override public String getUsername() { return email; }
    @Override public String getPassword() { return password != null ? password : ""; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return active; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() {
        // Firebase users: emailVerified=true, firebaseUid preenchido
        return active && (emailVerified || (firebaseUid != null && !firebaseUid.isBlank()));
    }

    public enum Role { USER, ADMIN }
}
