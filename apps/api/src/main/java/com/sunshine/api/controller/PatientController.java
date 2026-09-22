package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.Patient;
import com.sunshine.api.repository.PatientRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/patients")
public class PatientController extends CrudController<Patient> {

  private final PatientRepository repo;

  public PatientController(PatientRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<Patient, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Patient p) {
    return Map.of(
        "id", p.getId(),
        "name", p.getName(),
        "gender", nz(p.getGender()),
        "age", p.getAge() != null ? p.getAge() : 0,
        "phone", nz(p.getPhone()),
        "appointmentCount", p.getAppointmentCount() != null ? p.getAppointmentCount() : 0,
        "tags", nz(p.getTags()),
        "registeredAt", nz(p.getRegisteredAt()),
        "status", p.getStatus()
    );
  }

  @Override
  protected String label(Patient p) {
    return p.getName();
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    Patient p = new Patient();
    apply(p, body);
    repo.save(p);
    return ResponseEntity.ok(toMap(p));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    Patient p = repo.findById(id).orElse(null);
    if (p == null) return ResponseEntity.notFound().build();
    apply(p, body);
    repo.save(p);
    return ResponseEntity.ok(toMap(p));
  }

  private void apply(Patient p, Map<String, Object> b) {
    if (b.containsKey("name")) p.setName(str(b.get("name")));
    if (b.containsKey("gender")) p.setGender(str(b.get("gender")));
    if (b.containsKey("age")) p.setAge(intVal(b.get("age")));
    if (b.containsKey("phone")) p.setPhone(str(b.get("phone")));
    if (b.containsKey("appointmentCount")) p.setAppointmentCount(intVal(b.get("appointmentCount")));
    if (b.containsKey("tags")) p.setTags(str(b.get("tags")));
    if (b.containsKey("registeredAt")) p.setRegisteredAt(str(b.get("registeredAt")));
    if (b.containsKey("status")) p.setStatus(str(b.get("status")));
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