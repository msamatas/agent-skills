---
name: k6-load-tester
description: Analyzes codebases (Spring Boot / Java, Node.js Express, Python FastAPI, Go) to identify REST endpoints, generates k6 scripts for various load profiles & taxonomy flaw verification, and executes them against Dockerized services. Use when a project has a Dockerfile or docker-compose.yml and requires performance validation or flaw detection.
---

# K6 Load Tester

This skill automates the performance testing and structural flaw diagnosis lifecycle for REST services using k6 and Docker.

## Workflow

1. **Analyze Codebase & Routing Logic**:
   - **Spring Boot / Java**: Search for `@RestController`, `@Controller`, `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PathVariable`, `@RequestParam`, `@RequestBody`. Inspect `application.yml` for port and thread pool configurations (`server.port`, `server.tomcat.threads.max`, `hikari.maximum-pool-size`).
   - **Node.js / Python / Go**: Search for Express `app.get`, FastAPI `@app.get`, Gin/Fiber routes.
2. **Generate K6 Scripts**:
   - Use standard templates from `assets/k6-base-template.js` or `assets/k6-spring-auth-template.js`.
   - Incorporate `setup()` blocks for dynamic JWT/OAuth2 authentication if required.
   - Configure load profiles (`references/profiles.md`) or taxonomy verification profiles (`references/taxonomy-verification.md`).
3. **Stand Up Service & Health Check**:
   - Run `docker-compose up -d --build` (or `docker build` + `docker run`).
   - Verify service health via `curl -s http://localhost:8080/actuator/health` or `docker ps`.
4. **Execute Load Tests**:
   - Run k6 via Docker using `grafana/k6` image.
   - Pass configuration flags (e.g., `-e BASE_URL="http://host.docker.internal:8080"`).
5. **Inspect Logs & Diagnose Flaws**:
   - Extract container logs post-test (`docker logs`) to detect unhandled runtime exceptions (`CannotGetJdbcConnectionException`, `LockTimeoutException`, `ConcurrentModificationException`, `OutOfMemoryError`).
6. **Teardown & Reporting**:
   - Run `docker-compose down -v`.
   - Report throughput (`http_reqs`), latency (`p95`, `max`), error rates (`http_req_failed`), and identified structural flaws.

## Resources

- **Load Profiles & Flaw Detection**: See `references/profiles.md` for Smoke, Load, Stress, Spike, DB Starvation, ThreadLocal Bleed, and GC Pause configurations.
- **Taxonomy Verification Guide**: See `references/taxonomy-verification.md` for specific test strategies covering Concurrency, Resource Pools, DB Locks, JVM Degradation, and Distributed Systems.
- **Execution Orchestration**: See `references/workflow.md` for detailed Docker and k6 command sequences.
- **Base Templates**:
  - `assets/k6-base-template.js`: Unauthenticated REST endpoints.
  - `assets/k6-spring-auth-template.js`: Authenticated REST endpoints with token setup.

## Quality Standards & Flaw Detection

- **Isolation**: Always run tests in a dedicated network or environment.
- **Log Verification**: Never rely solely on HTTP status codes. Always scan application logs after high-concurrency runs for hidden exceptions.
- **Reporting**: Include p(95) latency, throughput, error rates, and identified taxonomy flaws in all summaries.
