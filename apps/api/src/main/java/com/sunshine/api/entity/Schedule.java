package com.sunshine.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "schedules")
public class Schedule extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "doctor_id", nullable = false)
  private Doctor doctor;

  /** yyyy-MM-dd */
  @Column(nullable = false, length = 10)
  private String date;

  /** am / pm */
  @Column(nullable = false, length = 8)
  private String slot;

  @Column(nullable = false)
  private Integer quota;

  @Column(nullable = false)
  private Integer booked = 0;

  /** open / full / stopped */
  @Column(nullable = false, length = 20)
  private String status = "open";

  @Column(length = 255)
  private String remark;
}