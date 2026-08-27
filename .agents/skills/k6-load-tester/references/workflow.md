# Execution Workflow Guide

Follow these step-by-step instructions to orchestrate standard load profile execution, codebase-informed flaw analysis, container log inspection, and dual-section reporting.

---

## Step 1: Codebase & Route Discovery

1. **Endpoint Extraction**:
   - Inspect controllers (`@RestController`, Express routes, FastAPI routes).
   - Extract HTTP methods, path parameters, query parameters, and body payloads.
2. **Configuration Inspection**:
   - Inspect `application.yml` / `properties` or `docker-compose.yml` for port mappings, DB connection pool size (`hikari.maximum-pool-size`), web server thread pool size (`server.tomcat.threads.max`), and logging levels.
3. **Auth Token Setup**:
   - If endpoints require authentication, construct dynamic token acquisition in k6 `setup()` functions.

---

## Step 2: Service Stand-Up & Health Check

1. Launch target container service:
   ```bash
   docker-compose up -d --build
   ```
2. Verify service health before initiating load profiles:
   ```bash
   curl -s http://localhost:8080/actuator/health
   docker ps
   ```

---

## Step 3: Phase 1 — Deterministic Standard Profile Execution

Execute the mandatory 5 standard load profiles in strict sequence against discovered service endpoints:

```bash
# 1. Smoke Profile (1 VU, 30s)
docker run --rm -i -e BASE_URL="http://host.docker.internal:8080" grafana/k6 run --summary-export=smoke_summary.json - < scripts/01_smoke.js

# 2. Ramp-Up / Load Profile (20 VUs, 3m)
docker run --rm -i -e BASE_URL="http://host.docker.internal:8080" grafana/k6 run --summary-export=load_summary.json - < scripts/02_load.js

# 3. Spike Profile (100 VUs burst, 2m)
docker run --rm -i -e BASE_URL="http://host.docker.internal:8080" grafana/k6 run --summary-export=spike_summary.json - < scripts/03_spike.js

# 4. Stress Profile (150 VUs peak, 5m)
docker run --rm -i -e BASE_URL="http://host.docker.internal:8080" grafana/k6 run --summary-export=stress_summary.json - < scripts/04_stress.js

# 5. Soak Profile (30 VUs sustained, 5m)
docker run --rm -i -e BASE_URL="http://host.docker.internal:8080" grafana/k6 run --summary-export=soak_summary.json - < scripts/05_soak.js
```

---

## Step 4: Phase 2 — Code-Informed Specialized Flaw Analysis

1. Inspect source code for specific anti-patterns matching the 16-item taxonomy (e.g. `@Transactional` wrapping HTTP calls, missing `.remove()` on `ThreadLocal`, lazy ORM loops, `.parallelStream()` usage).
2. Generate targeted ad-hoc k6 scripts (`scripts/06_specialized_flaw_test.js`) specifically tailored to trigger identified code vulnerabilities.
3. Execute specialized scenario:
   ```bash
   docker run --rm -i -e BASE_URL="http://host.docker.internal:8080" grafana/k6 run --summary-export=specialized_summary.json - < scripts/06_specialized_flaw_test.js
   ```

---

## Step 5: Container Log & Exception Extraction

Extract container logs post-test to capture unhandled runtime exceptions:
```bash
docker logs --tail 300 <container_name> > app_errors.log

# Scan for taxonomy indicators
grep -iE "CannotGetJdbcConnectionException|LockTimeoutException|ConcurrentModificationException|OutOfMemoryError|BindException|SQLITE_BUSY|Deadlock" app_errors.log
```

---

## Step 6: Service Teardown

```bash
docker-compose down -v
```

---

## Step 7: Dual-Section Report Generation

Format final analysis output according to this standard structure:

### Section 1: Standard Load Profile Results
| Profile | Target VUs | Duration | Throughput (req/s) | p(95) Latency | Error Rate (%) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Smoke** | 1 | 30s | ... | ... | ...% | PASS |
| **Ramp-Up / Load** | 20 | 3m | ... | ... | ...% | PASS |
| **Spike** | 100 | 2m | ... | ... | ...% | FAIL (High Error) |
| **Stress** | 150 | 5m | ... | ... | ...% | FAIL (Breaks) |
| **Soak** | 30 | 5m | ... | ... | ...% | PASS |

### Section 2: Code-Informed Specialized Flaw Results
* **Target Endpoint**: `/api/v1/...`
* **Vulnerability Hypothesis**: [Description of identified code anti-pattern]
* **Specialized Scenario Output**: [Throughput, p95 latency, error rates, log excerpts]

### Section 3: Flaw Explanation & Taxonomy Mapping
* **Identified Flaw**: `Flaw X.Y [Taxonomy Flaw Name]`
* **Root Cause Analysis**: Code link/file location, explanation of why single-user QA missed it, and empirical evidence captured during load testing.
* **Remediation Recommendation**: Specific code/configuration fix.
