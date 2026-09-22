package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.Department;
import com.sunshine.api.repository.DepartmentRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController extends CrudController<Department> {

  private final DepartmentRepository repo;

  public DepartmentController(DepartmentRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<Department, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Department d) {
    return Map.of(
        "id", d.getId(),
        "name", d.getName(),
        "description", nz(d.getDescription()),
        "icon", nz(d.getIcon()),
        "sort", d.getSort() != null ? d.getSort() : 0,
        "status", d.getStatus()
    );
  }

  @Override
  protected String label(Department d) {
    return d.getName();
  }

  @Override
  public ResponseEntity<?> create(@org.springframework.web.bind.annotation.RequestBody Map<String, Object> body) {
    Department d = new Department();
    apply(d, body);
    repo.save(d);
    return ResponseEntity.ok(toMap(d));
  }

  @Override
  public ResponseEntity<?> update(Long id, Map<String, Object> body) {
    Department d = repo.findById(id).orElse(null);
    if (d == null) return ResponseEntity.notFound().build();
    apply(d, body);
    repo.save(d);
    return ResponseEntity.ok(toMap(d));
  }

  private void apply(Department d, Map<String, Object> b) {
    if (b.containsKey("name")) d.setName(str(b.get("name")));
    if (b.containsKey("description")) d.setDescription(str(b.get("description")));
    if (b.containsKey("icon")) d.setIcon(str(b.get("icon")));
    if (b.containsKey("sort")) d.setSort(intVal(b.get("sort")));
    if (b.containsKey("status")) d.setStatus(str(b.get("status")));
  }

  static String nz(String s) {
    return s == null ? "" : s;
  }

  static String str(Object o) {
    return o == null ? null : String.valueOf(o);
  }

  static Integer intVal(Object o) {
    return o == null ? null : Integer.valueOf(String.valueOf(o));
  }
}