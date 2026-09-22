package com.sunshine.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "banners")
public class Banner extends BaseEntity {

  private Integer no;

  @Column(nullable = false, length = 50)
  private String position;

  @Column(length = 500)
  private String image;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "address_id")
  private Address link;

  @Column(length = 50)
  private String params;
}