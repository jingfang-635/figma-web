package com.sunshine.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "announcements")
public class Announcement extends BaseEntity {

  @Column(nullable = false, length = 200)
  private String title;

  @Column(length = 1000)
  private String content;

  /** yyyy-MM-dd HH:mm:ss */
  @Column(length = 20)
  private String publishedAt;

  private String publisher;
}