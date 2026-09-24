package com.sunshinemedical.api.common;

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
 * 通用 CRUD 控制器骨架：list / get / create / update / delete。
 * 子类注入对应 repository 并实现 toMap（响应字段）与 apply（写入字段）。
 */
public abstract class CrudController<T> {

  protected abstract JpaRepository<T, Long> repo();

  /** 实体 → 响应 Map */
  protected abstract Map<String, Object> toMap(T e);

  protected abstract T newEntity();

  protected abstract void apply(T e, Map<String, Object> body);

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
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    T e = newEntity();
    apply(e, body);
    repo().save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @PutMapping("/{id}")
  public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
    java.util.Optional<T> found = repo().findById(id);
    if (found.isEmpty()) return ResponseEntity.notFound().build();
    T e = found.get();
    apply(e, body);
    repo().save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(@PathVariable Long id) {
    if (!repo().existsById(id)) return ResponseEntity.notFound().build();
    repo().deleteById(id);
    return ResponseEntity.ok(Map.of("ok", true));
  }
}
