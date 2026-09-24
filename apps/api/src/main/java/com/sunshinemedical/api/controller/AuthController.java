package com.sunshinemedical.api.controller;

import com.sunshinemedical.api.config.JwtUtil;
import com.sunshinemedical.api.dto.LoginRequest;
import com.sunshinemedical.api.entity.AdminUser;
import com.sunshinemedical.api.repository.AdminUserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AdminUserRepository users;
  private final JwtUtil jwtUtil;
  private final PasswordEncoder encoder;

  public AuthController(AdminUserRepository users, JwtUtil jwtUtil, PasswordEncoder encoder) {
    this.users = users;
    this.jwtUtil = jwtUtil;
    this.encoder = encoder;
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody LoginRequest req) {
    String key = req.getUsername() != null && !req.getUsername().isEmpty()
        ? req.getUsername() : req.getEmail();
    AdminUser user = key == null ? null : users.findByUsername(key).orElse(null);
    if (user == null && key != null) {
      user = users.findByEmail(key).orElse(null);
    }
    if (user == null || !encoder.matches(req.getPassword(), user.getPassword())) {
      return ResponseEntity.status(401).body(Map.of("message", "用户名或密码错误"));
    }
    if (!"active".equals(user.getStatus())) {
      return ResponseEntity.status(403).body(Map.of("message", "账号已禁用"));
    }
    String token = jwtUtil.issue(user.getUsername());
    return ResponseEntity.ok(Map.of(
        "token", token,
        "user", Map.of(
            "username", user.getUsername(),
            "name", user.getName()
        )
    ));
  }
}
