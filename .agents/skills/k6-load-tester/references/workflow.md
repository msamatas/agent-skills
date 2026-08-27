# k6 Load Tester Execution Workflow

This reference defines the step-by-step procedure for analyzing candidate applications, designing traffic-shaped load profiles, executing tests, and producing individual reports in the script folder.

---

## Step 1: Codebase Analysis & Multi-Endpoint Discovery

1. Inspect project directory structure and source files.
2. Identify all domain entry points (list endpoints, detail lookups, search filters, creation/update endpoints, authentication flows).
3. Identify application configuration parameters (server port, database connection pool, thread pools).
4. Map out a realistic multi-endpoint **Domain User Journey** representing actual user interaction patterns.

---

## Step 2: k6 Script Design & Traffic Shaping

1. Create a `k6-scripts/` directory inside the project root if it does not already exist.
2. Write `01_deterministic_standard_profiles.js` implementing a weighted multi-endpoint traffic distribution across the discovered domain user journey (**never using a single `/health` endpoint**).
3. If specific software bugs or taxonomy anti-patterns are uncovered during code inspection, write specialized k6 scripts (e.g. `02_specialized_flaw_scenario.js`) layered on top of the standard profiles to empirically demonstrate the issue.

---

## Step 3: Service Stand-Up & k6 Execution

1. Start target application containers or native binaries (`python app.py`, `java -jar ...`).
2. Run `k6.exe` against the service endpoints, saving raw result JSON files directly inside `k6-scripts/`:
   ```bash
   k6.exe run -e BASE_URL="http://localhost:<PORT>" --summary-export=k6-scripts/01_standard_summary.json k6-scripts/01_deterministic_standard_profiles.js
   ```
3. Run any specialized flaw scripts, saving raw result JSON files directly inside `k6-scripts/`:
   ```bash
   k6.exe run -e BASE_URL="http://localhost:<PORT>" --summary-export=k6-scripts/02_specialized_flaw_summary.json k6-scripts/02_specialized_flaw_scenario.js
   ```

---

## Step 4: Individual Report Generation in Script Folder

Save the individual project analysis report **directly inside the project's k6 script folder**:
- **Target File**: `<project-root>/k6-scripts/ANALYSIS.md`
- **Mandatory Reporting Directive**: The report MUST focus on summarizing the **empirical findings themselves** with exact quantitative metrics (total request count, throughput req/s, average, p90, p95, and max latencies, HTTP failure percentages and counts, bytes transferred, exact error messages, stack traces, over-redemption counts, and lock contention numbers), rather than merely listing setup parameters or distinguishing Phase 1 vs Phase 2.
- **Structure**:
  1. Executive Overview & Discovered User Journeys
  2. Empirical Findings Summary & Metrics (Total HTTP requests, Throughput req/s, avg/p90/p95/max latencies, Failure rate & count, Data transferred)
  3. Raw Execution Result Files Index (`k6-scripts/01_standard_summary.json`, `k6-scripts/02_specialized_summary.json`)
  4. Flaw & Bug Analysis (Empirical Proof, Exceptions, Log Evidence, Root Causes)
  5. Taxonomy Mapping (`Flaw 1.1` to `Flaw 6.2`)

---

## Step 5: Master Document Synthesis

Synthesize findings from each `<project-root>/k6-scripts/ANALYSIS.md` report into the master thesis summary document at `thesis/projects/ANALYSIS_SUMMARY.md`.
