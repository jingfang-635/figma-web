package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.NewsCategory;
import com.sunshine.api.repository.NewsCategoryRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/news-categories")
public class NewsCategoryController extends CrudController<NewsCategory> {

  private final NewsCategoryRepository repo;

  public NewsCategoryController(NewsCategoryRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<NewsCategory, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(NewsCategory e) {
    Map<String, Object> m = new LinkedHashMap<>();
        m.put("no", nz(e.getNo()));
        m.put("name", nz(e.getName()));
        m.put("cover", nz(e.getCover()));
        m.put("status", nz(e.getStatus()));
    return m;
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    NewsCategory e = new NewsCategory();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    NewsCategory e = repo.findById(id).orElse(null);
    if (e == null) return ResponseEntity.notFound().build();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  private void apply(NewsCategory e, Map<String, Object> b) {
    if (b.containsKey("no")) e.setNo(intOrNull(b.get("no")));
    if (b.containsKey("name")) e.setName(strOrNull(b.get("name")));
    if (b.containsKey("cover")) e.setCover(strOrNull(b.get("cover")));
    if (b.containsKey("status")) e.setStatus(strOrNull(b.get("status")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intOrNull(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
}
