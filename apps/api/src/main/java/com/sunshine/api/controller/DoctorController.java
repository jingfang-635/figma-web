package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.Doctor;
import com.sunshine.api.repository.DepartmentRepository;
import com.sunshine.api.repository.DoctorRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController extends CrudController<Doctor> {

  private final DoctorRepository repo;
  private final DepartmentRepository depts;

  public DoctorController(DoctorRepository repo, DepartmentRepository depts) {
    this.repo = repo;
    this.depts = depts;
  }

  @Override
  protected JpaRepository<Doctor, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Doctor d) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", d.getId());
    m.put("name", d.getName());
    m.put("title", nz(d.getTitle()));
    m.put("deptId", d.getDepartment() != null ? d.getDepartment().getId() : null);
    m.put("deptName", d.getDepartment() != null ? d.getDepartment().getName() : "");
    m.put("specialty", nz(d.getSpecialty()));
    m.put("avatar", nz(d.getAvatar()));
    m.put("years", d.getYears() != null ? d.getYears() : 0);
    m.put("goodRate", d.getGoodRate() != null ? d.getGoodRate() : 0);
    m.put("fee", d.getFee() != null ? d.getFee() : 0);
    m.put("status", d.getStatus());
    return m;
  }

  @Override
  protected String label(Doctor d) {
    return d.getName();
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    Doctor d = new Doctor();
    apply(d, body);
    repo.save(d);
    return ResponseEntity.ok(toMap(d));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    Doctor d = repo.findById(id).orElse(null);
    if (d == null) return ResponseEntity.notFound().build();
    apply(d, body);
    repo.save(d);
    return ResponseEntity.ok(toMap(d));
  }

  private void apply(Doctor d, Map<String, Object> b) {
    if (b.containsKey("name")) d.setName(str(b.get("name")));
    if (b.containsKey("title")) d.setTitle(str(b.get("title")));
    if (b.containsKey("deptId")) {
      Long deptId = longVal(b.get("deptId"));
      d.setDepartment(deptId == null ? null : depts.findById(deptId).orElse(null));
    }
    if (b.containsKey("specialty")) d.setSpecialty(str(b.get("specialty")));
    if (b.containsKey("avatar")) d.setAvatar(str(b.get("avatar")));
    if (b.containsKey("years")) d.setYears(intVal(b.get("years")));
    if (b.containsKey("goodRate")) d.setGoodRate(intVal(b.get("goodRate")));
    if (b.containsKey("fee")) d.setFee(intVal(b.get("fee")));
    if (b.containsKey("status")) d.setStatus(str(b.get("status")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String str(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intVal(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
  static Long longVal(Object o) { return o == null ? null : Long.valueOf(String.valueOf(o)); }
}