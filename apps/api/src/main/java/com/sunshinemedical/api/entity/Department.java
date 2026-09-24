package com.sunshinemedical.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "departments")
public class Department extends BaseEntity {

  @Column(name = "name")
  private String name;

  @Column(name = "icon")
  private String icon;

  @Column(name = "description")
  private String description;

  @Column(name = "sort")
  private Integer sort;

  @Column(name = "status")
  private String status;
}
