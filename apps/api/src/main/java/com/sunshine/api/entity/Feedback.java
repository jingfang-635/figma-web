package com.sunshine.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "feedbacks")
public class Feedback extends BaseEntity {

  @Column(nullable = false, length = 50)
  private String userName;

  @Column(nullable = false, length = 1000)
  private String content;

  @Column(length = 500)
  private String images;

  @Column(length = 30)
  private String contact;

  /** pending / processed */
  @Column(nullable = false, length = 20)
  private String status = "pending";

  @Column(length = 500)
  private String reply;

  /** yyyy-MM-dd */
  @Column(length = 10)
  private String submittedAt;
}