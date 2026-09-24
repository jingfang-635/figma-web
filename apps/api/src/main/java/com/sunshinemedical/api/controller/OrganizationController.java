package com.sunshinemedical.api.controller;

import com.sunshinemedical.api.common.CrudController;
import com.sunshinemedical.api.entity.Organization;
import com.sunshinemedical.api.repository.OrganizationRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/organization")
public class OrganizationController extends CrudController<Organization> {

  private final OrganizationRepository repo;

  public OrganizationController(OrganizationRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<Organization, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Organization e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("name", nz(e.getName()));
    m.put("phone", nz(e.getPhone()));
    m.put("subtitle", nz(e.getSubtitle()));
    m.put("hours", nz(e.getHours()));
    m.put("address", nz(e.getAddress()));
    m.put("intro", nz(e.getIntro()));
    return m;
  }

  @Override
  protected Organization newEntity() {
    return new Organization();
  }

  @Override
  protected void apply(Organization e, Map<String, Object> b) {
    if (b.containsKey("name")) e.setName(strOrNull(b.get("name")));
    if (b.containsKey("phone")) e.setPhone(strOrNull(b.get("phone")));
    if (b.containsKey("subtitle")) e.setSubtitle(strOrNull(b.get("subtitle")));
    if (b.containsKey("hours")) e.setHours(strOrNull(b.get("hours")));
    if (b.containsKey("address")) e.setAddress(strOrNull(b.get("address")));
    if (b.containsKey("intro")) e.setIntro(strOrNull(b.get("intro")));
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
