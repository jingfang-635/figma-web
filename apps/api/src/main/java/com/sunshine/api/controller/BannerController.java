package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.Banner;
import com.sunshine.api.repository.BannerRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/banners")
public class BannerController extends CrudController<Banner> {

  private final BannerRepository repo;

  public BannerController(BannerRepository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<Banner, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(Banner e) {
    Map<String, Object> m = new LinkedHashMap<>();
        m.put("no", nz(e.getNo()));
        m.put("position", nz(e.getPosition()));
        m.put("image", nz(e.getImage()));
        m.put("params", nz(e.getParams()));
    return m;
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    Banner e = new Banner();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    Banner e = repo.findById(id).orElse(null);
    if (e == null) return ResponseEntity.notFound().build();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  private void apply(Banner e, Map<String, Object> b) {
    if (b.containsKey("no")) e.setNo(intOrNull(b.get("no")));
    if (b.containsKey("position")) e.setPosition(strOrNull(b.get("position")));
    if (b.containsKey("image")) e.setImage(strOrNull(b.get("image")));
    if (b.containsKey("params")) e.setParams(strOrNull(b.get("params")));
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intOrNull(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
}
