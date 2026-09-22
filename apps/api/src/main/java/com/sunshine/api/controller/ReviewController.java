package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.Review;
import com.sunshine.api.repository.ReviewRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController extends CrudController<Review> {

  private final ReviewRepository repo;

  public ReviewController(ReviewRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<Review, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Review e) {
    Map<String, Object> m = new LinkedHashMap<>();
        m.put("patientName", nz(e.getPatientName()));
        m.put("score", nz(e.getScore()));
        m.put("content", nz(e.getContent()));
        m.put("status", nz(e.getStatus()));
        m.put("reviewedAt", nz(e.getReviewedAt()));
    return m;
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    Review e = new Review();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    Review e = repo.findById(id).orElse(null);
    if (e == null) return ResponseEntity.notFound().build();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  private void apply(Review e, Map<String, Object> b) {
    if (b.containsKey("patientName")) e.setPatientName(strOrNull(b.get("patientName")));
    if (b.containsKey("score")) e.setScore(intOrNull(b.get("score")));
    if (b.containsKey("content")) e.setContent(strOrNull(b.get("content")));
    if (b.containsKey("status")) e.setStatus(strOrNull(b.get("status")));
    if (b.containsKey("reviewedAt")) e.setReviewedAt(strOrNull(b.get("reviewedAt")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intOrNull(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
}
