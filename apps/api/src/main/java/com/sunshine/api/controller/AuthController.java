package com.sunshine.api.controller;

import com.sunshine.api.config.JwtUtil;
import com.sunshine.api.dto.LoginRequest;
import com.sunshine.api.entity.User;
import com.sunshine.api.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final UserRepository users;
  private final JwtUtil jwtUtil;
  private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

  public AuthController(UserRepository users, JwtUtil jwtUtil) {
    this.users = users;
    this.jwtUtil = jwtUtil;
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody LoginRequest req) {
    User user = users.findByUsername(req.getUsername()).orElse(null);
    if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
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
            "name", user.getName(),
            "role", user.getRole() != null ? user.getRole().getName() : ""
        )
    ));
  }
}