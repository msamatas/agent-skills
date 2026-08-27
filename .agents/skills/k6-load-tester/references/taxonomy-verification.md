# Specialized Flaw Verification Guide (16-Item Taxonomy)

This guide details how to inspect codebase anti-patterns, configure specialized k6 verification scenarios, and detect empirical proof for each item in the **16-Item Structural Flaw Taxonomy**.

---

## Domain 1: Concurrency and Shared State Flaws

### Flaw 1.1: ThreadLocal Data Bleed
* **Code Anti-Pattern**: Setting security context or tenant ID in `ThreadLocal` without `finally { holder.remove(); }`.
* **k6 Scenario**: Dual VU scenario (Group A authenticated, Group B anonymous).
* **Assertion**: Verify Group B responses never contain Group A user identity or tenant data.
```javascript
let res = http.get(`${BASE_URL}/api/user/profile`, { headers: { 'Authorization': '' } });
check(res, {
  'anonymous response does not leak user data': (r) => r.json('username') === 'Guest',
});
```

### Flaw 1.2: Race Conditions & Check-Then-Act Vulnerabilities
* **Code Anti-Pattern**: `if (stock > 0) { stock--; }` or mutating singleton `@Service` fields without locks.
* **k6 Scenario**: High-concurrency Spike profile targeting a limited resource endpoint.
* **Assertion / Log Signature**: Assert total successful claims $\le$ initial stock limit. Watch container logs for `ConcurrentModificationException`.

### Flaw 1.3: Cache Stampede & Invalidation Storms
* **Code Anti-Pattern**: Simple check-cache-then-query-db without mutual exclusion or probabilistic early expiration.
* **k6 Scenario**: Spike test hitting an endpoint whose cache key has just expired.
* **Log Signature**: Sudden CPU surge on DB container and spike in HikariCP active connection metrics.

### Flaw 1.4: Event Loop & Single-Thread Blocking
* **Code Anti-Pattern**: Synchronous JSON parsing of huge payloads, crypto hashing, or blocking I/O on main Event Loop thread (Node.js, WebFlux, `asyncio`).
* **k6 Scenario**: Send heavy payload to CPU endpoint while probing fast health endpoint.
* **Assertion**: Fast endpoint latency spikes exponentially (e.g. >2000ms).

---

## Domain 2: Resource Pool Starvation

### Flaw 2.1: Database Connection Pool Starvation
* **Code Anti-Pattern**: Performing third-party HTTP calls, disk I/O, or `Thread.sleep()` inside `@Transactional` methods.
* **k6 Scenario**: Stress profile exceeding default HikariCP pool size (e.g. 50 VUs vs 10 connections).
* **Log Signature**: `CannotGetJdbcConnectionException: Connection is not available, request connection timed out after 30000ms`.

### Flaw 2.2: Web Server Worker Thread Starvation
* **Code Anti-Pattern**: Downstream HTTP clients initialized without read/connect timeouts.
* **k6 Scenario**: Bombard slow downstream endpoint while probing fast local endpoint.
* **Assertion / Failure Mode**: Fast endpoint returns `503 Service Unavailable` or connection timeouts because Tomcat worker threads (200 max) are exhausted.

### Flaw 2.3: Shared Execution Pool Contention
* **Code Anti-Pattern**: Performing blocking operations inside Java `.parallelStream()` which uses `ForkJoinPool.commonPool()`.
* **k6 Scenario**: Concurrent traffic on parallel stream endpoint while probing unrelated fast endpoints.
* **Assertion**: Unrelated endpoint latency spikes from ~5ms to >1500ms due to common pool monopolization.

### Flaw 2.4: Single-Threaded Task Scheduler Starvation
* **Code Anti-Pattern**: Relying on default Spring single-threaded `@Scheduled` task pool.
* **k6 Scenario**: Trigger long-running scheduled job while monitoring background task execution timestamps.
* **Log Signature**: Scheduled background tasks halt or delay execution until long job completes.

---

## Domain 3: Database and Storage Bottlenecks

### Flaw 3.1: Database Hot-Row Lock Contention
* **Code Anti-Pattern**: Frequent concurrent `SELECT FOR UPDATE` on a single row (e.g. global inventory/counter).
* **k6 Scenario**: Spike test targeting flash sale checkout on single item ID.
* **Log Signature**: `LockTimeoutException` or `SQLITE_BUSY: database is locked` in container logs.

### Flaw 3.2: Database Concurrency Deadlocks
* **Code Anti-Pattern**: Inconsistent multi-table or multi-row locking order across endpoints.
* **k6 Scenario**: Concurrent execution across conflicting endpoints.
* **Log Signature**: `DeadlockDetectedException` / `org.hibernate.exception.LockAcquisitionException`.

### Flaw 3.3: N+1 Query Amplification
* **Code Anti-Pattern**: Iterating over parent entities and lazily loading child relations without `JOIN FETCH` or `@EntityGraph`.
* **k6 Scenario**: Ramp-Up profile querying list collection endpoints.
* **Metric Indicator**: DB CPU reaches 100% at relatively low VU counts (e.g., 20 VUs).

---

## Domain 4: Hardware, OS, and Network Resource Exhaustion

### Flaw 4.1: Synchronous I/O Disk Blocking (Logging)
* **Code Anti-Pattern**: Synchronous file appender logging under high verbosity (`DEBUG`/`INFO`).
* **k6 Scenario**: High VU Stress profile on verbose logging endpoint.
* **Metric Indicator**: High latency and low CPU utilization due to thread lock contention on file appender.

### Flaw 4.2: OS Socket & File Descriptor Leaks
* **Code Anti-Pattern**: Creating short-lived HTTP connections without connection pooling / Keep-Alive, or unclosed file streams.
* **k6 Scenario**: Extended 5-10 minute Soak test.
* **Log Signature**: `java.net.BindException: Address already in use` or `java.io.IOException: Too many open files`.

---

## Domain 5: Memory and Runtime Degradation

### Flaw 5.1: Memory Thrashing & Stop-The-World GC Pauses
* **Code Anti-Pattern**: Unpaginated database fetches (`findAll()`) allocating massive object graphs per request.
* **k6 Scenario**: Ramp-Up profile on unpaginated endpoint while probing fast endpoint latency.
* **Log/Metric Indicator**: Multi-second Stop-The-World GC pauses cause latency spikes on fast probe endpoints.

### Flaw 5.2: Slow Heap Memory Leaks & Cache Growth
* **Code Anti-Pattern**: Unbounded static maps or dynamic cache keys without LRU eviction bounds/TTL.
* **k6 Scenario**: Extended Soak test with unique request payloads.
* **Log Signature**: `java.lang.OutOfMemoryError: Java heap space`.

---

## Domain 6: Distributed System and Resilience Failures

### Flaw 6.1: Queue Overflow & Lack of Backpressure
* **Code Anti-Pattern**: Pushing messages to unbounded memory queues (`LinkedBlockingQueue`).
* **k6 Scenario**: High-rate ingestion Spike profile.
* **Log Signature**: Queue backlog grows infinitely until heap memory OOM.

### Flaw 6.2: Cascading Inter-Service Failures & Retry Storms
* **Code Anti-Pattern**: Invoking downstream services without circuit breakers or using un-backed-off retries.
* **k6 Scenario**: Introduce artificial downstream latency while load testing upstream service.
* **Metric Indicator**: Total request volume on downstream service multiplies by 3x-5x, resulting in total cascade collapse.
