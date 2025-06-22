# Process Management, Reliability, and State Recovery for Python Services

## Introduction

This document discusses strategies for process management using PM2, implementing health and heartbeat mechanisms for Python services (specifically `python-ai-services`), ensuring agent state recovery after restarts, and how these components integrate with a conceptual `AgentSupervisor`. It also touches upon the role of robust error handling in overall service reliability.

## 1. PM2 Configuration for `python-ai-services`

The existing `ecosystem.config.js` in the project root appears to be configured for a Node.js service (likely the Next.js frontend). For the `python-ai-services` FastAPI application, a different PM2 configuration is needed.

PM2 can effectively manage Python applications, including those run with Uvicorn. Here's an example PM2 `apps` configuration block that could be part of an `ecosystem.config.js` or a separate JSON configuration file for managing `python-ai-services`:

```javascript
// Example snippet for ecosystem.config.js or a dedicated JSON file
// {
//   "apps": [
//     // ... other apps like Next.js frontend ...
//     {
//       "name": "python-ai-services",
//       "script": "uvicorn", // Command to run
//       "args": "main:app --host 0.0.0.0 --port 9000", // Arguments for Uvicorn
//       "cwd": "./python-ai-services", // Path to the Python service directory
//       "interpreter": "python3", // Or path to your virtual environment's python
//       // "interpreter_args": "-m", // Uncomment if 'script' is a module like 'uvicorn.run'
//       "autorestart": true,       // Restart on crash
//       "watch": false,           // Set to true or specify paths for dev auto-reload
//       "max_memory_restart": "500M", // Restart if it exceeds 500MB of memory
//       "log_date_format": "YYYY-MM-DD HH:mm Z",
//       "error_file": "./logs/python-ai-error.log", // Path for error logs
//       "out_file": "./logs/python-ai-out.log",     // Path for regular logs
//       "combine_logs": true,
//       "env": {
//         "PYTHONPATH": ".", // Ensures modules within python-ai-services are found
//         "REDIS_URL": "redis://localhost:6379",
//         "GOOGLE_CLOUD_PROJECT_ID": "your-gcp-project-id",
//         // Add other necessary environment variables
//       }
//       // For production, you might add:
//       // "instances": "max", // Or a specific number of instances
//       // "exec_mode": "cluster"
//     }
//   ]
// }
```

**Key Configuration Options Explained:**

*   **`name`**: A descriptive name for the process in PM2.
*   **`script`**: The command to execute. For FastAPI with Uvicorn, this is `uvicorn`.
*   **`args`**: Arguments passed to the `script`. Here, it specifies the Uvicorn app location (`main:app`), host, and port. For production, `--reload` should typically be removed.
*   **`cwd`**: The working directory from which the script will be run. This should be the root of your `python-ai-services` directory.
*   **`interpreter`**: Specifies the Python interpreter. This can be `python3`, `python`, or the full path to a Python executable within a virtual environment (e.g., `./python-ai-services/.venv/bin/python`).
*   **`autorestart`**: If `true`, PM2 will automatically restart the application if it crashes.
*   **`watch`**: Enables watching files for changes and automatically restarting. Generally disabled in production but useful in development. If enabled, you might specify paths to ignore (e.g., `ignore_watch: ["./logs", "*.pyc"]`).
*   **`max_memory_restart`**: Restarts the application if it exceeds the specified memory limit.
*   **Logging paths (`error_file`, `out_file`)**: Define where PM2 should store logs.
*   **`env`**: A block to define environment variables specific to this application. Setting `PYTHONPATH="."` within the `python-ai-services` directory can help with module resolution.

## 2. Python Service Health/Heartbeat Mechanisms

To allow external supervisors (like the conceptual JavaScript `AgentSupervisor`) to monitor the `python-ai-services`, health/heartbeat mechanisms are essential.

*   **Existing `/health` Endpoint:**
    *   The `python-ai-services/main.py` already defines a `/health` endpoint. This endpoint checks the status of its internal components (like `GoogleSDKBridge`) and returns a summary. This serves as an excellent service-level health check.
    *   An external supervisor can periodically poll this HTTP endpoint. A `200 OK` response indicates the service is operational.

*   **Granular, Per-Agent Health (Logical Agents):**
    *   The current `python-ai-services` runs as a single OS process. "Agents" (like `TradingCoordinator`, `MarketAnalyst`, etc., or autonomous agents) are logical components within this service.
    *   If more granular health status is needed for these logical agents:
        1.  **Expand `/health` Endpoint:** The main `/health` endpoint could be enhanced to include a specific status for each critical logical agent it manages (e.g., `"trading_coordinator_status": "active"`).
        2.  **Specific Health Endpoints:** New endpoints could be created, e.g., `/health/trading_coordinator`, `/health/market_reactor_agent/{agent_id}`.
        3.  **A2A Health Pings (Conceptual):** If agents communicate via A2A, a supervisor could potentially send a "ping" A2A message and expect a "pong" to verify specific agent responsiveness, though this is more complex than HTTP health checks.

*   **"Last Seen" Timestamp (Alternative for Logical Agents):**
    *   Logical agents within `python-ai-services` that perform periodic tasks (e.g., an autonomous agent processing market data) could update a "last_seen_active" or "last_successful_run" timestamp in Redis or a dedicated Supabase table.
    *   The `AgentSupervisor` could then monitor these timestamps. If a timestamp becomes too old, the supervisor could flag that specific logical agent as potentially unhealthy, even if the main service's `/health` endpoint is still responsive.

## 3. Agent State Recovery Post-Restart

Ensuring that agents can recover their state and resume operations after a service restart (e.g., by PM2 due to a crash or deployment) is critical for reliability.

*   **`AgentStateManager`:** This service is designed for persisting agent states to Supabase. Its `get_agent_state` method loads state, and methods like `update_agent_state` and `update_state_field` save it.
*   **Service/Agent Initialization:**
    *   When `python-ai-services` starts, or when logical agent instances are initialized within it, they should use `AgentStateManager` to load their last known state from Supabase.
    *   For example, if a `TradingAgentStateMachine` (as per user docs) is implemented, its `initialize()` method would fetch the state. Autonomous agents would similarly load their configuration and operational state.
*   **Resuming Work:** By reloading their state, agents can understand where they left off and continue their tasks, minimizing disruption from restarts. This is crucial for long-running analyses, ongoing monitoring tasks, or stateful interactions.

## 4. Integration with the Conceptual `AgentSupervisor`

The `AgentSupervisor` (described in user documents as a JavaScript/Node.js component) would interact with `python-ai-services` for monitoring and management.

*   **Node.js Supervisor Interaction:**
    *   The `AgentSupervisor` would primarily use HTTP calls to interact with `python-ai-services`:
        *   Polling the `/health` endpoint (and any other specific health endpoints) to determine service/component status.
        *   Potentially calling administrative API endpoints on `python-ai-services` if defined (e.g., to gracefully reload configurations, trigger specific agent actions, or retrieve detailed status reports).
    *   If using the "last_seen" timestamp method, the `AgentSupervisor` would query Redis or Supabase directly to check these timestamps.

*   **Regarding Distinct Agent Processes:**
    *   The current architecture of `python-ai-services` suggests it runs as a single service (potentially with multiple Uvicorn workers if scaled with PM2 in cluster mode, but these are still part of the same service deployment). It does not manage distinct, separate OS processes for each logical agent.
    *   If the model were different, and `python-ai-services` was a supervisor that launched individual Python agent scripts as separate OS processes (e.g., using `subprocess` or PM2's programmatic API from within Python), then inter-process communication (IPC) mechanisms or PM2's API could be used by a Python-based supervisor. However, this is **not** the current described model.

## 5. Top-Level Error Handling in Python Service

Robust error handling within the Python service itself contributes significantly to reliability and clean process management.

*   **Global Exception Handler:** The global exception handler added to `python-ai-services/main.py` (using `@app.exception_handler(Exception)`) plays a key role:
    *   It catches any unhandled exceptions that might otherwise crash a Uvicorn worker.
    *   It ensures that a standardized error response (e.g., HTTP 500) is sent to the client.
    *   Crucially, it logs the full traceback of the error.
*   **PM2 Interaction:**
    *   By preventing unhandled exceptions from crashing workers abruptly, the service becomes more stable.
    *   If an error is so severe that a worker becomes unresponsive or repeatedly hits the global handler in a way that prevents useful work (e.g., failure to connect to a critical resource like Redis during startup), PM2's `autorestart` and memory limit features can gracefully restart the problematic worker or the entire service. The detailed logs from the global handler would be essential for diagnosing such repeating failures.

By combining PM2 for process supervision, clear health check mechanisms, robust state persistence and recovery, and comprehensive error handling, the `python-ai-services` can achieve a high degree of reliability and manageability.
