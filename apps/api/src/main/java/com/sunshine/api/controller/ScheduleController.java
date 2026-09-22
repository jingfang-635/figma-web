package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.Schedule;
import com.sunshine.api.repository.DoctorRepository;
import com.sunshine.api.repository.ScheduleRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/schedules")
public class ScheduleController extends CrudController<Schedule> {

  private final ScheduleRepository repo;
  private final DoctorRepository doctors;

  public ScheduleController(ScheduleRepository repo, DoctorRepository doctors) {
    this.repo = repo;
    this.doctors = doctors;
  }

  @Override
  protected JpaRepository<Schedule, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Schedule s) {
    return Map.of(
        "id", s.getId(),
        "doctorId", s.getDoctor() != null ? s.getDoctor().getId() : 0L,
        "doctorName", s.getDoctor() != null ? s.getDoctor().getName() : "",
        "deptName", s.getDoctor() != null && s.getDoctor().getDepartment() != null
            ? s.getDoctor().getDepartment().getName() : "",
        "date", s.getDate(),
        "slot", s.getSlot(),
        "quota", s.getQuota(),
        "booked", s.getBooked(),
        "status", s.getStatus(),
        "remark", nz(s.getRemark())
    );
  }

  @Override
  protected String label(Schedule s) {
    return s.getDoctor() != null ? s.getDoctor().getName() + " " + s.getDate() + " " + s.getSlot() : "排班";
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    Schedule s = new Schedule();
    apply(s, body);
    repo.save(s);
    return ResponseEntity.ok(toMap(s));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    Schedule s = repo.findById(id).orElse(null);
    if (s == null) return ResponseEntity.notFound().build();
    apply(s, body);
    repo.save(s);
    return ResponseEntity.ok(toMap(s));
  }

  private void apply(Schedule s, Map<String, Object> b) {
    if (b.containsKey("doctorId")) {
      Long id = longVal(b.get("doctorId"));
      s.setDoctor(id == null ? null : doctors.findById(id).orElse(null));
    }
    if (b.containsKey("date")) s.setDate(str(b.get("date")));
    if (b.containsKey("slot")) s.setSlot(str(b.get("slot")));
    if (b.containsKey("quota")) s.setQuota(intVal(b.get("quota")));
    if (b.containsKey("status")) s.setStatus(str(b.get("status")));
    if (b.containsKey("remark")) s.setRemark(str(b.get("remark")));
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

  static Long longVal(Object o) {
    return o == null ? null : Long.valueOf(String.valueOf(o));
  }
}