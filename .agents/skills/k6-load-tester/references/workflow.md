# k6 Load Tester Execution Workflow

This reference defines the step-by-step procedure for analyzing candidate applications, executing the standardized 2-phase load testing methodology, and producing individual reports in the script folder.

---

## Step 1: Codebase Analysis & Multi-Endpoint Discovery

1. Inspect project directory structure and source files.
2. Identify 4–6 representative domain entry points (list endpoints, detail lookups, search filters, lightweight creation/status endpoints, authentication flows).
3. Inspect source code for specific structural flaws matching the **Taxonomy of Structural Flaws Exposed Exclusively by Load Testing** and record exact file paths and line numbers.
4. Identify application configuration parameters (server port, database connection pool size, web/scheduler thread pools).

---

## Step 2: Standardized 2-Phase k6 Script Design

1. Create a `k6-scripts/` directory inside the project root if it does not already exist.
2. **Phase 1 (`01_deterministic_standard_profiles.js`)**:
   - Implement the **Standardized Control Baseline** (`10 VUs` steady-state for `120s`, probabilistic single-request `Math.random()` branching across 4–6 domain endpoints, uniform `sleep(0.1)` pacing).
   - **Do NOT include high-VU spikes or destructive flaw triggers in Phase 1** so that Phase 1 serves as a clean, comparable control group across all projects.
3. **Phase 2 (`02_specialized_stress.js`)**:
   - Implement the **Project-Tailored Flaw Stress** (`60–65 VUs` over `120s`) using either **Pattern 2A** (`55-VU` `flaw_trigger_workload` + `10-VU` `canary_latency_probe`) or **Pattern 2B** (Synchronized Concurrency / State Isolation Barrier) to empirically isolate and verify the flaw.

---

## Step 3: Service Stand-Up & k6 Execution

1. Start target application containers or native binaries (`docker compose up -d`, `java -jar ...`).
2. Execute **Phase 1 (Control Baseline)** and export raw summary metrics:
   ```bash
   k6.exe run -e BASE_URL="http://localhost:<PORT>" --summary-export=k6-scripts/01_standard_summary.json k6-scripts/01_deterministic_standard_profiles.js
   ```
3. Execute **Phase 2 (Tailored Flaw Stress)** and export raw summary metrics:
   ```bash
   k6.exe run -e BASE_URL="http://localhost:<PORT>" --summary-export=k6-scripts/02_specialized_summary.json k6-scripts/02_specialized_stress.js
   ```

---

## Step 4: Individual Report Generation in Script Folder

Save the individual project analysis report **directly inside the project's k6 script folder**:
- **Target File**: `<project-root>/k6-scripts/ANALYSIS.md`
- **Mandatory Reporting Directive**: The report MUST summarize the **empirical findings** with a side-by-side **Phase 1 (10-VU Baseline) vs. Phase 2 (65-VU Tailored Stress)** comparison table including exact quantitative metrics (total request count, throughput req/s, average, $p50$, $p90$, $p95$, and max latencies, HTTP failure percentages and counts, canary probe latency degradation, CPU/RAM/Disk telemetry, exact error messages, stack traces, and source code snippets with line numbers).
- **Structure**:
  1. Executive Overview & Discovered User Journeys
  2. Empirical Findings Summary & Phase 1 vs. Phase 2 Comparison Table
  3. Raw Execution Result Files Index (`k6-scripts/01_standard_summary.json`, `k6-scripts/02_specialized_summary.json`)
  4. Flaw & Bug Analysis (Code Snippets, Canary Isolation Proof, Exceptions, Log Evidence, Root Causes)
  5. Taxonomy Mapping (`Flaw 1.1` to `Flaw 6.2`)

---

## Step 5: Master Document Synthesis

Synthesize findings from each `<project-root>/k6-scripts/ANALYSIS.md` report into the master thesis summary document at `thesis/projects/ANALYSIS_SUMMARY.md`.
