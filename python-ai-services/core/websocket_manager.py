from collections import defaultdict
from typing import Dict, List, Optional
from fastapi import WebSocket
from loguru import logger
import json
import asyncio # For asyncio.gather in broadcast

# Adjust path if models are structured differently, e.g. from ..models.websocket_models
# Assuming 'python_ai_services' is the root package in PYTHONPATH
from python_ai_services.models.websocket_models import WebSocketEnvelope

class ConnectionManager:
    def __init__(self):
        # client_id -> WebSocket connection
        # Using a simple dict for now, assuming one connection per client_id.
        # For multiple connections per client_id (e.g., multiple browser tabs from same user),
        # this could be Dict[str, List[WebSocket]].
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        # If allowing multiple connections per client_id, this logic would append to a list:
        # if client_id not in self.active_connections:
        #     self.active_connections[client_id] = []
        # self.active_connections[client_id].append(websocket)
        self.active_connections[client_id] = websocket
        logger.info(f"WebSocket client '{client_id}' connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, client_id: str, websocket: Optional[WebSocket] = None): # Added websocket to handle specific instance if multiple per client
        # If self.active_connections stores a list:
        # if client_id in self.active_connections:
        #     if websocket and websocket in self.active_connections[client_id]:
        #         self.active_connections[client_id].remove(websocket)
        #         if not self.active_connections[client_id]: # If list is empty
        #             del self.active_connections[client_id]
        #         logger.info(f"WebSocket instance for client '{client_id}' disconnected.")
        #     elif not websocket: # Disconnect all for this client_id if specific websocket not provided
        #         del self.active_connections[client_id]
        #         logger.info(f"All WebSocket connections for client '{client_id}' disconnected.")
        # else: logger.warning(...)

        # Current simple implementation (one connection per client_id):
        if client_id in self.active_connections:
            # Optionally, verify if the disconnecting websocket is the one stored, if passed
            if websocket and self.active_connections[client_id] != websocket:
                logger.warning(f"Disconnect request for client '{client_id}' but different WebSocket instance provided. Disconnecting stored instance.")
            del self.active_connections[client_id]
            logger.info(f"WebSocket client '{client_id}' disconnected. Total clients: {len(self.active_connections)}")
        else:
            logger.warning(f"Attempted to disconnect unknown or already disconnected client_id: {client_id}")


    async def send_to_client(self, client_id: str, message: WebSocketEnvelope):
        websocket = self.active_connections.get(client_id)
        if websocket:
            try:
                await websocket.send_text(message.model_dump_json())
                logger.debug(f"Sent WebSocket message to client '{client_id}': {message.event_type}")
            except Exception as e:
                logger.error(f"Error sending WebSocket message to client '{client_id}': {e}. Removing connection.")
                # Pass the specific websocket instance to disconnect if applicable
                self.disconnect(client_id, websocket)
        else:
            logger.debug(f"No active WebSocket connection for client_id '{client_id}'. Message not sent.")

    async def broadcast_to_all(self, message: WebSocketEnvelope):
        if not self.active_connections:
            logger.info("No active WebSocket clients to broadcast to.")
            return

        logger.info(f"Broadcasting WebSocket message to all ({len(self.active_connections)}) clients: {message.event_type}")
        message_json = message.model_dump_json()

        # Iterate over a copy of items in case disconnect modifies the dict during iteration
        active_connections_copy = list(self.active_connections.items())

        tasks = []
        for client_id, websocket in active_connections_copy:
            # Check if connection still exists, as it might have been removed by a concurrent send_to_client error
            if client_id in self.active_connections and self.active_connections[client_id] == websocket:
                tasks.append(self._send_text_to_websocket(websocket, message_json, client_id))

        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    # The client_id for this failed task
                    failed_client_id = active_connections_copy[i][0]
                    # _send_text_to_websocket already handles disconnect on error,
                    # but good to log overall broadcast issues here.
                    logger.warning(f"Broadcast to client '{failed_client_id}' failed with exception: {result}")


    async def _send_text_to_websocket(self, websocket: WebSocket, message_json: str, client_id: str):
        """Helper to send text and handle potential disconnection for a single websocket."""
        try:
            await websocket.send_text(message_json)
        except Exception as e:
            logger.error(f"Error sending during broadcast to client '{client_id}': {e}. Removing connection.")
            self.disconnect(client_id, websocket)
            # Optionally, raise the exception if gather should handle it,
            # or return it to be logged by the gather loop.
            raise

# Singleton instance
connection_manager = ConnectionManager()
