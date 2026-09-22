package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.Appointment;
import com.sunshine.api.repository.AppointmentRepository;
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
@RequestMapping("/api/appointments")
public class AppointmentController extends CrudController<Appointment> {

  private final AppointmentRepository repo;
  private final DepartmentRepository depts;
  private final DoctorRepository doctors;

  public AppointmentController(AppointmentRepository repo, DepartmentRepository depts, DoctorRepository doctors) {
    this.repo = repo;
    this.depts = depts;
    this.doctors = doctors;
  }

  @Override
  protected JpaRepository<Appointment, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Appointment a) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", a.getId());
    m.put("code", nz(a.getCode()));
    m.put("patientName", nz(a.getPatientName()));
    m.put("phone", nz(a.getPhone()));
    m.put("deptId", a.getDepartment() != null ? a.getDepartment().getId() : null);
    m.put("deptName", a.getDepartment() != null ? a.getDepartment().getName() : "");
    m.put("doctorId", a.getDoctor() != null ? a.getDoctor().getId() : null);
    m.put("doctorName", a.getDoctor() != null ? a.getDoctor().getName() : "");
    m.put("date", nz(a.getDate()));
    m.put("slot", nz(a.getSlot()));
    m.put("amount", a.getAmount() != null ? a.getAmount() : 0);
    m.put("status", nz(a.getStatus()));
    return m;
  }

  @Override
  protected String label(Appointment a) {
    return a.getCode();
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    Appointment a = new Appointment();
    apply(a, body);
    repo.save(a);
    return ResponseEntity.ok(toMap(a));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    Appointment a = repo.findById(id).orElse(null);
    if (a == null) return ResponseEntity.notFound().build();
    apply(a, body);
    repo.save(a);
    return ResponseEntity.ok(toMap(a));
  }

  private void apply(Appointment a, Map<String, Object> b) {
    if (b.containsKey("code")) a.setCode(str(b.get("code")));
    if (b.containsKey("patientName")) a.setPatientName(str(b.get("patientName")));
    if (b.containsKey("phone")) a.setPhone(str(b.get("phone")));
    if (b.containsKey("deptId")) {
      Long id = longVal(b.get("deptId"));
      a.setDepartment(id == null ? null : depts.findById(id).orElse(null));
    }
    if (b.containsKey("doctorId")) {
      Long id = longVal(b.get("doctorId"));
      a.setDoctor(id == null ? null : doctors.findById(id).orElse(null));
    }
    if (b.containsKey("date")) a.setDate(str(b.get("date")));
    if (b.containsKey("slot")) a.setSlot(str(b.get("slot")));
    if (b.containsKey("amount")) a.setAmount(intVal(b.get("amount")));
    if (b.containsKey("status")) a.setStatus(str(b.get("status")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String str(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intVal(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
  static Long longVal(Object o) { return o == null ? null : Long.valueOf(String.valueOf(o)); }
}