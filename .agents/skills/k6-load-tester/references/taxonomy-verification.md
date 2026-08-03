# Taxonomy Flaw Verification Guide

This guide details how to configure k6 scripts, thresholds, and environment monitors to detect structural flaws from the load-testing taxonomy.

---

## 1. Concurrency and Shared State Flaws

### ThreadLocal Data Bleed
* **Goal**: Detect if pooled web server threads (e.g. Tomcat) retain previous user credentials/context.
* **Test Strategy**:
  - Run a multi-VU scenario with distinct Virtual User IDs or authentications.
  - Send authenticated requests in VU group A, and anonymous/guest requests in VU group B.
  - Assert that VU group B responses never contain tenant/user data belonging to VU group A.
* **k6 Assertion Example**:
```javascript
let res = http.get(`${BASE_URL}/api/user/profile`, { headers: { 'Authorization': '' } });
check(res, {
  'guest response does not leak user data': (r) => r.json('username') === 'Guest',
});
```

### Check-Then-Act & Race Conditions
* **Goal**: Uncover overselling or inventory balance inconsistencies under burst traffic.
* **Test Strategy**: Use a Spike profile sending parallel requests for a single limited item/coupon. Verify that total successful claims do not exceed available stock.

---

## 2. Resource Pool Exhaustion

### Database Connection Pool Starvation
* **Goal**: Identify endpoints holding JDBC connections during slow operations (e.g. `@Transactional` methods with thread sleep or external HTTP calls).
* **Test Strategy**: Use a sustained Load or Stress profile. Monitor HTTP error rates and response durations.
* **Failure Indicator**: Rapid rise in HTTP 500/503 errors and HikariCP connection timeout exceptions (`CannotGetJdbcConnectionException`) in container logs.

### Web Server Thread Starvation
* **Goal**: Determine if downstream service delays consume all web server worker threads (e.g., Tomcat max threads = 200).
* **Test Strategy**:
  - Bombard slow downstream endpoints with background VUs.
  - Concurrently hit a lightweight health/fast endpoint.
  - Assert fast endpoint latency and error rate. If fast endpoint times out, worker threads are starved.

---

## 3. Database and Storage Bottlenecks

### N+1 Query Amplification
* **Goal**: Detect unoptimized ORM queries (JPA/Hibernate/MyBatis) fetching nested entity relations.
* **Test Strategy**:
  - Query collection endpoints (e.g., `/api/articles`, `/api/owners`).
  - Measure latency growth relative to database size under increasing VUs.
  - Inspect DB logs or SQL query counters to verify query count per request.

### Hot-Row Lock Contention
* **Goal**: Expose database lock timeouts when multiple transactions update the same database row.
* **Test Strategy**: High-concurrency Spike profile targeting a single resource ID (e.g. flash sale checkout).
* **Failure Indicator**: `p(95)` latency spike and `LockTimeoutException` in DB container logs.

---

## 4. Hardware & OS-Level Exhaustion

### Synchronous Logging Disk I/O Blocking
* **Goal**: Detect file lock contention on synchronous loggers (e.g., Logback file appender).
* **Test Strategy**: Run high VU count against high-logging endpoints. Compare latency against non-logging endpoints under equal load.

---

## 5. JVM and Runtime Degradation

### Memory Thrashing and Stop-The-World (STW) GC Pauses
* **Goal**: Detect unpaginated database queries forcing heavy GC cycles.
* **Test Strategy**: Soak test combined with unpaginated fetch endpoints. Track max latency spikes.
* **Failure Indicator**: Latency spikes on fast endpoints jumping from ~5ms to >1000ms due to STW GC pauses.

---

## 6. Distributed System Failures

### Lack of Backpressure
* **Goal**: Ensure message producers do not crash brokers or consumers under burst load.
* **Test Strategy**: High-rate ingestion spike test. Monitor consumer memory usage and queue backlog length.
