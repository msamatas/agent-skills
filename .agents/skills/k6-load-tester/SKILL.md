---
name: k6-load-tester
description: Analyzes codebases to identify REST endpoints, generates k6 scripts for various load profiles, and executes them against Dockerized services. Use when a project has a Dockerfile or docker-compose.yml and requires performance validation.
---

# K6 Load Tester

This skill automates the performance testing lifecycle for REST services using k6 and Docker.

## Workflow

1.  **Analyze Codebase**: Search for routing logic (e.g., Express `app.get`, FastAPI `@app.get`) to identify testable endpoints.
2.  **Generate Scripts**: Create k6 scripts using templates from `references/profiles.md`.
3.  **Stand up Service**: Use `docker-compose up -d --build` (or `docker build` + `docker run`) to start the service.
4.  **Execute Tests**: Run k6 via Docker to ensure a consistent environment.
5.  **Analyze & Teardown**: Parse results into Markdown/JSON and run `docker-compose down`.

## Resources

- **Load Profiles**: See `references/profiles.md` for Smoke, Load, Stress, and Spike configurations.
- **Execution Orchestration**: See `references/workflow.md` for detailed Docker/k6 command sequences.
- **Base Template**: Use `assets/k6-base-template.js` as the foundation for all generated scripts.

## Quality Standards

- **Isolation**: Always run tests in a dedicated network if possible.
- **Cleanup**: Ensure containers are stopped and removed after testing.
- **Reporting**: Include p(95) latency, request rate, and error rate in all summaries.
