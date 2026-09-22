package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.OperationLog;
import com.sunshine.api.repository.OperationLogRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/operation-logs")
public class OperationLogController extends CrudController<OperationLog> {

  private final OperationLogRepository repo;

  public OperationLogController(OperationLogRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<OperationLog, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(OperationLog e) {
    Map<String, Object> m = new LinkedHashMap<>();
        m.put("operator", nz(e.getOperator()));
        m.put("content", nz(e.getContent()));
        m.put("ip", nz(e.getIp()));
        m.put("operatedAt", nz(e.getOperatedAt()));
    return m;
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    OperationLog e = new OperationLog();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    OperationLog e = repo.findById(id).orElse(null);
    if (e == null) return ResponseEntity.notFound().build();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  private void apply(OperationLog e, Map<String, Object> b) {
    if (b.containsKey("operator")) e.setOperator(strOrNull(b.get("operator")));
    if (b.containsKey("content")) e.setContent(strOrNull(b.get("content")));
    if (b.containsKey("ip")) e.setIp(strOrNull(b.get("ip")));
    if (b.containsKey("operatedAt")) e.setOperatedAt(strOrNull(b.get("operatedAt")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intOrNull(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
}
