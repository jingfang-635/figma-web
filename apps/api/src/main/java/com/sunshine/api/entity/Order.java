package com.sunshine.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "orders")
public class Order extends BaseEntity {

  @Column(nullable = false, length = 20)
  private String code;

  @Column(nullable = false, length = 50)
  private String patientName;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "doctor_id")
  private Doctor doctor;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "dept_id")
  private Department department;

  /** 分存储 */
  private Integer amount;

  /** paid / refunded */
  @Column(nullable = false, length = 20)
  private String status = "paid";

  /** yyyy-MM-dd HH:mm:ss */
  @Column(length = 20)
  private String paidAt;

  /** 微信支付 / 支付宝 */
  @Column(length = 30)
  private String payMethod;
}