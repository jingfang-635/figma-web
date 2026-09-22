package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.Role;
import com.sunshine.api.repository.RoleRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/roles")
public class RoleController extends CrudController<Role> {

  private final RoleRepository repo;

  public RoleController(RoleRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<Role, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Role e) {
    Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", nz(e.getName()));
        m.put("description", nz(e.getDescription()));
        m.put("status", nz(e.getStatus()));
    return m;
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    Role e = new Role();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    Role e = repo.findById(id).orElse(null);
    if (e == null) return ResponseEntity.notFound().build();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  private void apply(Role e, Map<String, Object> b) {
    if (b.containsKey("name")) e.setName(strOrNull(b.get("name")));
    if (b.containsKey("description")) e.setDescription(strOrNull(b.get("description")));
    if (b.containsKey("status")) e.setStatus(strOrNull(b.get("status")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intOrNull(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
}
