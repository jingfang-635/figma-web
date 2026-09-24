package com.sunshinemedical.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "admin_users")
public class AdminUser extends BaseEntity {

  @Column(nullable = false, unique = true, length = 190)
  private String email;

  @Column(nullable = false, unique = true, length = 100)
  private String username;

  @Column(nullable = false)
  private String password;

  @Column(length = 50)
  private String name;

  @Column(nullable = false, length = 20)
  private String status = "active";
}
