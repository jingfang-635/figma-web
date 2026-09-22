package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.NavItem;
import com.sunshine.api.repository.NavItemRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/nav-items")
public class NavItemController extends CrudController<NavItem> {

  private final NavItemRepository repo;

  public NavItemController(NavItemRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<NavItem, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(NavItem e) {
    Map<String, Object> m = new LinkedHashMap<>();
        m.put("no", nz(e.getNo()));
        m.put("title", nz(e.getTitle()));
        m.put("icon", nz(e.getIcon()));
        m.put("params", nz(e.getParams()));
        m.put("sort", nz(e.getSort()));
    return m;
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    NavItem e = new NavItem();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    NavItem e = repo.findById(id).orElse(null);
    if (e == null) return ResponseEntity.notFound().build();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  private void apply(NavItem e, Map<String, Object> b) {
    if (b.containsKey("no")) e.setNo(intOrNull(b.get("no")));
    if (b.containsKey("title")) e.setTitle(strOrNull(b.get("title")));
    if (b.containsKey("icon")) e.setIcon(strOrNull(b.get("icon")));
    if (b.containsKey("params")) e.setParams(strOrNull(b.get("params")));
    if (b.containsKey("sort")) e.setSort(intOrNull(b.get("sort")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intOrNull(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
}
