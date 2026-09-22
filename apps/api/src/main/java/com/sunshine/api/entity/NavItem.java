package com.sunshine.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "nav_items")
public class NavItem extends BaseEntity {

  private Integer no;

  @Column(nullable = false, length = 50)
  private String title;

  @Column(length = 50)
  private String icon;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "address_id")
  private Address link;

  @Column(length = 100)
  private String params;

  private Integer sort;
}