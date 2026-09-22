package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.Order;
import com.sunshine.api.repository.DepartmentRepository;
import com.sunshine.api.repository.DoctorRepository;
import com.sunshine.api.repository.OrderRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController extends CrudController<Order> {

  private final OrderRepository repo;
  private final DoctorRepository doctors;
  private final DepartmentRepository depts;

  public OrderController(OrderRepository repo, DoctorRepository doctors, DepartmentRepository depts) {
    this.repo = repo;
    this.doctors = doctors;
    this.depts = depts;
  }

  @Override
  protected JpaRepository<Order, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Order o) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", o.getId());
    m.put("code", nz(o.getCode()));
    m.put("patientName", nz(o.getPatientName()));
    m.put("doctorId", o.getDoctor() != null ? o.getDoctor().getId() : null);
    m.put("doctorName", o.getDoctor() != null ? o.getDoctor().getName() : "");
    m.put("deptId", o.getDepartment() != null ? o.getDepartment().getId() : null);
    m.put("deptName", o.getDepartment() != null ? o.getDepartment().getName() : "");
    m.put("amount", o.getAmount() != null ? o.getAmount() : 0);
    m.put("status", nz(o.getStatus()));
    m.put("paidAt", nz(o.getPaidAt()));
    m.put("payMethod", nz(o.getPayMethod()));
    return m;
  }

  @Override
  protected String label(Order o) {
    return o.getCode();
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    Order o = new Order();
    apply(o, body);
    repo.save(o);
    return ResponseEntity.ok(toMap(o));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    Order o = repo.findById(id).orElse(null);
    if (o == null) return ResponseEntity.notFound().build();
    apply(o, body);
    repo.save(o);
    return ResponseEntity.ok(toMap(o));
  }

  private void apply(Order o, Map<String, Object> b) {
    if (b.containsKey("code")) o.setCode(str(b.get("code")));
    if (b.containsKey("patientName")) o.setPatientName(str(b.get("patientName")));
    if (b.containsKey("doctorId")) {
      Long id = longVal(b.get("doctorId"));
      o.setDoctor(id == null ? null : doctors.findById(id).orElse(null));
    }
    if (b.containsKey("deptId")) {
      Long id = longVal(b.get("deptId"));
      o.setDepartment(id == null ? null : depts.findById(id).orElse(null));
    }
    if (b.containsKey("amount")) o.setAmount(intVal(b.get("amount")));
    if (b.containsKey("status")) o.setStatus(str(b.get("status")));
    if (b.containsKey("paidAt")) o.setPaidAt(str(b.get("paidAt")));
    if (b.containsKey("payMethod")) o.setPayMethod(str(b.get("payMethod")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String str(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intVal(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
  static Long longVal(Object o) { return o == null ? null : Long.valueOf(String.valueOf(o)); }
}