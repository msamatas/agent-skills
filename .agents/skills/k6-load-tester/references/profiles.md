# k6 Traffic Shaping & Standardized 2-Phase Profile Configurations

This reference specifies the mandatory k6 configurations for **Phase 1 (Standardized 10-VU Control Baseline)** and **Phase 2 (Project-Tailored Flaw Stress & Isolation)** so that all benchmarked projects are directly comparable.

---

## 1. Phase 1: Standardized Control Baseline (`01_deterministic_standard_profiles.js`)

Phase 1 acts as the **Experimental Control Group** across all projects. It MUST follow three strict rules:
1. **Fixed 10-VU, 120-Second Envelope**: Ramp up to `10 VUs` over `10s`, hold `10 VUs` steady for `100s`, and ramp down to `0 VUs` over `10s` (`120s` total). **Never put 50–100 VU spikes in Phase 1.**
2. **Probabilistic Single-Request Branching (`Math.random()`)**: Each iteration executes **1 endpoint** chosen by realistic domain weights across 4–6 discovered routes (e.g., 40% list browse, 25% detail lookup, 20% search/filter, 15% light write/status).
3. **Uniform Pacing (`sleep(0.1)`)**: Ensures baseline request arrival rates (`~80–100 req/s` when fast) and latency distributions ($p50, p90, p95, \max$) are comparable across projects.

### Phase 1 Canonical Template (`01_deterministic_standard_profiles.js`)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Warm-up ramp to 10 VUs
    { duration: '100s', target: 10 }, // Steady-state 10-VU control baseline
    { duration: '10s', target: 0 },   // Graceful ramp-down (120s total)
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export function setup() {
  // Optional: Authenticate once and return token/session data for VUs
  return {};
}

export default function (data) {
  const rand = Math.random();

  if (rand < 0.40) {
    // 40% Traffic: Browse Domain List / Paginated Catalog
    const res = http.get(`${BASE_URL}/api/v1/resources?page=1&size=10`, {
      tags: { name: 'Baseline_List' },
    });
    check(res, { 'list status 200': (r) => r.status === 200 });
  } else if (rand < 0.65) {
    // 25% Traffic: View Single Item Detail
    const res = http.get(`${BASE_URL}/api/v1/resources/1`, {
      tags: { name: 'Baseline_Detail' },
    });
    check(res, { 'detail status 200': (r) => r.status === 200 });
  } else if (rand < 0.85) {
    // 20% Traffic: Indexed Query / Metadata Lookup
    const res = http.get(`${BASE_URL}/api/v1/metadata`, {
      tags: { name: 'Baseline_Metadata' },
    });
    check(res, { 'metadata status 200': (r) => r.status === 200 });
  } else {
    // 15% Traffic: Lightweight Domain Write / Status Check
    const payload = JSON.stringify({ name: `item_${__VU}_${__ITER}` });
    const res = http.post(`${BASE_URL}/api/v1/resources`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Baseline_Create' },
    });
    check(res, { 'create status 200/201': (r) => r.status === 200 || r.status === 201 });
  }

  sleep(0.1);
}
```

---

## 2. Phase 2: Project-Tailored Flaw Stress (`02_specialized_stress.js`)

Phase 2 is tailored to the specific structural flaw discovered in the project's source code. It scales concurrency to **`60–65 VUs` over `120 seconds`** (matching Phase 1's 120s window) using **Pattern 2A** or **Pattern 2B**.

### Pattern 2A: Dual-Scenario Flaw Trigger + Canary Probe (`Flaws 1.3–1.4, 2.1–2.4, 3.1, 3.2b, 3.3, 4.1–4.3, 5.1–5.2, 6.1–6.2`)
Pairs a **55-VU Flaw Trigger scenario** (hitting the vulnerable code path with flaw-amplifying payloads) alongside a **10-VU Canary Probe scenario** (hitting a fast baseline endpoint) to measure both **direct flaw degradation** and **collateral system starvation**.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    flaw_trigger_workload: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '15s', target: 55 }, // Ramp to 55 flaw-triggering VUs
        { duration: '90s', target: 55 }, // Sustained 55-VU flaw saturation
        { duration: '15s', target: 0 },  // Ramp-down (120s total)
      ],
      exec: 'triggerFlawScenario',
    },
    canary_latency_probe: {
      executor: 'constant-vus',
      vus: 10,
      duration: '120s',                  // Combined 55 + 10 = 65 VUs total over 120s
      exec: 'canaryProbeScenario',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.15'],
    'http_req_duration{scenario:flaw_trigger_workload}': ['p(95)<3000'],
    'http_req_duration{scenario:canary_latency_probe}': ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export function triggerFlawScenario() {
  // Target the specific code flaw discovered during static analysis:
  // - Flaw 1.3: Uncached metadata / stampede-prone cache keys
  // - Flaw 1.4: CPU-heavy regex / synchronous event-loop blocking payloads
  // - Flaw 2.1/2.2/2.3/2.4: Connection-holding, slow downstream, cryptographic, or scheduler-saturating calls
  // - Flaw 3.1/3.2b/3.3: Hot-row FOR UPDATE writes, leading-wildcard LIKE '%a%', or N+1 graph queries
  // - Flaw 4.1/4.2/4.3: High-density batch writes, large socket streams, or sync disk file rewrites
  // - Flaw 5.1/5.2: Multi-megabyte export/batch JSON allocations or unique unbounded EventStore keys
  // - Flaw 6.1/6.2: Unbounded reactive .flatMap() fan-out or multi-service gateway chains
  const res = http.post(`${BASE_URL}/api/v1/vulnerable-endpoint`, JSON.stringify({ heavy: true }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'FlawTrigger' },
  });
  check(res, { 'flaw trigger status 200': (r) => r.status === 200 || r.status === 201 });
  sleep(0.02);
}

export function canaryProbeScenario() {
  // Fast baseline endpoint (e.g., ~2-10ms in Phase 1) to measure collateral queueing/starvation
  const res = http.get(`${BASE_URL}/api/v1/metadata`, {
    tags: { name: 'CanaryProbe' },
  });
  check(res, {
    'canary probe status 200': (r) => r.status === 200,
    'canary probe < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(0.1);
}
```

### Pattern 2B: Synchronized Concurrency / State Isolation Barrier (`Flaws 1.1, 1.2, 3.2a`)
Used when the flaw depends on **simultaneous arrival on the exact same shared entity or thread context**:
- **For Check-Then-Act (`Flaw 1.2`) & Optimistic Lock Collisions (`Flaw 3.2a`)**:
  Combine a synchronized contention scenario (either `per-vu-iterations` for one-shot quota limits like `limit = 1`, or `55 VUs` hammering the same shared `taskId`/`executionId`/`couponId` over `120s`) with a `10-VU` canary probe.
- **For `ThreadLocal` Context Bleed (`Flaw 1.1`)**:
  Run `55 VUs` continuously mutating tenant/user `ThreadLocal` state alongside `10 VUs` sending missing-header or cross-tenant verification probes (`check()` asserting HTTP `400`/`401`/`403` isolation).

---

## 3. Report Placement Rule

The generated analysis report for any candidate project **MUST ALWAYS BE SAVED IN THE SCRIPT FOLDER**:
- Path: `<project-directory>/k6-scripts/ANALYSIS.md`
- Master Summary: Synthesize findings into `thesis/projects/ANALYSIS_SUMMARY.md`.
