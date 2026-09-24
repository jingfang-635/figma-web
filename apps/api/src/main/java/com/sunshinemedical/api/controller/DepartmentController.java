package com.sunshinemedical.api.controller;

import com.sunshinemedical.api.common.CrudController;
import com.sunshinemedical.api.entity.Department;
import com.sunshinemedical.api.repository.DepartmentRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
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
  protected Map<String, Object> toMap(Department e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("name", nz(e.getName()));
    m.put("icon", nz(e.getIcon()));
    m.put("description", nz(e.getDescription()));
    m.put("sort", nz(e.getSort()));
    m.put("status", nz(e.getStatus()));
    return m;
  }

  @Override
  protected Department newEntity() {
    return new Department();
  }

  @Override
  protected void apply(Department e, Map<String, Object> b) {
    if (b.containsKey("name")) e.setName(strOrNull(b.get("name")));
    if (b.containsKey("icon")) e.setIcon(strOrNull(b.get("icon")));
    if (b.containsKey("description")) e.setDescription(strOrNull(b.get("description")));
    if (b.containsKey("sort")) e.setSort(intOrNull(b.get("sort")));
    if (b.containsKey("status")) e.setStatus(strOrNull(b.get("status")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intOrNull(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
  static Double dblOrNull(Object o) { return o == null ? null : Double.valueOf(String.valueOf(o)); }
  static Boolean boolOrNull(Object o) { return o == null ? null : Boolean.valueOf(String.valueOf(o)); }
  static LocalDateTime dtOrNull(Object o) {
    return o == null ? null : LocalDateTime.parse(String.valueOf(o));
  }
}
