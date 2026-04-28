# Execution Workflow

Follow these steps to execute tests and collect metrics.

## 1. Setup Service
If `docker-compose.yml` exists:
```bash
docker-compose up -d --build
```
Otherwise, build and run the Dockerfile manually, ensuring ports are mapped correctly.

## 2. Run K6 via Docker
Execute the test script using the `grafana/k6` image.
```bash
docker run --rm -i --network="host" grafana/k6 run - <script.js
```
*Note: Using `--network="host"` is often necessary on Linux to reach localhost services. On Windows/Mac, use `host.docker.internal` in the script URLs.*

## 3. Export Metrics
To save raw JSON:
```bash
docker run --rm -i --network="host" grafana/k6 run --summary-export=results.json - <script.js
```

## 4. Teardown
```bash
docker-compose down
```

## 5. Analysis
Identify and report:
- **Throughput**: `http_reqs` (reqs/s)
- **Latency**: `http_req_duration` (avg, p95, max)
- **Errors**: `http_req_failed`
- **Checks**: Success rate of functional checks within the script.
