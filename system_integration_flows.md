# System Integration Flows (Conceptual)

This document maps out key conceptual end-to-end user flows and system interactions based on the provided architectural and planning documents. It aims to illustrate how different components of the AI-enhanced trading platform might interact.

---

## Flow 1: User Initiates Trading Analysis via Crew

1.  **Flow Name/User Goal:** User requests an in-depth trading analysis for a specific financial instrument using an AI crew.
2.  **Trigger:** User action in the Frontend, likely within an "Agent Control Center" or "Trading Analysis" section.
3.  **Frontend Components (Conceptual):**
    *   "Trading Analysis Dashboard" or "Agent Interaction Panel".
    *   Input fields for symbol (e.g., "BTC/USD"), timeframe, and potentially other contextual parameters.
    *   A "Run Analysis" button.
4.  **API Calls (Frontend to Backend):**
    *   **Frontend (Next.js) to Next.js API Bridge:**
        *   `POST /api/crew/run_trading_analysis` (or similar, based on FastAPI endpoint for crew execution).
        *   **Example Payload:** `{ "inputs": { "symbol": "BTC/USD", "timeframe": "1h", "additional_context": "..." } }`
    *   **Next.js API Bridge to Python FastAPI Service (`python-ai-services`):**
        *   The bridge forwards the request to the corresponding Python FastAPI endpoint that triggers the CrewAI workflow (e.g., the one defined in `python-ai-services/main.py` that calls the `trading_crew.kickoff()`).
5.  **Key Backend Services/Modules (Python):**
    *   **FastAPI Endpoint (in `main.py`):** Receives the request.
        *   Likely responsible for creating an initial `AgentTask` record to track the crew's execution.
    *   **`trading_crew` (CrewAI Workflow):**
        *   **MarketAnalystAgent:**
            *   Task: Analyze market conditions for the given symbol/timeframe.
            *   Tools: May use `MarketDataService` (via A2A or direct call if refactored) to fetch data, or a mocked/internal tool for analysis. Interacts with an LLM.
        *   **StrategyAgent (Hypothetical):**
            *   Task: Develop trading strategies based on market analysis. Interacts with an LLM.
        *   **TradeAdvisorAgent:**
            *   Task: Synthesize information and provide a final `TradeSignal` (buy/sell/hold recommendation with reasoning, stop-loss, take-profit). Interacts with an LLM.
        *   Agents may use `A2AProtocol` for internal communication if designed that way, or pass data via task outputs/context.
    *   **`AgentStateManager`:** Potentially used by agents within the crew to access their persistent state or memory (though CrewAI agents often manage context per run).
    *   **LLM Services:** All agents in the crew make calls to configured LLMs.
    *   **`SimulatedTradeExecutor` (if signal leads to immediate paper trade):**
        *   Called after the crew produces an actionable `TradeSignal`.
        *   Logs the paper trade.
6.  **Data Persistence Layer:**
    *   **Supabase:**
        *   `agent_tasks` (or similar): To create and update the status of the crew execution (e.g., "pending", "running", "completed", "failed") and store the final result (`TradeSignal`).
        *   `agent_configurations` (or similar): If the crew or agents load specific configurations.
        *   `trades` (or similar, for paper trades): `SimulatedTradeExecutor` would write here.
        *   `agent_memories` (MemGPT context): If agents within the crew use MemGPT for long-term memory, this would be accessed/updated.
    *   **Redis:**
        *   Could be used as a message bus for `A2AProtocol` if that's how the AG-UI events or inter-agent communication within the crew is architected.
        *   Potentially for BullMQ if crew execution is offloaded to a background worker via the FastAPI endpoint.
7.  **Inter-Service Communication (Backend):**
    *   If agents within the crew are highly decoupled, they might use `A2AProtocol` (potentially over Redis pub/sub).
    *   More commonly in CrewAI, data is passed between tasks via their output/context mechanism.
    *   The final `TradeSignal` might be passed to `SimulatedTradeExecutor` via a direct method call or an internal event.
8.  **Key Outputs & UI Updates:**
    *   **Primary Output:** A `TradeSignal` object/dictionary.
    *   **`AgentTask` Update:** The corresponding task record in Supabase is updated with the result and "completed" status.
    *   **AG-UI Events (via WebSockets):**
        *   `TASK_STATUS_UPDATE`: "Crew trading_analysis started/in_progress".
        *   `NEW_ANALYSIS_RESULT`: Payload contains the `TradeSignal` or key parts of it.
        *   `AGENT_ACTIVITY_EVENT`: "MarketAnalystAgent completed task", "TradeAdvisorAgent generated signal".
    *   **UI Update:** The "Trading Analysis Dashboard" displays the received `TradeSignal`, reasoning, and any associated charts or data. The status of the task is updated.

---

## Flow 2: User Configures and Saves a Trading Agent/Strategy

1.  **Flow Name/User Goal:** User defines parameters for a trading agent or a specific strategy and saves this configuration.
2.  **Trigger:** User action in the Frontend, likely within a "Strategy Configurator" or "Agent Setup" section.
3.  **Frontend Components (Conceptual):**
    *   "Strategy Configurator" or "Agent Configuration Panel".
    *   Forms with fields for strategy parameters (e.g., indicators, thresholds, risk settings), agent persona, LLM choice, associated symbols.
    *   "Save Configuration" button.
4.  **API Calls (Frontend to Backend):**
    *   **Frontend (Next.js) to Next.js API Bridge:**
        *   `POST /api/agents/configurations` or `PUT /api/agents/configurations/{config_id}`.
        *   **Example Payload:** `{ "config_name": "My BTC Strategy", "agent_type": "TradingAgentV1", "llm_id": "llm_cfg_1", "parameters": { "rsi_threshold": 70, "stop_loss_percent": 2.0 }, "symbols": ["BTC/USD"] }`
    *   **Next.js API Bridge to Python FastAPI Service (`python-ai-services`):**
        *   The bridge forwards the request to a Python FastAPI endpoint (e.g., `/config/agents` - hypothetical, or a general configuration endpoint).
5.  **Key Backend Services/Modules (Python):**
    *   **FastAPI Endpoint (in `main.py` or a dedicated config service):** Receives the configuration data.
        *   Validates the incoming data (possibly using Pydantic models).
    *   **Configuration Management Service (Hypothetical, or part of `AgentStateManager` logic):**
        *   Handles the logic for saving or updating the configuration.
        *   Ensures data integrity (e.g., referenced LLM IDs exist if using `/config/llms` data).
6.  **Data Persistence Layer:**
    *   **Supabase:**
        *   `agent_configurations` (or similar): The primary table for storing these configurations. Fields would include `config_id`, `name`, `agent_type`, `llm_id`, `parameters_json`, `symbols_array`.
        *   `llm_configurations` (from `/config/llms`): Might be referenced by `llm_id`.
    *   **Redis:**
        *   Could cache frequently accessed configurations, though this is more of an optimization.
7.  **Inter-Service Communication (Backend):**
    *   Minimal for this flow, primarily involves the API endpoint interacting with the database.
    *   If saving a configuration triggers a validation against other services (e.g., `MarketDataService` for symbol validity), that would be an internal call.
8.  **Key Outputs & UI Updates:**
    *   **Primary Output:** Confirmation of successful save (e.g., the saved configuration object with its ID).
    *   **AG-UI Events (via WebSockets):**
        *   `CONFIGURATION_SAVED_EVENT`: Payload includes the `config_id` and `config_name`.
        *   Could trigger a refresh of a list of available configurations in the UI.
    *   **UI Update:** The "Strategy Configurator" might show a success message and update its list of saved strategies.

---

## Flow 3: Automated Market Data Update Triggers Agent Analysis

1.  **Flow Name/User Goal:** System processes a new market data update, which may trigger an autonomous agent to perform analysis and potentially generate an alert or update its state.
2.  **Trigger:** System event: `MarketDataService` receives a new data point (e.g., a new candle or tick) from an external WebSocket feed.
3.  **Frontend Components (Conceptual):**
    *   "Market Data Dashboard" (to visualize the incoming data).
    *   "Agent Status Panel" (to see if an agent reacts).
    *   "Alerts/Notifications Panel".
4.  **API Calls (Frontend to Backend):**
    *   This flow is primarily backend-driven. Frontend calls might be to initially subscribe to WebSocket updates for displaying market data or agent alerts.
    *   `GET /market-data/subscribe` (conceptual, if UI subscribes via API before WebSocket connection) or direct WebSocket subscription.
5.  **Key Backend Services/Modules (Python):**
    *   **`MarketDataService`:**
        *   `_maintain_websocket_connection`: Receives the raw market data.
        *   Processes the message and then broadcasts an A2A `market_data_update` message via `a2a_protocol.broadcast_message`.
    *   **`A2AProtocol`:** Distributes the `market_data_update` message (e.g., via Redis Pub/Sub).
    *   **Autonomous Trading Agent (Hypothetical, e.g., "ProactiveMarketScannerAgent"):**
        *   This agent would be continuously running or activated by the `market_data_update` A2A message.
        *   It subscribes to relevant `market_data_update` A2A messages.
        *   Upon receiving new data, it might:
            *   Use its internal logic (potentially involving an LLM, technical indicators from a `TechnicalAnalysisEngine`) to analyze the data.
            *   Update its internal state via `AgentStateManager`.
            *   If a significant pattern or condition is met (e.g., a breakout, a custom alert condition defined in its configuration):
                *   Generate an internal "significant_event" or "alert_condition_met".
                *   This might be another A2A broadcast, or a direct call to an alerting service or `TradingCoordinator` if an immediate action evaluation is needed.
    *   **`AgentStateManager`:** Used by the autonomous agent to save any relevant state changes or observations.
    *   **LLM Services / `TechnicalAnalysisEngine` (Hypothetical):** Used by the autonomous agent for its analysis.
6.  **Data Persistence Layer:**
    *   **Supabase:**
        *   `agent_states`: The autonomous agent updates its state.
        *   `agent_memories`: If the agent logs observations or uses MemGPT.
        *   `alerts` (hypothetical table): If the agent generates formal alerts.
    *   **Redis:**
        *   Used by `A2AProtocol` for broadcasting `market_data_update`.
        *   The autonomous agent might use Redis for its own short-term state or caching of indicators if it's highly performance-sensitive.
        *   `python-ai-services/main.py` endpoints (`/crew-blueprints`, `/config/llms`) use Redis for caching.
7.  **Inter-Service Communication (Backend):**
    *   `MarketDataService` -> `A2AProtocol` (broadcast `market_data_update`).
    *   Autonomous Agent <- `A2AProtocol` (receives `market_data_update`).
    *   Autonomous Agent -> `A2AProtocol` (potentially broadcasts new findings or alerts).
    *   Autonomous Agent -> `AgentStateManager` (state updates).
8.  **Key Outputs & UI Updates:**
    *   **Primary System Output:** Agent state changes, new alerts, or potentially even initiated trade proposals if the autonomous agent is sophisticated enough to interact with `TradingCoordinator`.
    *   **AG-UI Events (via WebSockets):**
        *   `MARKET_DATA_UI_UPDATE`: The raw or processed market data itself, for charts/tickers. (This might come directly from `MarketDataService` via a WebSocket connection it manages for the UI, or relayed from the A2A `market_data_update`).
        *   `AGENT_STATUS_UPDATE`: "ProactiveMarketScannerAgent detected new pattern."
        *   `NEW_ALERT_EVENT`: If the agent generates a specific alert for the user.
    *   **UI Update:** Live charts update with new market data. The Agent Status Panel might show activity. The Alerts Panel might display new notifications.

---
*Disclaimer: Some service names (e.g., `TechnicalAnalysisEngine`, `AgentService`, `DeFiService`, "ProactiveMarketScannerAgent") and specific Supabase table names beyond the explicitly discussed ones are hypothetical, used to illustrate potential interactions based on the overall system goals described in various documents. The actual implementation details may vary.*
