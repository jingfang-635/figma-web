package com.sunshine.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "notifications")
public class Notification extends BaseEntity {

  @Column(nullable = false, length = 100)
  private String name;

  /** 微信模板 / 短信 */
  @Column(length = 30)
  private String type;

  @Column(length = 100)
  private String scene;

  /** enabled / disabled */
  @Column(nullable = false, length = 20)
  private String status = "enabled";
}