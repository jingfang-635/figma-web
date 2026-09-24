package com.sunshinemedical.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "organizations")
public class Organization extends BaseEntity {

  @Column(name = "name")
  private String name;

  @Column(name = "phone")
  private String phone;

  @Column(name = "subtitle")
  private String subtitle;

  @Column(name = "hours")
  private String hours;

  @Column(name = "address")
  private String address;

  @Column(name = "intro")
  private String intro;
}
