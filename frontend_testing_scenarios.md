# Frontend Testing Scenarios (Conceptual)

## Introduction

This document outlines conceptual manual and automated testing scenarios for the Next.js frontend application. These scenarios correspond to the backend integration flows tested in `python-ai-services/tests/test_integration_flows.py`, focusing on how a user might interact with the UI and how the UI should respond to backend events and data.

---

## Flow 1: User Initiates Trading Analysis via Crew

This flow tests the user's ability to trigger a CrewAI-based trading analysis and view its results.

**a. Objective of the Frontend Test:**
*   Verify that the user can successfully initiate a trading analysis request from the UI.
*   Ensure the UI provides appropriate feedback during the analysis process (loading states, progress updates).
*   Confirm that the final analysis results (e.g., a `TradeSignal`) are displayed correctly.
*   Verify that backend errors are handled gracefully and presented to the user.

**b. Preconditions:**
*   User is on the relevant page, e.g., "Trading Analysis Dashboard" or "Agent Control Panel".
*   (If applicable) The system has available LLM configurations and crew definitions.

**c. Manual Test Steps (User Actions):**
1.  Navigate to the section of the UI designed for initiating trading analysis (e.g., a dedicated "Run Analysis" page or a component within an agent's view).
2.  Enter a valid financial instrument symbol (e.g., "BTC/USD") into the designated input field.
3.  Select or enter a timeframe (e.g., "1h").
4.  Optionally, enter any additional context or parameters requested by the UI.
5.  Click the "Run Analysis" (or similarly named) button.
6.  Observe the UI for feedback during processing.
7.  Once complete, inspect the displayed results.
8.  (Error case) Repeat with invalid input (e.g., non-existent symbol if frontend doesn't validate, or trigger a backend error) and observe error handling.

**d. Expected Frontend Behavior & UI Updates:**
*   **Initiation:**
    *   Upon clicking "Run Analysis," a loading indicator (spinner, progress bar) should appear, indicating that the request is being processed.
    *   The UI should prevent multiple submissions while one is in progress.
*   **API Calls:**
    *   The frontend makes an API call to the Next.js bridge, e.g., `POST /api/crew/run_trading_analysis`, with a payload like:
        `{ "inputs": { "symbol": "BTC/USD", "timeframe": "1h", "additional_context": "..." } }`
*   **During Processing (AG-UI Events via WebSockets):**
    *   The UI, connected via WebSockets, should listen for AG-UI events.
    *   It might receive and display updates like:
        *   `TASK_STATUS_UPDATE: {"taskId": "...", "status": "Crew Kickoff Initiated"}`
        *   `AGENT_ACTIVITY_EVENT: {"taskId": "...", "agentName": "MarketAnalystAgent", "status": "Running Task X"}`
        *   `TASK_PROGRESS_UPDATE: {"taskId": "...", "progress": 30, "message": "Market analysis complete..."}`
    *   These updates could refresh a task progress view or a status log.
*   **Successful Completion:**
    *   The loading indicator disappears.
    *   The final analysis result, structured like a `TradeSignal` (e.g., "BUY BTC/USD", confidence score, reasoning, suggested stop-loss/take-profit), is displayed clearly in a designated results area.
    *   Relevant charts or supporting data from the analysis might also be rendered.
    *   An AG-UI event like `NEW_ANALYSIS_RESULT: {"taskId": "...", "result": {...}}` or `TASK_STATUS_UPDATE: {"taskId": "...", "status": "Completed"}` is received.
*   **Error Handling:**
    *   If the backend API call returns an error (e.g., 4xx or 5xx), the UI should display a user-friendly error message (e.g., "Failed to run analysis. Please try again." or more specific details if available).
    *   Loading indicators should disappear.
    *   An AG-UI event like `TASK_STATUS_UPDATE: {"taskId": "...", "status": "Failed", "error": "..."}` might be received.

**e. Key Assertions for Automated E2E Tests (Conceptual):**
*   **Tooling:** Using Playwright or Cypress.
*   **Element Targeting:**
    *   Target input fields by `data-testid`, `id`, or `name` attributes (e.g., `cy.get('[data-testid="symbol-input"]').type("BTC/USD")`).
    *   Target the "Run Analysis" button.
    *   Target the results display area.
    *   Target elements that show loading states or error messages.
*   **API Call Mocking:**
    *   Mock the Next.js bridge API endpoint (e.g., `cy.intercept('POST', '/api/crew/run_trading_analysis', { statusCode: 200, body: { taskId: "mock_task_123", message: "Analysis started" } })`).
    *   Simulate successful responses with predefined `TradeSignal` data.
    *   Simulate error responses (400, 500) to test UI error handling.
*   **Assertions:**
    *   Verify that the loading spinner appears after clicking "Run Analysis" and disappears upon completion/error.
    *   `cy.get('[data-testid="trade-signal-action"]').should('contain', 'BUY')`.
    *   `cy.get('[data-testid="trade-signal-symbol"]').should('contain', 'BTC/USD')`.
    *   `cy.get('[data-testid="analysis-reasoning"]').should('contain', 'Mocked reasoning...')`.
    *   If testing error states: `cy.get('[data-testid="error-message"]').should('be.visible').and('contain', 'Failed to run analysis')`.
*   **WebSocket Event Testing (Conceptual):**
    *   More complex for E2E tests. Approaches include:
        *   Having the E2E test framework connect its own WebSocket client to listen for expected events.
        *   Mocking the WebSocket connection at the browser level (e.g., using `cy.stub(window, 'WebSocket')`) to simulate messages being received by the frontend application and asserting UI updates based on these mocked events.
        *   Asserting that UI elements driven by WebSocket events (e.g., a task progress bar or status message) update as expected after the API call that initiates the backend process.

---

## Flow 2: UI Reflects Agent's Autonomous Analysis Update

This flow tests how the UI dynamically updates when a backend autonomous agent processes new market data, performs analysis, and updates its state, which should then be reflected in the UI via AG-UI events.

**a. Objective of the Frontend Test:**
*   Verify that the UI components displaying an agent's status, latest analysis, or insights update in near real-time when the backend agent autonomously processes new information.
*   Ensure these updates occur without requiring a manual page refresh by the user.

**b. Preconditions:**
*   User is viewing a specific UI page or component dedicated to displaying the status and analysis of a particular autonomous agent (e.g., "Dashboard for Agent auto_btc_scanner", "Live Agent Insights Panel").
*   The autonomous agent in the backend is running and configured to process certain market events.
*   A WebSocket connection is established between the frontend and the AG-UI event server.

**c. Manual Test Steps (User Actions):**
1.  Navigate to the UI page/dashboard that displays information for the specific autonomous agent being monitored.
2.  Observe the initial state/analysis displayed for the agent.
3.  (Requires backend coordination or knowledge of triggers) Induce a condition in the backend that would cause the autonomous agent to process new data and update its analysis. This could be:
    *   Waiting for a natural market data event if the agent is live.
    *   Manually triggering a mock market data event in a test environment that the backend `MarketDataService` picks up and broadcasts.
4.  Observe the relevant sections of the agent's UI view for any changes, such as updated analysis text, new insight displayed, status change, or "last updated" timestamp.

**d. Expected Frontend Behavior & UI Updates:**
*   **Initial State:** The UI displays the agent's current known state/analysis.
*   **API Calls:** Primarily, no direct API calls are made by the frontend to *fetch* this update. The update is *pushed* from the server.
*   **AG-UI Event Reception (WebSockets):**
    *   The frontend receives an AG-UI event through its WebSocket connection, e.g.:
        *   `AGENT_STATE_UPDATE_EVENT: {"agentId": "auto_btc_scanner", "updatedFields": {"latest_insight": "BTC shows bullish divergence on RSI.", "status": "Monitoring - Pattern Detected"}, "timestamp": "..."}`
        *   Or a more specific event like `NEW_AGENT_INSIGHT_EVENT: {"agentId": "auto_btc_scanner", "insight": "...", "data_processed": {...}}`
*   **UI Updates (Dynamic):**
    *   Upon receiving the WebSocket event, the relevant UI components should update dynamically without a full page reload.
    *   For example, a text area displaying "Latest Insight" changes to the new insight.
    *   An agent status indicator might change color or text.
    *   A "Last Updated" timestamp refreshes.
    *   Associated charts might re-render if the event includes new data for them.
*   **Error Handling:**
    *   If the WebSocket connection is lost, the UI should indicate this (e.g., "Real-time updates disconnected. Attempting to reconnect...").
    *   If an error AG-UI event is received for the agent, it should be displayed appropriately.

**e. Key Assertions for Automated E2E Tests (Conceptual):**
*   **Tooling:** Playwright or Cypress.
*   **Element Targeting:**
    *   Target UI elements that display the agent's specific insights, status, or data that is expected to change (e.g., `cy.get('[data-testid="agent-auto_btc_scanner-insight"]')`).
*   **WebSocket Mocking/Injection:**
    *   The most reliable way to test this in isolation is to mock the WebSocket connection at the browser level or have a test utility that can "inject" a simulated AG-UI event as if it came from the server.
    *   Example (conceptual Cypress):
        ```javascript
        // Before navigating to the page, or on page load:
        cy.window().then((win) => {
          const mockWebSocket = { send: cy.stub(), close: cy.stub(), onmessage: null, onopen: null, onerror: null };
          // Store onmessage to trigger it later
          win.mockedWebSocketInstance = mockWebSocket;
          cy.stub(win, 'WebSocket').returns(mockWebSocket);
        });

        cy.visit('/dashboard/agent/auto_btc_scanner');
        // ... wait for initial UI to load ...

        // Simulate receiving a WebSocket message
        cy.window().its('mockedWebSocketInstance.onmessage').then(onMessageCallback => {
          onMessageCallback({
            data: JSON.stringify({
              eventType: "AGENT_STATE_UPDATE_EVENT",
              payload: { agentId: "auto_btc_scanner", updatedFields: { "latest_insight": "New insight from E2E test." } }
            })
          });
        });
        ```
*   **Assertions:**
    *   Verify that the UI element (e.g., the insight text area) updates to reflect the data from the injected/mocked WebSocket event.
        *   `cy.get('[data-testid="agent-auto_btc_scanner-insight"]').should('contain', 'New insight from E2E test.')`.
    *   Check for "Last Updated" timestamps changing, if applicable.
    *   Ensure no unintended full page reloads occur.

---

*Disclaimer: These testing scenarios are conceptual and based on the assumed architecture and UI components described in related documents. Actual test implementation will depend heavily on the final frontend application's code, chosen E2E testing tools, and the specific details of the WebSocket event handling and state management within the frontend.*
