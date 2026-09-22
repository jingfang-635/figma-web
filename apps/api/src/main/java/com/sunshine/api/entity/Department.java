package com.sunshine.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "departments")
public class Department extends BaseEntity {

  @Column(nullable = false, length = 50)
  private String name;

  @Column(length = 255)
  private String description;

  @Column(length = 255)
  private String icon;

  private Integer sort;

  /** active / disabled */
  @Column(nullable = false, length = 20)
  private String status = "active";
}