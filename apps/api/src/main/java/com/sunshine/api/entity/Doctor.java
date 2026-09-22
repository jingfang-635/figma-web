package com.sunshine.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "doctors")
public class Doctor extends BaseEntity {

  @Column(nullable = false, length = 50)
  private String name;

  /** 主任医师 / 副主任医师 / 主治医师 ... */
  @Column(length = 50)
  private String title;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "dept_id")
  private Department department;

  @Column(length = 500)
  private String specialty;

  @Column(length = 255)
  private String avatar;

  private Integer years;

  private Integer goodRate;

  private Integer fee;

  /** active / paused */
  @Column(nullable = false, length = 20)
  private String status = "active";
}