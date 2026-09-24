package com.sunshinemedical.api.controller;

import com.sunshinemedical.api.common.CrudController;
import com.sunshinemedical.api.entity.Doctor;
import com.sunshinemedical.api.entity.Schedule;
import com.sunshinemedical.api.repository.DoctorRepository;
import com.sunshinemedical.api.repository.ScheduleRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
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
  protected Map<String, Object> toMap(Schedule e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("doctorId", nz(e.getDoctorId()));
    m.put("doctorName", e.getDoctorId() == null || e.getDoctorId().isBlank() ? ""
        : doctors.findById(Long.valueOf(e.getDoctorId())).map(d -> nz(d.getName())).orElse(""));
    m.put("workDate", nz(e.getWorkDate()));
    m.put("slot", nz(e.getSlot()));
    m.put("quota", nz(e.getQuota()));
    m.put("booked", nz(e.getBooked()));
    m.put("status", nz(e.getStatus()));
    m.put("remark", nz(e.getRemark()));
    return m;
  }

  @Override
  protected Schedule newEntity() {
    return new Schedule();
  }

  @Override
  protected void apply(Schedule e, Map<String, Object> b) {
    if (b.containsKey("doctorId")) e.setDoctorId(strOrNull(b.get("doctorId")));
    if (b.containsKey("workDate")) e.setWorkDate(strOrNull(b.get("workDate")));
    if (b.containsKey("slot")) e.setSlot(strOrNull(b.get("slot")));
    if (b.containsKey("quota")) e.setQuota(intOrNull(b.get("quota")));
    if (b.containsKey("booked")) e.setBooked(intOrNull(b.get("booked")));
    if (b.containsKey("status")) e.setStatus(strOrNull(b.get("status")));
    if (b.containsKey("remark")) e.setRemark(strOrNull(b.get("remark")));
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
