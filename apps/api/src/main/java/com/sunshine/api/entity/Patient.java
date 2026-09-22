package com.sunshine.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "patients")
public class Patient extends BaseEntity {

  @Column(nullable = false, length = 50)
  private String name;

  /** 男 / 女 */
  @Column(length = 10)
  private String gender;

  private Integer age;

  @Column(length = 20)
  private String phone;

  private Integer appointmentCount;

  /** 逗号分隔：慢性病患者 / VIP / 黑名单 */
  @Column(length = 255)
  private String tags;

  /** normal / blocked */
  @Column(nullable = false, length = 20)
  private String status = "normal";

  /** yyyy-MM-dd */
  @Column(length = 10)
  private String registeredAt;
}