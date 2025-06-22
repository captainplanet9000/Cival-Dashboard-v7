# AG-UI Event Streaming: Conceptual Testing Guidelines

## Introduction

This document provides a conceptual framework and general guidelines for testing the real-time event streaming functionality from backend agent systems (AG) to a User Interface (UI) via WebSockets. It assumes a WebSocket server is responsible for managing client connections and broadcasting AG-UI specific events. Actual test implementation will depend heavily on the specific architecture.

## 1. Prerequisites for Testing

Effective testing of AG-UI event streaming requires:

*   **Access to WebSocket Server Implementation:** Understanding the server's architecture, how it handles connections, message sources, and event broadcasting logic is crucial, even if some tests are black-box.
*   **Clear AG-UI Event Definitions:** Well-defined event types (e.g., `TASK_STATUS_UPDATE`, `NEW_TRADE_EVENT`, `MARKET_DATA_CHART_UPDATE`, `ERROR_NOTIFICATION`) and their expected JSON payload structures/schemas are essential for validation.
*   **Understanding of Event Translation:** Knowledge of how backend Agent-to-Agent (A2A) messages (e.g., `trade_executed` from `TradingCoordinator`, `market_data_update` from `MarketDataService`) are captured and translated into the specific AG-UI events that the WebSocket server broadcasts. This might involve:
    *   `A2AProtocol` using a message bus (like Redis Pub/Sub) that the WebSocket server also subscribes to.
    *   A dedicated "AG-UI Event Service" that consumes A2A messages and pushes structured UI events to the WebSocket server.
    *   Services directly calling an API on the WebSocket server to publish events.

## 2. Testing the WebSocket Server Logic

These tests focus on the WebSocket server's functionality as an intermediary and broadcaster.

### Connection Handling:
*   **Successful Connections:** Verify that clients can establish WebSocket connections successfully.
*   **Disconnections:** Test both graceful client-initiated disconnections and server-initiated disconnections. Ensure resources are cleaned up.
*   **Connection Errors:** Simulate network issues or abrupt client closures to see how the server handles them.
*   **Authentication/Authorization (if applicable):**
    *   If the WebSocket server requires authentication (e.g., via a token in the connection handshake), test with valid and invalid credentials.
    *   Test authorization for subscribing to certain event types or rooms if such logic exists.

### Event Broadcasting/Forwarding:
This depends on how the WebSocket server receives events from the backend.

*   **Scenario 1: Server listens to A2A messages (e.g., via Redis Pub/Sub):**
    *   **Test Setup:** Your test environment should allow publishing mock A2A messages to the message bus (e.g., Redis channel) that the WebSocket server monitors.
    *   **Verification:**
        1.  Simulate publishing a valid A2A message (e.g., a JSON string representing a `trade_executed` event).
        2.  Assert that the WebSocket server correctly receives and deserializes this message.
        3.  Assert that the server transforms this A2A message into the appropriate AG-UI event format.
        4.  Verify that the server broadcasts this AG-UI event to all relevant connected WebSocket clients (or specific rooms/topics).
*   **Scenario 2: Services directly push events to WebSocket server:**
    *   **Test Setup:** Use mocking to simulate a backend service calling the WebSocket server's API/method for publishing an event.
    *   **Verification:**
        1.  Call the mocked interface with sample AG-UI event data.
        2.  Verify the WebSocket server correctly broadcasts this event to its connected clients.

### Room/Topic Management (if applicable):
If the UI can subscribe to specific event streams (e.g., updates for `agent_X`, data for `chart_Y`, events for `task_Z`):
*   **Subscription Logic:** Test that a client can send a "subscribe" message for a valid room/topic and the server acknowledges it. Test with invalid topics.
*   **Message Filtering:** When an event is intended for a specific room/topic, verify that only clients subscribed to that room/topic receive it. Other connected clients should not.
*   **Unsubscription Logic:** Test that clients can unsubscribe from rooms/topics.

### Error Handling:
*   **Malformed Input:** Test how the server handles malformed messages from its source (e.g., invalid JSON from Redis, incorrect data types in direct pushes). It should log errors and not crash.
*   **Internal Processing Errors:** Simulate errors during event transformation or broadcasting (e.g., a serialization issue). The server should handle these gracefully, log them, and potentially notify an admin or a specific client if the error is isolated.

### Scalability/Load (Conceptual):
*   While unit and integration tests ensure correctness, they don't typically test performance under load.
*   Conceptually, load testing would involve:
    *   Simulating a large number of concurrent WebSocket clients.
    *   Generating a high volume of backend events.
    *   Measuring server resource usage (CPU, memory, network), event delivery latency, and error rates.
    *   Tools like k6 (with WebSocket support), Locust, or dedicated WebSocket testing tools (e.g., `thor`) can be used for this specialized form of testing.

## 3. Testing Event Reception (End-to-End Concept)

These tests verify that the entire pipeline from backend event generation to UI reception works as expected.

### Test Client:
*   Develop a test client using a WebSocket client library (e.g., the `websockets` library in Python). This client will act as a simulated UI frontend, connecting to the AG-UI WebSocket server and listening for events.

### Scenario-Based Testing:
*   Define end-to-end test scenarios that mimic real user interactions or system events.
*   **Example Scenario (Task Progress Update):**
    1.  The WebSocket test client connects to the server and sends a message to subscribe to updates for a specific `taskId` (e.g., `task_123`).
    2.  The test orchestrator triggers an action in the backend that would cause a task managed by an agent to make progress (e.g., an API call that starts a sub-process of `task_123`).
    3.  This backend action results in an A2A message (e.g., `task_progress_a2a_event`).
    4.  The A2A message is processed, translated into an AG-UI event (e.g., `TASK_PROGRESS_UI_EVENT` with payload `{"taskId": "task_123", "progress": 50, "status": "running"}`).
    5.  The WebSocket server broadcasts this AG-UI event.
    6.  The WebSocket test client, subscribed to `task_123`, asserts that it receives the `TASK_PROGRESS_UI_EVENT` within an acceptable timeframe and that the payload matches the expected structure and content for `task_123`.
*   **Coverage:** Design scenarios to cover:
    *   Different types of AG-UI events (status updates, data changes, notifications, errors).
    *   Events triggered by various backend actions or services.
    *   Correct event delivery to clients based on subscriptions (if applicable).

### Data Validation:
*   The WebSocket test client is responsible for:
    *   Deserializing received JSON message payloads.
    *   Validating the structure of the payload against the predefined schema for that AG-UI event type (Pydantic models can be useful here too, even in the test client).
    *   Asserting the correctness of key data fields within the payload.

## 4. Tools for Testing

*   **Test Framework:** `pytest` (with `pytest-asyncio` for asynchronous operations) is a good choice for structuring and running tests in Python.
*   **WebSocket Client Library:** The `websockets` library in Python is excellent for creating test clients to interact with your WebSocket server.
*   **Mocking Libraries:** `unittest.mock` (part of Python's standard library) or `pytest-mock` for creating mocks and patching dependencies, which is crucial for isolating components during unit and integration tests of the WebSocket server itself.
*   **HTTP Client (for triggering actions):** `httpx` or `requests` if scenarios require making API calls to the backend to initiate event-generating actions.

## Disclaimer

These are conceptual guidelines. The actual implementation of tests will need to be adapted based on the specific architecture, technologies, and complexity of the AG-UI WebSocket server and the overall agent system.
