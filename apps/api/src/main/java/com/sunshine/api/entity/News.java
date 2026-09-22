package com.sunshine.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "news")
public class News extends BaseEntity {

  /** 弹窗 maxLength 30，但列表存在更长标题，DB 放 200 */
  @Column(nullable = false, length = 200)
  private String title;

  @Column(length = 500)
  private String thumb;

  @Column(length = 500)
  private String cover;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "category_id")
  private NewsCategory category;

  /** article / video */
  @Column(nullable = false, length = 20)
  private String type = "article";

  @Column(length = 10000)
  private String content;
}