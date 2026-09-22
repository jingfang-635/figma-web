package com.sunshine.api.controller;

import com.sunshine.api.entity.AppointmentRule;
import com.sunshine.api.entity.OrgSetting;
import com.sunshine.api.repository.AppointmentRuleRepository;
import com.sunshine.api.repository.OrgSettingRepository;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SettingsController {

  private final OrgSettingRepository orgRepo;
  private final AppointmentRuleRepository ruleRepo;

  public SettingsController(OrgSettingRepository orgRepo, AppointmentRuleRepository ruleRepo) {
    this.orgRepo = orgRepo;
    this.ruleRepo = ruleRepo;
  }

  @GetMapping("/organization")
  public Map<String, Object> getOrg() {
    OrgSetting s = orgRepo.findById(1L).orElseGet(() -> orgRepo.save(new OrgSetting()));
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("name", s.getName());
    m.put("phone", nz(s.getPhone()));
    m.put("subtitle", nz(s.getSubtitle()));
    m.put("hours", nz(s.getHours()));
    m.put("address", nz(s.getAddress()));
    m.put("intro", nz(s.getIntro()));
    return m;
  }

  @PutMapping("/organization")
  public Map<String, Object> updateOrg(@RequestBody Map<String, Object> body) {
    OrgSetting s = orgRepo.findById(1L).orElseGet(() -> orgRepo.save(new OrgSetting()));
    if (body.containsKey("name")) s.setName(strOrNull(body.get("name")));
    if (body.containsKey("phone")) s.setPhone(strOrNull(body.get("phone")));
    if (body.containsKey("subtitle")) s.setSubtitle(strOrNull(body.get("subtitle")));
    if (body.containsKey("hours")) s.setHours(strOrNull(body.get("hours")));
    if (body.containsKey("address")) s.setAddress(strOrNull(body.get("address")));
    if (body.containsKey("intro")) s.setIntro(strOrNull(body.get("intro")));
    orgRepo.save(s);
    return getOrg();
  }

  @GetMapping("/appointment-rules")
  public Map<String, Object> getRule() {
    AppointmentRule r = ruleRepo.findFirstByOrderByIdAsc().orElseGet(() -> ruleRepo.save(new AppointmentRule()));
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", r.getId());
    m.put("advanceDays", r.getAdvanceDays());
    m.put("sameDayCutoff", r.getSameDayCutoff());
    m.put("cancelRule", r.getCancelRule());
    m.put("noshowLimit", r.getNoshowLimit());
    return m;
  }

  @PutMapping("/appointment-rules")
  public Map<String, Object> updateRule(@RequestBody Map<String, Object> body) {
    AppointmentRule r = ruleRepo.findFirstByOrderByIdAsc().orElseGet(() -> ruleRepo.save(new AppointmentRule()));
    if (body.containsKey("advanceDays")) r.setAdvanceDays(intOrNull(body.get("advanceDays")));
    if (body.containsKey("sameDayCutoff")) r.setSameDayCutoff(strOrNull(body.get("sameDayCutoff")));
    if (body.containsKey("cancelRule")) r.setCancelRule(strOrNull(body.get("cancelRule")));
    if (body.containsKey("noshowLimit")) r.setNoshowLimit(intOrNull(body.get("noshowLimit")));
    ruleRepo.save(r);
    return getRule();
  }

  static String nz(String s) { return s == null ? "" : s; }
  static String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intOrNull(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
}