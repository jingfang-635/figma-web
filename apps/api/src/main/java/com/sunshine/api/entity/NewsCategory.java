package com.sunshine.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "news_categories")
public class NewsCategory extends BaseEntity {

  private Integer no;

  @Column(nullable = false, length = 50)
  private String name;

  @Column(length = 500)
  private String cover;

  /** enabled / disabled */
  @Column(nullable = false, length = 20)
  private String status = "enabled";
}