package com.sunshine.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "appointment_rules")
public class AppointmentRule extends BaseEntity {

  private Integer advanceDays;

  /** 17:00 */
  @Column(length = 10)
  private String sameDayCutoff;

  @Column(length = 100)
  private String cancelRule;

  private Integer noshowLimit;
}