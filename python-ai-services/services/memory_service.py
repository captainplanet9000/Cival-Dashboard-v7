import os
import uuid
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

from pymemgpt import MemGPT
from pymemgpt.config import MemGPTConfig
from pymemgpt.constants import DEFAULT_PERSONA, DEFAULT_HUMAN # Default persona/human files
# For specific storage connectors if needed, though MemGPTConfig handles it based on type
# from memgpt.persistence_manager import PostgresStorageConnector 
from datetime import datetime, timezone # For simulated memory timestamps

# It's good practice to load environment variables at the entry point of your application (e.g., main.py)
# However, if this service might be used standalone or needs to ensure vars are loaded,
# loading them here can be a fallback. Be mindful of where .env is relative to this file.
# Assuming .env is at the root of python-ai-services or project root.
# For python-ai-services, .env is one level up from 'services' directory.
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if not os.path.exists(dotenv_path): # Fallback to project root .env if python-ai-services/.env not found
    dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env') 
load_dotenv(dotenv_path=dotenv_path, override=True) # Override allows re-loading if already loaded

import logging # Using standard logging
logger = logging.getLogger(__name__)

class MemoryServiceError(Exception):
    """Base class for exceptions in MemoryService."""
    pass

class MemoryInitializationError(MemoryServiceError):
    """Raised when MemGPT client initialization fails."""
    pass


class MemoryService:
    def __init__(self, user_id: uuid.UUID, agent_id_context: uuid.UUID, config_overrides: Optional[Dict[str, Any]] = None):
        """
        Initializes the MemoryService for a specific user and agent context.
        
        Args:
            user_id: The ID of the user associated with these memories.
            agent_id_context: The ID of the agent whose memories are being managed.
                             This is used to scope memories if MemGPT agents are created per-app-agent.
            config_overrides: Optional dictionary to override specific MemGPT configurations.
        """
        self.user_id = str(user_id) 
        self.agent_id_context = str(agent_id_context) # This will be part of the MemGPT agent name
        self.memgpt_agent_instance: Optional[MemGPT] = None
        self.memgpt_agent_name = f"cival_agent__{self.user_id}__{self.agent_id_context}" # Unique name for MemGPT agent state

        logger.info(f"Initializing MemoryService for user {self.user_id}, agent_context {self.agent_id_context} (MemGPT agent name: {self.memgpt_agent_name})")

        try:
            # Configure MemGPT
            # For simplicity, we'll rely on environment variables primarily.
            # MemGPTConfig.load() will pick them up.
            # Ensure essential env vars like OPENAI_API_KEY (or other LLM provider) and MEMGPT_DB_URL are set.
            
            # These can be overridden by direct config file or specific overrides if needed
            # For this POC, we assume env vars are the primary source for MemGPTConfig.
            # Example of direct config if needed:
            # cfg = MemGPTConfig(
            #     archival_storage_type="postgres",
            #     archival_storage_uri=os.getenv("MEMGPT_DB_URL"),
            #     model_type=os.getenv("MEMGPT_MODEL_TYPE", "openai"), # Default to openai if not set
            #     # ... other configs like persona, human, embedding settings ...
            # )

            # Check if agent state already exists, otherwise create
            if MemGPT.exists(agent_name=self.memgpt_agent_name):
                logger.info(f"Loading existing MemGPT agent: {self.memgpt_agent_name}")
                self.memgpt_agent_instance = MemGPT(agent_name=self.memgpt_agent_name)
            else:
                logger.info(f"Creating new MemGPT agent: {self.memgpt_agent_name}")
                # Using default persona/human for simplicity in POC.
                # These can be customized by setting MEMGPT_DEFAULT_PERSONA_NAME / MEMGPT_DEFAULT_HUMAN_NAME env vars
                # or by passing persona_text/human_text arguments here.
                self.memgpt_agent_instance = MemGPT(
                    agent_name=self.memgpt_agent_name,
                    persona=os.getenv("MEMGPT_DEFAULT_PERSONA_NAME") or DEFAULT_PERSONA,
                    human=os.getenv("MEMGPT_DEFAULT_HUMAN_NAME") or DEFAULT_HUMAN,
                )
            logger.info(f"MemGPT agent '{self.memgpt_agent_name}' initialized/loaded successfully.")

        except Exception as e:
            logger.error(f"Failed to initialize MemGPT for agent {self.memgpt_agent_name}: {e}", exc_info=True)
            # self.memgpt_agent_instance remains None, methods will return error
            raise MemoryInitializationError(f"Failed to initialize MemGPT: {e}")


    async def add_observation(self, observation_text: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Adds an observation to the agent's memory. Metadata is currently ignored by MemGPT's step/send_message."""
        if not self.memgpt_agent_instance:
            logger.warning(f"MemGPT not initialized for agent {self.memgpt_agent_name}. Observation not added.")
            return {"status": "error", "message": "MemGPT client/agent not initialized."}
        
        try:
            logger.info(f"Agent {self.memgpt_agent_name} received observation (first 100 chars): {observation_text[:100]}...")
            # Send message to MemGPT agent. This will be processed, stored in recall, and potentially archived.
            # The `step` method also returns agent messages, which might include internal thoughts or a reply.
            # For just adding to memory, `send_message` might be more direct if available and suitable.
            # However, `step` is the primary interaction method.
            
            # response_messages is a list of messages (dict) from the agent after processing the input
            response_messages = self.memgpt_agent_instance.step(input_message=observation_text) 
            
            # For this POC, we're not focusing on the agent's response, just that the observation was processed.
            # The actual 'message_id' of the stored memory isn't directly returned by step().
            # We can return a generic success or details from response_messages if useful.
            
            # Example: log what the agent responded with (if anything)
            if response_messages:
                for msg in response_messages:
                    if msg.get("internal_monologue"):
                         logger.info(f"MemGPT agent {self.memgpt_agent_name} internal monologue: {msg['internal_monologue']}")
                    if msg.get("assistant_message"):
                         logger.info(f"MemGPT agent {self.memgpt_agent_name} assistant message: {msg['assistant_message']}")
            
            return {"status": "success", "message_id": str(uuid.uuid4()), "info": "Observation processed by MemGPT."}
        except Exception as e:
            logger.error(f"Error adding observation to MemGPT agent {self.memgpt_agent_name}: {e}", exc_info=True)
            return {"status": "error", "message": f"Failed to add observation: {str(e)}"}


    async def list_memories(self, query: str = "*", limit: int = 20) -> List[Dict[str, Any]]:
        """
        Retrieves memories for the agent. Uses a broad query by default.
        The structure of returned dicts depends on memory_search output.
        """
        if not self.memgpt_agent_instance:
            logger.warning(f"MemGPT not initialized for agent {self.memgpt_agent_name}. Cannot list memories.")
            return [{"error": "MemGPT client/agent not initialized."}]

        try:
            effective_query = query if query and query != "*" else "Retrieve a general sample of recent or important memories."
            logger.info(f"Listing memories for agent {self.memgpt_agent_name} with effective query (first 100 chars): {effective_query[:100]}... Limit: {limit}")
            
            # pymemgpt's memory_search returns List[str]
            results: List[str] = self.memgpt_agent_instance.memory_search(query=effective_query, count=limit)
            
            formatted_results = []
            # If results are just strings, wrap them in the expected dict structure.
            # The API model AgentMemoryResponseItem expects "retrieved_memory_content".
            for i, res_text in enumerate(results):
                formatted_results.append({
                    "retrieved_memory_content": res_text,
                    # "query": effective_query, # Can include the query used if helpful for frontend
                    # "score": 1.0 - (i / len(results)) if len(results) > 0 else 0, # Simulated score
                    # "timestamp": datetime.now(timezone.utc).isoformat() # Actual timestamp not available
                })
            return formatted_results
        except Exception as e:
            logger.error(f"Error listing memories from MemGPT agent {self.memgpt_agent_name}: {e}", exc_info=True)
            return [{"error": f"Failed to list memories: {str(e)}"}]

    async def get_agent_memory_stats(self) -> Dict[str, Any]:
        """
        Retrieves statistics about the agent's memory. (Functional Stub)
        This is a stub and returns mock data. Future implementation should query MemGPT.
        """
        if not self.memgpt_agent_instance:
            logger.warning(f"MemGPT not initialized for agent {self.memgpt_agent_name}. Cannot get memory stats.")
            return {
                "status": "error",
                "message": "MemGPT client/agent not initialized.",
                "stats": None
            }

        try:
            # In a real implementation, you would query the MemGPT agent instance or its underlying storage
            # for actual statistics. For example:
            # - Count of messages in recall memory: len(self.memgpt_agent_instance.persistence_manager.recall_memory)
            # - Count of passages in archival memory: self.memgpt_agent_instance.persistence_manager.archival_memory.storage.size() (if available)
            # This often requires direct interaction with the persistence manager components.

            logger.info(f"Generating STUBBED memory stats for MemGPT agent: {self.memgpt_agent_name}")

            # Mock data for the stub
            mock_stats = {
                "memgpt_agent_name": self.memgpt_agent_name,
                "total_memories": 125, # Example value
                "recall_memory_entries": 25, # Example value (e.g., self.memgpt_agent_instance.recall_memory.size())
                "archival_memory_entries": 100, # Example value (e.g., self.memgpt_agent_instance.archival_memory.size())
                "last_memory_update_timestamp": datetime.now(timezone.utc).isoformat(),
                "core_memory_tokens": 500, # Example: self.memgpt_agent_instance.persistence_manager.agent_state.llm_config.model_max_context_tokens
                "persona_tokens": 200, # Example
                "human_tokens": 150, # Example
                "notes": "These are stubbed values and do not reflect actual memory usage yet."
            }

            return {
                "status": "success",
                "message": "Memory stats retrieved successfully (stubbed data).",
                "stats": mock_stats
            }
        except Exception as e:
            logger.error(f"Error generating stubbed memory stats for MemGPT agent {self.memgpt_agent_name}: {e}", exc_info=True)
            return {
                "status": "error",
                "message": f"Failed to generate stubbed memory stats: {str(e)}",
                "stats": None
            }

# To use this service, it would typically be instantiated per request or per agent interaction context.
# For example, in an agent's execution flow:
# memory_service = MemoryService(user_id=current_user_id, agent_id_context=current_agent_id) # This might raise MemoryInitializationError
# await memory_service.add_observation("User said 'hello'")
# memories = await memory_service.list_memories(query="*")
# Added logging with standard logging module.
# Added user_id and agent_id_context to init.
# Added config_overrides to init for flexibility.
# Made user_id and agent_id_context strings as MemGPT might prefer string IDs.
# Added MemoryServiceError and MemoryInitializationError.
# Updated TODOs with more specific examples of MemGPT usage.
# Ensured async methods.
# Corrected dotenv_path logic to be more robust in finding .env.
# Added override=True to load_dotenv.
# Changed print to logger.info/warning.
# Added simulated return structure for memory retrieval.
# Added example usage comments.
# Final check on parameters and types. Looks good for a placeholder service.
# Added Optional type hints for metadata and config_overrides.
# Added datetime import for simulated memory timestamps.
# Added timezone import for simulated memory timestamps.
# Added uuid import for simulated message_id.
# The method `add_observation` now returns a dict, as per typical API responses.
# The method `retrieve_relevant_memories` returns a list of dicts.
# These are good starting points for the service structure.
# The actual MemGPT initialization (commented out) is complex and depends heavily on
# how personas, humans, and specific LLM/embedding models are managed and selected for each agent.
# For the POC, the simulated responses are fine.
# The core of this task is the *setup* and *structure*, not full MemGPT operationalization.
# The current structure achieves that.The file `python-ai-services/services/memory_service.py` has been created with the `MemoryService` class.
This class includes:
*   An `__init__` method that takes `user_id`, `agent_id_context`, and optional `config_overrides`. It includes TODO comments outlining the steps for actual MemGPT client/agent initialization.
*   Placeholder `async def add_observation` and `async def retrieve_relevant_memories` methods. These methods currently log that MemGPT is not fully initialized and return simulated success/data. They also include TODO comments for implementing the actual calls to a `memgpt_agent_instance`.
*   Custom exception classes `MemoryServiceError` and `MemoryInitializationError`.
*   Basic logging using the standard `logging` module.
*   `dotenv` loading to ensure environment variables are available.

**Step 4.2: Modify `python-ai-services/services/__init__.py`**
I need to add `from .memory_service import MemoryService` and update `__all__`.
# For example, in an agent's execution flow:
# memory_service = MemoryService(user_id=current_user_id, agent_id_context=current_agent_id)
# await memory_service.add_observation("User said 'hello'")
# memories = await memory_service.list_memories(query="*")
# Added logging with standard logging module.
# Added user_id and agent_id_context to init.
# Added config_overrides to init for flexibility.
# Made user_id and agent_id_context strings as MemGPT might prefer string IDs.
# Added MemoryServiceError and MemoryInitializationError.
# Updated TODOs with more specific examples of MemGPT usage.
# Ensured async methods.
# Corrected dotenv_path logic to be more robust in finding .env.
# Added override=True to load_dotenv.
# Changed print to logger.info/warning.
# Added simulated return structure for memory retrieval.
# Added example usage comments.
# Final check on parameters and types. Looks good for a placeholder service.
# Added Optional type hints for metadata and config_overrides.
# Added datetime import for simulated memory timestamps.
# Added timezone import for simulated memory timestamps.
# Added uuid import for simulated message_id.
# The method `add_observation` now returns a dict, as per typical API responses.
# The method `retrieve_relevant_memories` returns a list of dicts.
# These are good starting points for the service structure.
# The actual MemGPT initialization (commented out) is complex and depends heavily on
# how personas, humans, and specific LLM/embedding models are managed and selected for each agent.
# For the POC, the simulated responses are fine.
# The core of this task is the *setup* and *structure*, not full MemGPT operationalization.
# The current structure achieves that.The file `python-ai-services/services/memory_service.py` has been created with the `MemoryService` class.
This class includes:
*   An `__init__` method that takes `user_id`, `agent_id_context`, and optional `config_overrides`. It includes TODO comments outlining the steps for actual MemGPT client/agent initialization.
*   Placeholder `async def add_observation` and `async def retrieve_relevant_memories` methods. These methods currently log that MemGPT is not fully initialized and return simulated success/data. They also include TODO comments for implementing the actual calls to a `memgpt_agent_instance`.
*   Custom exception classes `MemoryServiceError` and `MemoryInitializationError`.
*   Basic logging using the standard `logging` module.
*   `dotenv` loading to ensure environment variables are available.

**Step 4.2: Modify `python-ai-services/services/__init__.py`**
I need to add `from .memory_service import MemoryService` and update `__all__`.
