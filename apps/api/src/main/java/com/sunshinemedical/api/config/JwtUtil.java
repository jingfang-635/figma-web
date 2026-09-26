package com.sunshinemedical.api.config;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

@Component
public class JwtUtil {

  private final SecretKey key;
  private final long expiresInMillis;

  public JwtUtil(@Value("${app.jwt.secret}") String secret,
                 @Value("${app.jwt.expires-in}") String expiresIn) {
    // jjwt 要求 HMAC-SHA 密钥 ≥256 位；配置过短时用 SHA-256 派生 32 字节，保证任何环境可启动
    byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
    if (raw.length < 32) {
      try {
        raw = MessageDigest.getInstance("SHA-256").digest(raw);
      } catch (Exception ignored) {
      }
    }
    this.key = Keys.hmacShaKeyFor(raw);
    this.expiresInMillis = parseExpires(expiresIn);
  }

  private static long parseExpires(String s) {
    String v = s.trim().toLowerCase();
    if (v.endsWith("d")) return Duration.ofDays(Long.parseLong(v.substring(0, v.length() - 1))).toMillis();
    if (v.endsWith("h")) return Duration.ofHours(Long.parseLong(v.substring(0, v.length() - 1))).toMillis();
    if (v.endsWith("m")) return Duration.ofMinutes(Long.parseLong(v.substring(0, v.length() - 1))).toMillis();
    return Duration.ofMillis(Long.parseLong(v)).toMillis();
  }

  public String issue(String subject) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(subject)
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusMillis(expiresInMillis)))
        .signWith(key)
        .compact();
  }

  public boolean validate(String token) {
    try {
      Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  public String subject(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject();
  }
}
