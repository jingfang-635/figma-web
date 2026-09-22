package com.sunshine.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/** 机构信息：单例配置（id=1） */
@Data
@Entity
@Table(name = "org_settings")
public class OrgSetting {

  @Id
  private Long id = 1L;

  @Column(nullable = false, length = 100)
  private String name = "阳光医疗门诊";

  @Column(length = 30)
  private String phone;

  @Column(length = 100)
  private String subtitle;

  @Column(length = 50)
  private String hours;

  @Column(length = 200)
  private String address;

  @Column(length = 1000)
  private String intro;
}