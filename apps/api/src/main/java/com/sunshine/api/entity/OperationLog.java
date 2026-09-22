package com.sunshine.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "operation_logs")
public class OperationLog extends BaseEntity {

  @Column(nullable = false, length = 50)
  private String operator;

  @Column(nullable = false, length = 500)
  private String content;

  @Column(length = 50)
  private String ip;

  /** yyyy-MM-dd HH:mm:ss */
  @Column(length = 20)
  private String operatedAt;
}