package com.sunshinemedical.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "doctors")
public class Doctor extends BaseEntity {

  @Column(name = "name")
  private String name;

  @Column(name = "avatar")
  private String avatar;

  @Column(name = "title")
  private String title;

  @Column(name = "deptId")
  private String deptId;

  @Column(name = "specialty")
  private String specialty;

  @Column(name = "years")
  private Integer years;

  @Column(name = "goodRate")
  private Integer goodRate;

  @Column(name = "fee")
  private Integer fee;

  @Column(name = "status")
  private String status;
}
