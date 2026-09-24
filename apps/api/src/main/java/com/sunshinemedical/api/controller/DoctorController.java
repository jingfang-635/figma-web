package com.sunshinemedical.api.controller;

import com.sunshinemedical.api.common.CrudController;
import com.sunshinemedical.api.entity.Doctor;
import com.sunshinemedical.api.repository.DoctorRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController extends CrudController<Doctor> {

  private final DoctorRepository repo;

  public DoctorController(DoctorRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<Doctor, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Doctor e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("name", nz(e.getName()));
    m.put("avatar", nz(e.getAvatar()));
    m.put("title", nz(e.getTitle()));
    m.put("deptId", nz(e.getDeptId()));
    m.put("specialty", nz(e.getSpecialty()));
    m.put("years", nz(e.getYears()));
    m.put("goodRate", nz(e.getGoodRate()));
    m.put("fee", nz(e.getFee()));
    m.put("status", nz(e.getStatus()));
    return m;
  }

  @Override
  protected Doctor newEntity() {
    return new Doctor();
  }

  @Override
  protected void apply(Doctor e, Map<String, Object> b) {
    if (b.containsKey("name")) e.setName(strOrNull(b.get("name")));
    if (b.containsKey("avatar")) e.setAvatar(strOrNull(b.get("avatar")));
    if (b.containsKey("title")) e.setTitle(strOrNull(b.get("title")));
    if (b.containsKey("deptId")) e.setDeptId(strOrNull(b.get("deptId")));
    if (b.containsKey("specialty")) e.setSpecialty(strOrNull(b.get("specialty")));
    if (b.containsKey("years")) e.setYears(intOrNull(b.get("years")));
    if (b.containsKey("goodRate")) e.setGoodRate(intOrNull(b.get("goodRate")));
    if (b.containsKey("fee")) e.setFee(intOrNull(b.get("fee")));
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
