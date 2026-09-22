package com.sunshine.api.common;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;

/**
 * 通用 CRUD 控制器骨架：list / get / create / update / delete
 * 子类只需注入对应 repository 并实现 toMap（决定返回字段与关联展开）。
 */
public abstract class CrudController<T> {

  protected abstract JpaRepository<T, Long> repo();

  /** 实体 → 响应 Map；关联字段转平铺字段 */
  protected abstract Map<String, Object> toMap(T e);

  protected String label(T e) {
    return String.valueOf(e);
  }

  @GetMapping
  public List<Map<String, Object>> list() {
    return repo().findAll().stream().map(this::toMap).toList();
  }

  @GetMapping("/{id}")
  public ResponseEntity<?> get(@PathVariable Long id) {
    return repo().findById(id)
        .<ResponseEntity<?>>map(e -> ResponseEntity.ok(toMap(e)))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PostMapping
  public abstract ResponseEntity<?> create(@RequestBody Map<String, Object> body);

  @PutMapping("/{id}")
  public abstract ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body);

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(@PathVariable Long id) {
    if (!repo().existsById(id)) return ResponseEntity.notFound().build();
    repo().deleteById(id);
    return ResponseEntity.ok(Map.of("ok", true));
  }
}