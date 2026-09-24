package com.sunshinemedical.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "schedules")
public class Schedule extends BaseEntity {

  @Column(name = "doctorId")
  private String doctorId;

  @Column(name = "workDate")
  private String workDate;

  @Column(name = "slot")
  private String slot;

  @Column(name = "quota")
  private Integer quota;

  @Column(name = "booked")
  private Integer booked;

  @Column(name = "status")
  private String status;

  @Column(name = "remark")
  private String remark;
}
