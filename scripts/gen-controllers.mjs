#!/usr/bin/env node
/** 批量生成简单 CRUD 控制器（v2：无关联写回，Long 字段跳过 apply） */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const outDir = resolve(root, "apps/api/src/main/java/com/sunshine/api/controller");
mkdirSync(outDir, { recursive: true });

/** [Controller, Entity, Route, fields] */
const SIMPLE = [
  ["NotificationController", "Notification", "notifications", [
    ["name", "String"], ["type", "String"], ["scene", "String"], ["status", "String"]]],
  ["AddressController", "Address", "addresses", [
    ["no", "Integer"], ["name", "String"], ["url", "String"]]],
  ["BannerController", "Banner", "banners", [
    ["no", "Integer"], ["position", "String"], ["image", "String"], ["params", "String"]]],
  ["AnnouncementController", "Announcement", "announcements", [
    ["title", "String"], ["content", "String"], ["publishedAt", "String"], ["publisher", "String"]]],
  ["NewsController", "News", "news", [
    ["title", "String"], ["thumb", "String"], ["cover", "String"], ["type", "String"]]],
  ["NewsCategoryController", "NewsCategory", "news-categories", [
    ["no", "Integer"], ["name", "String"], ["cover", "String"], ["status", "String"]]],
  ["NavItemController", "NavItem", "nav-items", [
    ["no", "Integer"], ["title", "String"], ["icon", "String"], ["params", "String"], ["sort", "Integer"]]],
  ["FeedbackController", "Feedback", "feedbacks", [
    ["userName", "String"], ["content", "String"], ["images", "String"], ["contact", "String"], ["status", "String"], ["reply", "String"], ["submittedAt", "String"]]],
  ["ReviewController", "Review", "reviews", [
    ["patientName", "String"], ["score", "Integer"], ["content", "String"], ["status", "String"], ["reviewedAt", "String"]]],
  ["UserController", "User", "users", [
    ["username", "String"], ["password", "String"], ["name", "String"], ["phone", "String"], ["status", "String"]]],
  ["RoleController", "Role", "roles", [
    ["name", "String"], ["description", "String"], ["status", "String"]]],
  ["OperationLogController", "OperationLog", "operation-logs", [
    ["operator", "String"], ["content", "String"], ["ip", "String"], ["operatedAt", "String"]]],
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function gen([ctrl, entity, route, fields]) {
  const toMap = fields.map(([f, t]) => `        m.put("${f}", nz(e.get${cap(f)}()));`).join("\n");
  const apply = fields.map(([f, t]) =>
    `    if (b.containsKey("${f}")) e.set${cap(f)}(${t === "Integer" ? "intOrNull" : "strOrNull"}(b.get("${f}")));`
  ).join("\n");

  return `package com.sunshine.api.controller;

import com.sunshine.api.common.CrudController;
import com.sunshine.api.entity.${entity};
import com.sunshine.api.repository.${entity}Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/${route}")
public class ${ctrl} extends CrudController<${entity}> {

  private final ${entity}Repository repo;

  public ${ctrl}(${entity}Repository repo) {
    this.repo = repo;
  }

  @Override
  protected JpaRepository<${entity}, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(${entity} e) {
    Map<String, Object> m = new LinkedHashMap<>();
${toMap}
    return m;
  }

  @Override
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    ${entity} e = new ${entity}();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @Override
  public ResponseEntity<?> update(Long id, @RequestBody Map<String, Object> body) {
    ${entity} e = repo.findById(id).orElse(null);
    if (e == null) return ResponseEntity.notFound().build();
    apply(e, body);
    repo.save(e);
    return ResponseEntity.ok(toMap(e));
  }

  private void apply(${entity} e, Map<String, Object> b) {
${apply}
  }

  static String nz(Object o) { return o == null ? "" : String.valueOf(o); }
  static String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }
  static Integer intOrNull(Object o) { return o == null ? null : Integer.valueOf(String.valueOf(o)); }
}
`;
}

let n = 0;
for (const def of SIMPLE) {
  writeFileSync(resolve(outDir, `${def[0]}.java`), gen(def), "utf8");
  n++;
}
console.log(`generated ${n} controllers -> ${outDir}`);