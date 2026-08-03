# Execution Workflow

Follow these step-by-step instructions to analyze services, run k6 load tests, and extract empirical proof of performance flaws.

---

## 1. Codebase & Route Discovery

### Spring Boot / Java Services
1. Search for `@RestController`, `@Controller`, `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`.
2. Extract path variables (`@PathVariable`), query parameters (`@RequestParam`), and body schemas (`@RequestBody`).
3. Check `application.yml` or `application.properties` for port settings (`server.port`), database pool configs (`spring.datasource.hikari.maximum-pool-size`), and thread pool settings (`server.tomcat.threads.max`).

### Node.js / Python / Go Services
- Express / NestJS: Search for `app.get`, `app.post`, `@Get()`, `@Post()`.
- FastAPI / Flask: Search for `@app.get`, `@app.post`, `@router.get`.

---

## 2. Stand Up Service & Health Check

### Launch Service
If `docker-compose.yml` exists:
```bash
docker-compose up -d --build
```
Otherwise, build and run using `docker build` and `docker run`.

### Verify Readiness
Ensure container services are healthy before launching tests:
```bash
# Spring Boot Actuator health check (if present)
curl -s http://localhost:8080/actuator/health

# Or check container status
docker ps
```

---

## 3. Run K6 via Docker

Execute the k6 script using `grafana/k6`:

### Linux / WSL (`--network="host"`)
```bash
docker run --rm -i --network="host" grafana/k6 run - < script.js
```

### Windows / macOS (`host.docker.internal`)
```bash
docker run --rm -i -e BASE_URL="http://host.docker.internal:8080" grafana/k6 run - < script.js
```

### Export Raw Metrics
```bash
docker run --rm -i -e BASE_URL="http://host.docker.internal:8080" grafana/k6 run --summary-export=results.json - < script.js
```

---

## 4. Extract Container Logs for Flaw Diagnosis

After k6 test completion, inspect container logs to detect unhandled exceptions and structural bottlenecks:
```bash
# Capture application container logs
docker logs --tail 200 <container_name_or_id> > app_errors.log

# Grep for taxonomy indicators
grep -iE "CannotGetJdbcConnectionException|LockTimeoutException|ConcurrentModificationException|OutOfMemoryError|Connection refused|Timeout" app_errors.log
```

---

## 5. Teardown
```bash
docker-compose down -v
```

---

## 6. Analysis & Summary Reporting

Generate a final report containing:
- **Throughput**: `http_reqs` (requests/sec)
- **Latency Distribution**: Average, `p(95)`, and `max` latency
- **Error Rate**: `http_req_failed` %
- **Uncovered Taxonomy Flaws**: Any DB connection timeouts, STW GC pauses, race conditions, or context bleed observed in metrics or logs.
