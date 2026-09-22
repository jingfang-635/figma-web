package com.sunshine.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "reviews")
public class Review extends BaseEntity {

  @Column(nullable = false, length = 50)
  private String patientName;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "doctor_id")
  private Doctor doctor;

  /** 1-5 */
  private Integer score;

  @Column(length = 500)
  private String content;

  /** shown / hidden */
  @Column(nullable = false, length = 20)
  private String status = "shown";

  /** yyyy-MM-dd */
  @Column(length = 10)
  private String reviewedAt;
}