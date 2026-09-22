package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.Announcement;
import com.sunshine.api.repository.AnnouncementRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/announcements")
public class AnnouncementController extends CrudController<Announcement> {

  private final AnnouncementRepository repo;

  public AnnouncementController(AnnouncementRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<Announcement, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Announcement e) {
    Map<String, Object> m = new LinkedHashMap<>();
        m.put("title", nz(e.getTitle()));
        m.put("content", nz(e.getContent()));
        m.put("publishedAt", nz(e.getPublishedAt()));
        m.put("publisher", nz(e.getPublisher()));
    return m;
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    Announcement e = new Announcement();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    Announcement e = repo.findById(id).orElse(null);
    if (e == null) return ResponseEntity.notFound().build();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  private void apply(Announcement e, Map<String, Object> b) {
    if (b.containsKey("title")) e.setTitle(strOrNull(b.get("title")));
    if (b.containsKey("content")) e.setContent(strOrNull(b.get("content")));
    if (b.containsKey("publishedAt")) e.setPublishedAt(strOrNull(b.get("publishedAt")));
    if (b.containsKey("publisher")) e.setPublisher(strOrNull(b.get("publisher")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intOrNull(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
}
