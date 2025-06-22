import pytest
import pytest_asyncio
import asyncio
from unittest.mock import MagicMock, patch, mock_open, call
from pathlib import Path
import json
from datetime import datetime, timezone

from python_ai_services.services.learning_data_logger_service import LearningDataLoggerService
from python_ai_services.models.learning_models import LearningLogEntry

TEST_LOG_DIR = Path("test_learning_logs")
TEST_LOG_FILE = TEST_LOG_DIR / "test_events.jsonl"

@pytest.fixture(autouse=True) # Clean up test log dir/file after each test
def cleanup_test_log_file():
    if TEST_LOG_FILE.exists():
        TEST_LOG_FILE.unlink()
    if TEST_LOG_DIR.exists():
        # Check if directory is empty before removing, or remove recursively if safe
        if not any(TEST_LOG_DIR.iterdir()): # Only remove if empty
             TEST_LOG_DIR.rmdir()
        else: # If not empty, it might be due to a test failure not cleaning up a specific file
            pass # Or handle more aggressively if needed for test isolation
    yield # Test runs here
    if TEST_LOG_FILE.exists():
        TEST_LOG_FILE.unlink()
    if TEST_LOG_DIR.exists():
        if not any(TEST_LOG_DIR.iterdir()):
             TEST_LOG_DIR.rmdir()

@pytest.fixture
def learning_logger_service() -> LearningDataLoggerService:
    # Ensure the test log directory exists for the service instance
    # The service itself creates it, but for fixture setup, it's good to be explicit
    # if tests might run in parallel or have complex setup/teardown.
    # The autouse fixture above should handle cleanup.
    return LearningDataLoggerService(log_file_path=TEST_LOG_FILE)

def test_logger_service_init_creates_directory():
    assert TEST_LOG_DIR.exists()
    assert TEST_LOG_DIR.is_dir()

@patch('pathlib.Path.mkdir')
def test_logger_service_init_directory_creation_failure(mock_mkdir):
    mock_mkdir.side_effect = OSError("Test OS Error on mkdir")
    with pytest.raises(OSError, match="Could not create log directory"):
        LearningDataLoggerService(log_file_path=TEST_LOG_FILE) # Re-init to trigger error

@pytest.mark.asyncio
async def test_log_entry_writes_correct_jsonl(learning_logger_service: LearningDataLoggerService):
    entry_data = LearningLogEntry(
        primary_agent_id="agent123",
        source_service="TestService",
        event_type="TestEvent",
        data_snapshot={"key": "value", "number": 123},
        outcome_or_result={"status": "success"},
        notes="A test note.",
        tags=["test", "important"]
    )
    # We need to capture what's written to the file.
    # Patching _write_log_sync to inspect its input.
    with patch.object(learning_logger_service, '_write_log_sync', autospec=True) as mock_write_sync:
        await learning_logger_service.log_entry(entry_data)

        mock_write_sync.assert_called_once()
        written_string = mock_write_sync.call_args[0][0] # First arg of the call

        assert written_string.endswith("\n")
        # Deserialize the JSON part (without the newline)
        logged_json = json.loads(written_string.strip())

        assert logged_json["log_id"] == entry_data.log_id
        assert logged_json["primary_agent_id"] == "agent123"
        assert logged_json["source_service"] == "TestService"
        assert logged_json["event_type"] == "TestEvent"
        assert logged_json["data_snapshot"] == {"key": "value", "number": 123}
        assert logged_json["outcome_or_result"] == {"status": "success"}
        assert logged_json["notes"] == "A test note."
        assert logged_json["tags"] == ["test", "important"]
        # Timestamp is tricky to match exactly, check it exists and is recent-ish if needed
        assert "timestamp" in logged_json
        # Example: datetime.fromisoformat(logged_json["timestamp"]) close to entry_data.timestamp

@pytest.mark.asyncio
async def test_log_entry_actual_file_write(learning_logger_service: LearningDataLoggerService):
    # This test will actually write to the file
    entry1 = LearningLogEntry(source_service="FileTest", event_type="Write1", data_snapshot={"a":1})
    entry2 = LearningLogEntry(source_service="FileTest", event_type="Write2", data_snapshot={"b":2})

    await learning_logger_service.log_entry(entry1)
    await learning_logger_service.log_entry(entry2)

    assert TEST_LOG_FILE.exists()
    with open(TEST_LOG_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()

    assert len(lines) == 2
    data1 = json.loads(lines[0])
    data2 = json.loads(lines[1])

    assert data1["log_id"] == entry1.log_id
    assert data1["event_type"] == "Write1"
    assert data2["log_id"] == entry2.log_id
    assert data2["event_type"] == "Write2"

@pytest.mark.asyncio
@patch('python_ai_services.services.learning_data_logger_service.LearningDataLoggerService._write_log_sync')
async def test_log_entry_handles_write_sync_io_error(
    mock_write_sync: MagicMock,
    learning_logger_service: LearningDataLoggerService,
    caplog
):
    mock_write_sync.side_effect = IOError("Disk full simulation")
    entry = LearningLogEntry(source_service="TestIOError", event_type="IOErrorTest", data_snapshot={})

    # The error in _write_log_sync is re-raised and should be caught by the general Exception in log_entry
    # if the executor propagates it, or just logged if not.
    # Current implementation of log_entry catches all exceptions from prepare/schedule.
    # And _write_log_sync re-raises, which might be caught by run_in_executor's wrapper.
    # Let's assume the error is logged by the logger inside _write_log_sync or log_entry.

    await learning_logger_service.log_entry(entry) # Should not raise here due to try/except in log_entry

    # Check if the error was logged by the service's logger
    assert "IOError writing to learning log" in caplog.text
    assert "Disk full simulation" in caplog.text
    # Or, if _write_log_sync re-raises and log_entry catches it:
    assert "Failed to prepare or schedule learning log entry for writing" in caplog.text


@pytest.mark.asyncio
async def test_log_entry_handles_serialization_failure(learning_logger_service: LearningDataLoggerService, caplog):
    # Create an entry that cannot be serialized by Pydantic's model_dump_json
    class NonSerializable:
        pass

    entry_bad_data = LearningLogEntry(
        source_service="BadDataTest",
        event_type="SerializationFail",
        data_snapshot={"unserializable": NonSerializable()} # This will cause model_dump_json to fail
    )

    # Patch _write_log_sync because we don't expect to reach it
    with patch.object(learning_logger_service, '_write_log_sync') as mock_write_sync:
        await learning_logger_service.log_entry(entry_bad_data)
        mock_write_sync.assert_not_called() # Should fail before writing

    assert "Failed to prepare or schedule learning log entry for writing" in caplog.text
    # Pydantic v2 might raise a PydanticSerializationError or similar.
    # Pydantic v1 might raise TypeError from json.dumps.
    # The exact error message for serialization failure can vary.
    # Example check:
    assert "is not JSON serializable" in caplog.text or "PydanticSerializationError" in caplog.text
