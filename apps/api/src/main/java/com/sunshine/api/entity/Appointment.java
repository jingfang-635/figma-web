package com.sunshine.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "appointments")
public class Appointment extends BaseEntity {

  @Column(nullable = false, length = 20)
  private String code;

  @Column(nullable = false, length = 50)
  private String patientName;

  @Column(length = 20)
  private String phone;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "dept_id")
  private Department department;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "doctor_id")
  private Doctor doctor;

  /** yyyy-MM-dd */
  @Column(nullable = false, length = 10)
  private String date;

  /** 09:00-09:30 */
  @Column(length = 20)
  private String slot;

  private Integer amount;

  /** pending / visited / cancelled */
  @Column(nullable = false, length = 20)
  private String status = "pending";
}