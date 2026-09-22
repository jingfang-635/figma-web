package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.Feedback;
import com.sunshine.api.repository.FeedbackRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/feedbacks")
public class FeedbackController extends CrudController<Feedback> {

  private final FeedbackRepository repo;

  public FeedbackController(FeedbackRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<Feedback, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Feedback e) {
    Map<String, Object> m = new LinkedHashMap<>();
        m.put("userName", nz(e.getUserName()));
        m.put("content", nz(e.getContent()));
        m.put("images", nz(e.getImages()));
        m.put("contact", nz(e.getContact()));
        m.put("status", nz(e.getStatus()));
        m.put("reply", nz(e.getReply()));
        m.put("submittedAt", nz(e.getSubmittedAt()));
    return m;
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    Feedback e = new Feedback();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    Feedback e = repo.findById(id).orElse(null);
    if (e == null) return ResponseEntity.notFound().build();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  private void apply(Feedback e, Map<String, Object> b) {
    if (b.containsKey("userName")) e.setUserName(strOrNull(b.get("userName")));
    if (b.containsKey("content")) e.setContent(strOrNull(b.get("content")));
    if (b.containsKey("images")) e.setImages(strOrNull(b.get("images")));
    if (b.containsKey("contact")) e.setContact(strOrNull(b.get("contact")));
    if (b.containsKey("status")) e.setStatus(strOrNull(b.get("status")));
    if (b.containsKey("reply")) e.setReply(strOrNull(b.get("reply")));
    if (b.containsKey("submittedAt")) e.setSubmittedAt(strOrNull(b.get("submittedAt")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intOrNull(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
}
