package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.News;
import com.sunshine.api.repository.NewsRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/news")
public class NewsController extends CrudController<News> {

  private final NewsRepository repo;

  public NewsController(NewsRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<News, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(News e) {
    Map<String, Object> m = new LinkedHashMap<>();
        m.put("title", nz(e.getTitle()));
        m.put("thumb", nz(e.getThumb()));
        m.put("cover", nz(e.getCover()));
        m.put("type", nz(e.getType()));
    return m;
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    News e = new News();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    News e = repo.findById(id).orElse(null);
    if (e == null) return ResponseEntity.notFound().build();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  private void apply(News e, Map<String, Object> b) {
    if (b.containsKey("title")) e.setTitle(strOrNull(b.get("title")));
    if (b.containsKey("thumb")) e.setThumb(strOrNull(b.get("thumb")));
    if (b.containsKey("cover")) e.setCover(strOrNull(b.get("cover")));
    if (b.containsKey("type")) e.setType(strOrNull(b.get("type")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intOrNull(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
}
