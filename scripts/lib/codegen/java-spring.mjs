/**
 * Java adapter（栈 C/D）：Spring Boot + JPA。
 *
 * 生成（<out>/api 下，包名 com.<slug>.api）：
 *   - pom.xml / application.yml（连接取根 .env 的 MYSQL_*）
 *   - ApiApplication / common.CrudController / entity.BaseEntity
 *   - entity/AdminUser + repository/AdminUserRepository（闸门账号）
 *   - config/{JwtUtil,SecurityConfig,JwtAuthFilter,PasswordEncoderConfig,SeedConfig}
 *   - controller/{AuthController,<E>Controller...,DashboardController?}
 *   - 每实体：entity/<E>.java + repository/<E>Repository.java + controller/<E>Controller.java
 *
 * 代码形态复用上轮已验证实现（commit 45a0131）；实体与字段全部来自 spec。
 */
import { resolve } from "node:path";
import { writeFileSafe, toJavaType, cap } from "./util.mjs";
import { resolveDbConnection } from "./util.mjs";

export function generateSpringJpa(ctx) {
  const { spec, stack, entities, outDir } = ctx;
  const apiDir = resolve(outDir, "api");
  const pkg = `com.${(spec.slug || "app").replace(/[^a-z0-9]/gi, "").toLowerCase() || "app"}.api`;
  const pkgPath = pkg.replace(/\./g, "/");
  // 派生字段声明（list 页的关联计数/关联名称），由 spec 描述、脚本不识业务
  const relations = spec.relations || [];
  const files = [];
  const w = (rel, content) => {
    // Java 源文件（src/main/java/<pkg>/...）的 package 声明须与子目录一致，否则编译失败
    const javaPrefix = `src/main/java/${pkgPath}/`;
    if (rel.startsWith(javaPrefix)) {
      const sub = rel.slice(javaPrefix.length, rel.lastIndexOf("/")).replace(/\//g, ".");
      if (sub) content = content.replace(`package ${pkg};`, `package ${pkg}.${sub};`);
    }
    writeFileSafe(resolve(apiDir, rel), content);
    files.push(`api/${rel}`);
  };
  const P = (rel) => `src/main/java/${pkgPath}/${rel}`;
  const pkgDecl = `package ${pkg};`;
  const hasDash = (spec.screens || []).some((s) => s.type === "dashboard");

  baseCrud();
  baseEntity();
  jwt();
  security();
  loginRequest();
  authController();
  pom();
  appYml();
  application();
  adminUserSupport();

  for (const e of entities) {
    entity(e);
    repository(e);
    controller(e);
  }
  seedConfig();
  if (hasDash) dashboard();

  return { files };

  // ———————————— 各部分生成 ————————————

  function baseCrud() {
    w(
      P("common/CrudController.java"),
      `${pkgDecl}

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;

/**
 * 通用 CRUD 控制器骨架：list / get / create / update / delete。
 * 子类注入对应 repository 并实现 toMap（响应字段）与 apply（写入字段）。
 */
public abstract class CrudController<T> {

  protected abstract JpaRepository<T, Long> repo();

  /** 实体 → 响应 Map */
  protected abstract Map<String, Object> toMap(T e);

  protected abstract T newEntity();

  protected abstract void apply(T e, Map<String, Object> body);

  @GetMapping
  public List<Map<String, Object>> list() {
    return repo().findAll().stream().map(this::toMap).toList();
  }

  @GetMapping("/{id}")
  public ResponseEntity<?> get(@PathVariable Long id) {
    return repo().findById(id)
        .<ResponseEntity<?>>map(e -> ResponseEntity.ok(toMap(e)))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PostMapping
  public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    T e = newEntity();
    apply(e, body);
    repo().save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @PutMapping("/{id}")
  public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
    java.util.Optional<T> found = repo().findById(id);
    if (found.isEmpty()) return ResponseEntity.notFound().build();
    T e = found.get();
    apply(e, body);
    repo().save(e);
    return ResponseEntity.ok(toMap(e));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(@PathVariable Long id) {
    if (!repo().existsById(id)) return ResponseEntity.notFound().build();
    repo().deleteById(id);
    return ResponseEntity.ok(Map.of("ok", true));
  }
}
`,
    );
  }

  function baseEntity() {
    w(
      P("entity/BaseEntity.java"),
      `${pkgDecl}

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@MappedSuperclass
public abstract class BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  void prePersist() {
    LocalDateTime now = LocalDateTime.now();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @PreUpdate
  void preUpdate() {
    this.updatedAt = LocalDateTime.now();
  }
}
`,
    );
  }

  function jwt() {
    w(
      P("config/JwtUtil.java"),
      `${pkgDecl}

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

@Component
public class JwtUtil {

  private final SecretKey key;
  private final long expiresInMillis;

  public JwtUtil(@Value("\${app.jwt.secret}") String secret,
                 @Value("\${app.jwt.expires-in}") String expiresIn) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expiresInMillis = parseExpires(expiresIn);
  }

  private static long parseExpires(String s) {
    String v = s.trim().toLowerCase();
    if (v.endsWith("d")) return Duration.ofDays(Long.parseLong(v.substring(0, v.length() - 1))).toMillis();
    if (v.endsWith("h")) return Duration.ofHours(Long.parseLong(v.substring(0, v.length() - 1))).toMillis();
    if (v.endsWith("m")) return Duration.ofMinutes(Long.parseLong(v.substring(0, v.length() - 1))).toMillis();
    return Duration.ofMillis(Long.parseLong(v)).toMillis();
  }

  public String issue(String subject) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(subject)
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusMillis(expiresInMillis)))
        .signWith(key)
        .compact();
  }

  public boolean validate(String token) {
    try {
      Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  public String subject(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject();
  }
}
`,
    );
  }

  function security() {
    w(
      P("config/SecurityConfig.java"),
      `${pkgDecl}

import ${pkg}.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SecurityConfig {

  private final JwtAuthFilter jwtAuthFilter;

  public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
    this.jwtAuthFilter = jwtAuthFilter;
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.csrf(csrf -> csrf.disable())
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/login").permitAll()
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .anyRequest().authenticated())
        .exceptionHandling(eh -> eh.authenticationEntryPoint((req, res, ex) -> {
          res.setStatus(401);
          res.setContentType("application/json;charset=UTF-8");
          res.getWriter().write("{\\\"message\\\":\\\"未登录或登录已过期\\\"}");
        }))
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean
  public WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*");
      }
    };
  }
}
`,
    );
    w(
      P("security/JwtAuthFilter.java"),
      `${pkgDecl}

import ${pkg}.config.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtUtil jwtUtil;

  public JwtAuthFilter(JwtUtil jwtUtil) {
    this.jwtUtil = jwtUtil;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    String token = header != null && header.startsWith("Bearer ") ? header.substring(7) : null;
    if (token != null && jwtUtil.validate(token)) {
      UsernamePasswordAuthenticationToken auth =
          new UsernamePasswordAuthenticationToken(jwtUtil.subject(token), null, List.of());
      SecurityContextHolder.getContext().setAuthentication(auth);
    }
    chain.doFilter(request, response);
  }
}
`,
    );
    w(
      P("config/PasswordEncoderConfig.java"),
      `${pkgDecl}

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordEncoderConfig {
  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}
`,
    );
  }

  function loginRequest() {
    w(
      P("dto/LoginRequest.java"),
      `${pkgDecl}

import lombok.Data;

@Data
public class LoginRequest {
  private String username;
  private String email;
  private String password;
}
`,
    );
  }

  function authController() {
    w(
      P("controller/AuthController.java"),
      `${pkgDecl}

import ${pkg}.config.JwtUtil;
import ${pkg}.dto.LoginRequest;
import ${pkg}.entity.AdminUser;
import ${pkg}.repository.AdminUserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AdminUserRepository users;
  private final JwtUtil jwtUtil;
  private final PasswordEncoder encoder;

  public AuthController(AdminUserRepository users, JwtUtil jwtUtil, PasswordEncoder encoder) {
    this.users = users;
    this.jwtUtil = jwtUtil;
    this.encoder = encoder;
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody LoginRequest req) {
    String key = req.getUsername() != null && !req.getUsername().isEmpty()
        ? req.getUsername() : req.getEmail();
    AdminUser user = key == null ? null : users.findByUsername(key).orElse(null);
    if (user == null && key != null) {
      user = users.findByEmail(key).orElse(null);
    }
    if (user == null || !encoder.matches(req.getPassword(), user.getPassword())) {
      return ResponseEntity.status(401).body(Map.of("message", "用户名或密码错误"));
    }
    if (!"active".equals(user.getStatus())) {
      return ResponseEntity.status(403).body(Map.of("message", "账号已禁用"));
    }
    String token = jwtUtil.issue(user.getUsername());
    String displayName = user.getName() == null ? "" : user.getName();
    return ResponseEntity.ok(Map.of(
        "token", token,
        "user", Map.of(
            "username", user.getUsername(),
            "name", displayName
        )
    ));
  }
}
`,
    );
  }

  function adminUserSupport() {
    w(
      P("entity/AdminUser.java"),
      `${pkgDecl}

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "admin_users")
public class AdminUser extends BaseEntity {

  @Column(nullable = false, unique = true, length = 190)
  private String email;

  @Column(nullable = false, unique = true, length = 100)
  private String username;

  @Column(nullable = false)
  private String password;

  @Column(length = 50)
  private String name;

  @Column(nullable = false, length = 20)
  private String status = "active";
}
`,
    );
    w(
      P("repository/AdminUserRepository.java"),
      `${pkgDecl}

import ${pkg}.entity.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {
  Optional<AdminUser> findByUsername(String username);

  Optional<AdminUser> findByEmail(String email);
}
`,
    );
  }

  function entity(e) {
    const fields = e.fields
      .map((f) => `  @Column(name = "${f.name}")\n  private ${toJavaType(f.type)} ${f.name};`)
      .join("\n\n");
    w(
      P(`entity/${e.name}.java`),
      `${pkgDecl}

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "${e.table}")
public class ${e.name} extends BaseEntity {

${fields}
}
`,
    );
  }

  function repository(e) {
    w(
      P(`repository/${e.name}Repository.java`),
      `${pkgDecl}

import ${pkg}.entity.${e.name};
import org.springframework.data.jpa.repository.JpaRepository;

public interface ${e.name}Repository extends JpaRepository<${e.name}, Long> {
}
`,
    );
  }

  function controller(e) {
    // 契约：toMap 必须返回 id（前端单条屏取 list[0] 后按 PUT /{id} 回写）
    const toMap = [
      `    m.put("id", e.getId());`,
      ...e.fields.map((f) => `    m.put("${f.name}", nz(e.get${cap(f.name)}()));`),
    ].join("\n");
    // 派生字段（spec.relations）：list 页的「医生数量」「医生姓名」等不落库，按关联实时算
    const rels = relations.filter((r) => cap(r.entity) === e.name);
    const relRepos = [...new Set(rels.map((r) => cap(r.target)))];
    const relLines = rels
      .map((r, i) => {
        const target = cap(r.target);
        const repoVar = `${target.toLowerCase()}Repo`;
        const src = `String src${i} = e.get${cap(r.sourceField)}() == null ? null : String.valueOf(e.get${cap(r.sourceField)}());`;
        if (r.kind === "count") {
          return `    long rel${i} = 0L;
    ${src}
    if (src${i} != null) {
      for (${target} t : ${repoVar}.findAll()) {
        if (src${i}.equals(String.valueOf(t.get${cap(r.targetField)}()))) rel${i}++;
      }
    }
    m.put("${r.field}", (int) rel${i});`;
        }
        return `    String rel${i} = "";
    ${src}
    if (src${i} != null) {
      for (${target} t : ${repoVar}.findAll()) {
        if (src${i}.equals(String.valueOf(t.get${cap(r.targetField)}()))) { rel${i} = nz(t.get${cap(r.valueField)}()); break; }
      }
    }
    m.put("${r.field}", rel${i});`;
      })
      .join("\n");
    const relImports = relRepos
      .map((t) => `import ${pkg}.entity.${t};\nimport ${pkg}.repository.${t}Repository;`)
      .join("\n");
    const ctorParams = [`${e.name}Repository repo`, ...relRepos.map((t) => `${t}Repository ${t.toLowerCase()}Repo`)].join(", ");
    const ctorAssign = [`    this.repo = repo;`, ...relRepos.map((t) => `    this.${t.toLowerCase()}Repo = ${t.toLowerCase()}Repo;`)].join("\n");
    const relFields = relRepos.map((t) => `  private final ${t}Repository ${t.toLowerCase()}Repo;`).join("\n");
    const apply = e.fields
      .map((f) => {
        const t = toJavaType(f.type);
        const g = `b.get("${f.name}")`;
        const conv =
          t === "Integer" ? `intOrNull(${g})`
          : t === "Double" ? `dblOrNull(${g})`
          : t === "Boolean" ? `boolOrNull(${g})`
          : t === "LocalDateTime" ? `dtOrNull(${g})`
          : `strOrNull(${g})`;
        return `    if (b.containsKey("${f.name}")) e.set${cap(f.name)}(${conv});`;
      })
      .join("\n");
    w(
      P(`controller/${e.name}Controller.java`),
      `${pkgDecl}

import ${pkg}.common.CrudController;
import ${pkg}.entity.${e.name};
import ${pkg}.repository.${e.name}Repository;
${relImports ? relImports + "\n" : ""}import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/${e.route}")
public class ${e.name}Controller extends CrudController<${e.name}> {

  private final ${e.name}Repository repo;
${relFields}

  public ${e.name}Controller(${ctorParams}) {
${ctorAssign}
  }

  @Override
  protected JpaRepository<${e.name}, Long> repo() {
    return repo;
  }

  @Override
  protected Map<String, Object> toMap(${e.name} e) {
    Map<String, Object> m = new LinkedHashMap<>();
${toMap}
${relLines}
    return m;
  }

  @Override
  protected ${e.name} newEntity() {
    return new ${e.name}();
  }

  @Override
  protected void apply(${e.name} e, Map<String, Object> b) {
${apply}
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
`,
    );
  }

  function seedConfig() {
    const params = [...entities.map((e) => `${e.name}Repository ${e.name.toLowerCase()}Repo`)].join(
      ",\n      ",
    );
    const blocks = entities
      .map((e) => {
        const rows = e.seedRows?.length
          ? e.seedRows
          : Array.from({ length: e.seedCount ?? 6 }, (_, i) =>
              Object.fromEntries(e.fields.map((f) => [f.name, `${e.name}示例${i + 1}`])),
            );
        const saves = rows
          .map(
            (r, i) => `      {
        ${e.name} row${i} = new ${e.name}();
${e.fields.map((f) => `        row${i}.set${cap(f.name)}(${seedLit(f.type, r[f.name])});`).join("\n")}
        ${e.name.toLowerCase()}Repo.save(row${i});
      }`,
          )
          .join("\n");
        return `      // —— ${e.name} ——
      if (${e.name.toLowerCase()}Repo.count() == 0) {
${saves}
      }`;
      })
      .join("\n\n");
    w(
      P("config/SeedConfig.java"),
      `${pkgDecl}

import ${pkg}.entity.AdminUser;
import ${pkg}.repository.AdminUserRepository;
${entities.map((e) => `import ${pkg}.entity.${e.name};\nimport ${pkg}.repository.${e.name}Repository;`).join("\n")}
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Seed：闸门账号 + 各实体种子数据（值来自 spec.entities[].seedRows 或占位） */
@Configuration
public class SeedConfig {

  @Bean
  ApplicationRunner seed(
      AdminUserRepository adminUsers,
      ${params},
      PasswordEncoder encoder,
      @Value("\${app.seed-admin.email}") String adminEmail,
      @Value("\${app.seed-admin.username}") String adminUsername,
      @Value("\${app.seed-admin.name:}") String adminName,
      @Value("\${app.seed-admin.password}") String adminPassword) {
    return args -> {
      if (adminUsers.count() == 0) {
        AdminUser admin = new AdminUser();
        admin.setEmail(adminEmail);
        admin.setUsername(adminUsername);
        admin.setPassword(encoder.encode(adminPassword));
        admin.setName(adminName == null || adminName.isEmpty() ? "管理员" : adminName);
        admin.setStatus("active");
        adminUsers.save(admin);
      }

${blocks}
    };
  }
}
`,
    );
  }

  /**
   * 仪表盘聚合：读 spec.dashboard 声明式生成（脚本不识业务数值，也不写死窗口/字段名）
   *
   * 声明语义：
   *   window: month | last7 | today | all
   *   op:     sum（求字段和）| diff（field − minusField）| count（实体计数 + where）
   *           | countDistinct（窗口内该字段去重计数 + where）
   *   times:  { entity, via, field } → 逐行乘关联实体数值字段（如挂号费）
   *   rates:  分子/分母取 metrics 的 key → 百分比字符串
   *   amounts: 同 sum/times，附加 prefix / grouped 输出货币串
   *   charts: groupBy "day"（窗口内逐日）或 { entity, via, field, labelEntity, labelField, labelMatch }
   *           （按关联实体字段分组，用 labelEntity.labelField 作标签）
   */
  function dashboard() {
    const d = spec.dashboard || {};
    const src = entities.find((e) => e.name === cap(d.entity));
    if (!src) return;
    const dateField = cap(d.dateField || "workDate");
    const metrics = d.metrics || [];
    const rates = d.rates || [];
    const amounts = d.amounts || [];
    const charts = d.charts || [];

    // —— 用到的关联实体 → repository 字段 ——
    const refEntities = new Set();
    const addRef = (n) => n && refEntities.add(cap(n));
    for (const m of metrics) {
      if (m.entity) addRef(m.entity);
      if (m.times) addRef(m.times.entity);
    }
    for (const a of amounts) if (a.times) addRef(a.times.entity);
    for (const c of charts) {
      if (c.times) addRef(c.times.entity);
      if (c.groupBy && typeof c.groupBy === "object") {
        addRef(c.groupBy.entity);
        addRef(c.groupBy.labelEntity);
      }
    }
    if (refEntities.has(src.name)) refEntities.delete(src.name);
    const refs = [...refEntities];
    const repoOf = (name) => (cap(name) === src.name ? `${src.name.toLowerCase()}Repo` : `${cap(name).toLowerCase()}Repo`);

    // —— times / groupBy 去重编号，供逐行表达式复用 ——
    const factorFns = [];
    const keyFns = [];
    const factorIdx = (t) => {
      const sig = JSON.stringify(t);
      let i = factorFns.findIndex((x) => JSON.stringify(x) === sig);
      if (i < 0) { factorFns.push(t); i = factorFns.length - 1; }
      return i;
    };
    const keyIdx = (g) => {
      const sig = JSON.stringify(g);
      let i = keyFns.findIndex((x) => JSON.stringify(x) === sig);
      if (i < 0) { keyFns.push(g); i = keyFns.length - 1; }
      return i;
    };

    const windowPred = (w, v) =>
      w === "month" ? `inMonth(${v}, ym)`
      : w === "last7" ? `inLast7(${v})`
      : w === "today" ? `isToday(${v})`
      : "true";
    const wherePred = (where, v) =>
      where
        ? Object.entries(where)
            .map(([k, val]) => `.filter(${v} -> ${JSON.stringify(String(val))}.equals(String.valueOf(${v}.get${cap(k)}())))`)
            .join("")
        : "";
    const rowFilter = (met) =>
      [met.window ? windowPred(met.window, "s") : null, met.where ? wherePred(met.where, "s").replace(/\.filter\(s -> /g, "").replace(/\)$/, "") : null]
        .filter(Boolean)
        .map((p) => `.filter(s -> ${p})`)
        .join("");
    const valueExpr = (met) => {
      const f = `num(s.get${cap(met.field)}())`;
      if (met.op === "diff") return `${f} - num(s.get${cap(met.minusField)}())`;
      return met.times ? `${f} * relValue${factorIdx(met.times)}(s.get${cap(met.times.via)}())` : f;
    };
    const sumExpr = (met) => `rows.stream()${rowFilter(met)}.mapToInt(s -> ${valueExpr(met)}).sum()`;

    // —— stats ——
    const statLines = metrics
      .map((met) => {
        const key = met.key;
        if (met.op === "count") {
          return `    m.put("${key}", (int) ${repoOf(met.entity)}.findAll().stream()${wherePred(met.where, "t")}.count());`;
        }
        if (met.op === "countDistinct") {
          return `    m.put("${key}", (int) rows.stream()${rowFilter(met)}.map(s -> s.get${cap(met.field)}()).distinct().count());`;
        }
        return `    int ${key} = ${sumExpr(met)};\n    m.put("${key}", ${key});`;
      })
      .join("\n");
    const rateLines = rates
      .map((r) => `    m.put("${r.key}", pct(${r.numerator}, ${r.denominator}));`)
      .join("\n");
    const amountLines = amounts
      .map((a) => `    long ${a.key} = ${sumExpr(a)};\n    m.put("${a.key}", money(${a.key}, ${JSON.stringify(a.prefix || "")}, ${a.grouped ? "true" : "false"}));`)
      .join("\n");

    // —— charts ——
    const chartLines = charts
      .map((ch) => {
        const key = ch.key;
        const agg = valueExpr({ ...ch, op: "sum" });
        if (ch.groupBy === "day") {
          return `    List<String> ${key}Labels = new ArrayList<>();
    List<Integer> ${key}Values = new ArrayList<>();
    for (int i = 6; i >= 0; i--) {
      LocalDate day = today.minusDays(i);
      final String dayStr = day.toString();
      ${key}Labels.add(day.format(MD));
      ${key}Values.add(rows.stream().filter(s -> dayStr.equals(s.get${dateField}())).mapToInt(s -> ${agg}).sum());
    }
    m.put("${key}", Map.of("labels", ${key}Labels, "values", ${key}Values));`;
        }
        const g = ch.groupBy;
        const labelRepo = repoOf(g.labelEntity || g.entity);
        const labelType = cap(g.labelEntity || g.entity);
        const matchField = cap(g.labelMatch || "id");
        return `    List<String> ${key}Labels = new ArrayList<>();
    List<Integer> ${key}Values = new ArrayList<>();
    for (${labelType} g : ${labelRepo}.findAll()) {
      final String gid = String.valueOf(g.get${matchField}());
      ${key}Labels.add(str(g.get${cap(g.labelField)}()));
      ${key}Values.add(rows.stream().filter(s -> ${windowPred(ch.window, "s")}).filter(s -> gid.equals(relKey${keyIdx(g)}(s.get${cap(g.via)}()))).mapToInt(s -> ${agg}).sum());
    }
    m.put("${key}", Map.of("labels", ${key}Labels, "values", ${key}Values));`;
      })
      .join("\n");

    // —— 关联取值/分组键 helper（逐行乘挂号费、按科室分组）——
    const helperFns = [
      ...factorFns.map(
        (t, i) => `  /** ${t.entity}.${t.field}（经 ${t.via} 关联） */
  private int relValue${i}(String relId) {
    if (relId == null) return 0;
    for (${cap(t.entity)} t : ${repoOf(t.entity)}.findAll()) {
      if (relId.equals(String.valueOf(t.getId()))) return num(t.get${cap(t.field)}());
    }
    return 0;
  }`,
      ),
      ...keyFns.map(
        (g, i) => `  /** ${g.entity}.${g.field}（经 ${g.via} 关联） */
  private String relKey${i}(String relId) {
    if (relId == null) return null;
    for (${cap(g.entity)} t : ${repoOf(g.entity)}.findAll()) {
      if (relId.equals(String.valueOf(t.getId()))) return String.valueOf(t.get${cap(g.field)}());
    }
    return null;
  }`,
      ),
    ].join("\n\n");

    const srcRepo = `${src.name.toLowerCase()}Repo`;
    const ctorParams = [`${src.name}Repository ${srcRepo}`, ...refs.map((r) => `${r}Repository ${r.toLowerCase()}Repo`)].join(", ");
    const ctorAssign = [`    this.${srcRepo} = ${srcRepo};`, ...refs.map((r) => `    this.${r.toLowerCase()}Repo = ${r.toLowerCase()}Repo;`)].join("\n");
    const refFields = refs.map((r) => `  private final ${r}Repository ${r.toLowerCase()}Repo;`).join("\n");
    const imports = [src.name, ...refs].map((n) => `import ${pkg}.entity.${n};\nimport ${pkg}.repository.${n}Repository;`).join("\n");

    w(
      P("controller/DashboardController.java"),
      `${pkgDecl}

${imports}
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

  private static final DateTimeFormatter MD = DateTimeFormatter.ofPattern("M/d");

  private final ${src.name}Repository ${srcRepo};
${refFields}

  public DashboardController(${ctorParams}) {
${ctorAssign}
  }

  /** KPI：按库内数据实时聚合（窗口/字段来自 spec.dashboard，禁止前端兜底造假） */
  @GetMapping("/stats")
  public Map<String, Object> stats() {
    LocalDate today = LocalDate.now();
    String ym = today.format(DateTimeFormatter.ofPattern("yyyy-MM"));
    List<${src.name}> rows = ${srcRepo}.findAll();
    Map<String, Object> m = new LinkedHashMap<>();
${statLines}
${rateLines}
${amountLines}
    return m;
  }

  /** 图表：窗口内逐日 / 按关联实体分组聚合 */
  @GetMapping("/charts")
  public Map<String, Object> charts() {
    LocalDate today = LocalDate.now();
    String ym = today.format(DateTimeFormatter.ofPattern("yyyy-MM"));
    List<${src.name}> rows = ${srcRepo}.findAll();
    Map<String, Object> m = new LinkedHashMap<>();
${chartLines}
    return m;
  }

  // —— 窗口 ——
  private boolean inMonth(${src.name} s, String ym) {
    return s.get${dateField}() != null && s.get${dateField}().startsWith(ym);
  }

  private boolean inLast7(${src.name} s) {
    LocalDate d = parseDate(s.get${dateField}());
    if (d == null) return false;
    LocalDate today = LocalDate.now();
    return !d.isBefore(today.minusDays(6)) && !d.isAfter(today);
  }

  private boolean isToday(${src.name} s) {
    return LocalDate.now().toString().equals(s.get${dateField}());
  }

  private LocalDate parseDate(String v) {
    if (v == null || v.isEmpty()) return null;
    try {
      return LocalDate.parse(v);
    } catch (Exception e) {
      return null;
    }
  }

  private int num(Integer v) {
    return v == null ? 0 : v;
  }

  private String str(Object v) {
    return v == null ? "" : String.valueOf(v);
  }

  private String pct(int part, int whole) {
    if (whole <= 0) return "0%";
    return Math.round(part * 1000f / whole) / 10f + "%";
  }

  private String money(long v, String prefix, boolean grouped) {
    return prefix + (grouped ? String.format("%,d", v) : String.valueOf(v));
  }
${helperFns ? "\n" + helperFns + "\n" : ""}}
`,
    );
  }

  function pom() {
    w(
      "pom.xml",
      `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.5</version>
    <relativePath/>
  </parent>

  <groupId>${pkg.replace(".api", "")}</groupId>
  <artifactId>api</artifactId>
  <version>1.0.0</version>
  <name>${spec.slug}-api</name>

  <properties>
    <java.version>17</java.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-api</artifactId>
      <version>0.12.6</version>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-impl</artifactId>
      <version>0.12.6</version>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-jackson</artifactId>
      <version>0.12.6</version>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>com.mysql</groupId>
      <artifactId>mysql-connector-j</artifactId>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>org.projectlombok</groupId>
      <artifactId>lombok</artifactId>
      <optional>true</optional>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
`,
    );
  }

  function appYml() {
    const slugSafe = (spec.slug || "app").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    w(
      "src/main/resources/application.yml",
      `# generated by scripts/gen-backend.mjs — project: ${spec.slug}
# 连接串取自仓库根 .env 预置（MYSQL_JDBC_URL / MYSQL_USER / MYSQL_PASSWORD），不使用 Docker
spring:
  datasource:
    url: \${MYSQL_JDBC_URL:jdbc:mysql://127.0.0.1:3306/${slugSafe}}
    username: \${MYSQL_USER:root}
    password: \${MYSQL_PASSWORD:}
  jpa:
    hibernate:
      ddl-auto: update
    open-in-view: false

app:
  jwt:
    secret: \${JWT_SECRET:change-me-in-dev}
    expires-in: \${JWT_EXPIRES_IN:7d}
  seed-admin:
    email: ${spec.seedAdmin?.email ?? ""}
    username: ${spec.seedAdmin?.username ?? spec.seedAdmin?.email ?? ""}
    name: ${spec.seedAdmin?.name ?? ""}
    password: ${spec.seedAdmin?.password ?? ""}
server:
  port: 3001
`,
    );
  }

  function application() {
    w(
      P("ApiApplication.java"),
      `${pkgDecl}

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(ApiApplication.class, args);
  }
}
`,
    );
  }
}

/** seed 值 → Java 字面量 */
/**
 * seed 值 → Java 字面量。额外支持相对日期写法 `{ "$dayOffset": -6 }`：
 * 种子里的日期若写成绝对值，仪表盘「本月/近 7 天」窗口会随运行日期漂移而全 0
 * （2026-09-27 事故：seed 钉死 2026-08-10 → 首页 KPI/折线全 0），故相对今天表达。
 */
function seedLit(type, v) {
  if (v && typeof v === "object" && v.$dayOffset !== undefined) {
    const n = Number(v.$dayOffset) || 0;
    if (type === "DateTime") return `LocalDate.now().plusDays(${n}).atStartOfDay()`;
    return `LocalDate.now().plusDays(${n}).toString()`;
  }
  return javaLit(type, v);
}

function javaLit(type, v) {
  if (v == null) return "null";
  switch (type) {
    case "Integer":
      return String(Number.parseInt(v, 10) || 0);
    case "Float":
    case "Decimal":
      return String(Number.parseFloat(v) || 0);
    case "Boolean":
      return String(Boolean(v));
    case "DateTime":
      return `LocalDateTime.parse(${JSON.stringify(String(v))})`;
    default:
      return JSON.stringify(String(v));
  }
}