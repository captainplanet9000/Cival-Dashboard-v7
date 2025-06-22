# Supabase Data Integrity & Backup Guidelines for Cival Dashboard

## Introduction

This document outlines key considerations and best practices for maintaining data integrity, ensuring robust backup and recovery procedures, and handling sensitive data within the Supabase database powering the Cival Dashboard. These guidelines are based on the observed database schemas and common operational needs.

## 1. Review of Defined Schemas

Based on the provided SQL schemas and system descriptions, key tables involved in storing agent-related data include:

*   **`public.agent_states`:**
    *   Stores the primary state of individual agents.
    *   `agent_id` (TEXT, Primary Key): Unique identifier for the agent.
    *   `state` (JSONB): Stores the agent's current operational state, likely including its configuration, ongoing analysis, or status.
    *   `memory_references` (JSONB): Likely stores identifiers or metadata linking to related entries in `agent_memories`.
    *   `created_at`, `updated_at` (TIMESTAMPTZ): Standard timestamps. The `updated_at` field is automatically managed by the `handle_updated_at` trigger.
    *   Row Level Security (RLS) is enabled for this table.

*   **`public.agent_memories`:**
    *   Designed to store agent memories, including textual content and vector embeddings for similarity search.
    *   `id` (UUID, Primary Key): Unique identifier for each memory entry.
    *   `agent_id` (TEXT): Associates the memory with a specific agent.
    *   `content` (TEXT): The textual content of the memory.
    *   `embedding` (vector with pgvector): Stores the vector embedding of the content. An IVFFlat index is defined on this column for efficient similarity searches.
    *   `metadata` (JSONB): Can store additional structured information about the memory (e.g., source, type, importance).
    *   `created_at`, `updated_at` (TIMESTAMPTZ): Standard timestamps.

*   **Other Potential Tables (Inferred):**
    *   `agent_configurations`: For storing reusable agent setups or strategies.
    *   `llm_configurations`: For different LLM API settings.
    *   `trades`: For logging simulated or real trades.
    *   `agent_tasks`: For tracking the status and results of tasks executed by agents or crews.

## 2. Supabase Backup & Recovery Recommendations

A robust backup and recovery strategy is crucial for business continuity.

*   **Automated Daily Backups:**
    *   Supabase typically provides automated daily backups for projects on paid plans.
    *   **Action:** Verify that automated backups are active for the Cival Dashboard's Supabase project and understand the retention period provided by the current plan.

*   **Point-in-Time Recovery (PITR):**
    *   PITR allows restoring the database to a specific moment in time, which is invaluable for recovering from accidental data deletion, corruption, or erroneous batch operations.
    *   The availability and retention window for PITR (e.g., 7, 14, or 30 days) depend on the Supabase project's subscription plan.
    *   **Action:** Understand the PITR capabilities and retention window available under the current Supabase plan.

*   **Manual Backups/Exports:**
    *   **When:** Perform manual backups before significant events such as:
        *   Major application upgrades.
        *   Complex data migrations.
        *   Risky batch data operations.
        *   Especially important if on a Supabase free plan with limited automated backup features or retention.
    *   **How (using `pg_dump`):**
        *   Connect to the Supabase database using connection details found in the Supabase dashboard (Database -> Connection Pooling).
        *   Use the `pg_dump` command-line utility:
            ```bash
            pg_dump "postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/postgres" -Fc --file="cival_dashboard_backup_YYYYMMDD.dump"
            ```
        *   Store these manual backups securely in a separate location (e.g., encrypted cloud storage).
    *   **Data Export (CSV/JSON):**
        *   For specific tables, Supabase allows exporting data directly from its dashboard UI into CSV or other formats. This can be useful for archival, auditing, or small-scale migrations.

*   **Testing Recovery:**
    *   Periodically (e.g., quarterly or bi-annually) test the backup recovery process.
    *   This involves restoring a backup to a separate, temporary Supabase project or a local PostgreSQL instance.
    *   **Goal:** Ensure that backups are valid, the recovery procedure is well-understood, and estimate the time required for recovery.

## 3. Data Integrity & Consistency

Maintaining data integrity ensures the reliability and accuracy of the information stored.

*   **Row Level Security (RLS):**
    *   The `agent_states` table has RLS enabled (`ALTER TABLE public.agent_states ENABLE ROW LEVEL SECURITY;`).
    *   **Action:** Ensure that comprehensive RLS policies are defined and rigorously tested. Even for a solo operator system, RLS is a good security practice to limit the scope of potential errors or vulnerabilities. Policies should restrict read/write access based on appropriate criteria (e.g., a user ID associated with agents, service role keys for backend services).

*   **Foreign Keys & Relationships:**
    *   While the provided snippets for `agent_states` and `agent_memories` don't explicitly show foreign keys between them, consider their use for maintaining referential integrity.
    *   For example, if `agent_memories.agent_id` should always correspond to a valid agent, a foreign key constraint to an `agents` or `agent_configurations` table (if such a table exists or is planned) would be beneficial.
    *   `FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE` (Use `ON DELETE CASCADE` with caution, or `ON DELETE SET NULL/RESTRICT`).

*   **Data Validation:**
    *   **Application-Level (Python):** Pydantic models used in `python-ai-services` provide robust validation for data before it's written to the database. This is the primary line of defense for data structure and type correctness.
    *   **Database-Level (JSONB):**
        *   Fields like `state` (in `agent_states`) and `metadata` (in `agent_memories`) are JSONB, offering flexibility.
        *   **Trade-off:** This flexibility can lead to inconsistent data structures within the JSON if not carefully managed at the application level.
        *   **Consideration:** If certain JSON structures within these fields become critical and have a fixed schema, PostgreSQL allows for JSON schema validation using `CHECK` constraints. For example:
            ```sql
            ALTER TABLE public.agent_states
            ADD CONSTRAINT state_schema_valid
            CHECK (my_json_schema_is_valid(state));
            -- my_json_schema_is_valid would be a custom function or use JSON schema validation operators
            ```
            However, this adds complexity at the database level, and often, rigorous application-level validation with Pydantic is sufficient and more maintainable.

*   **pgvector Indexing:**
    *   The defined index `CREATE INDEX ON public.agent_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);` is appropriate for optimizing similarity searches with `pgvector` using cosine distance.
    *   This ensures that vector-based memory retrieval is performant, contributing to data usability.

## 4. Handling Sensitive Data

Protecting sensitive information is paramount.

*   **API Keys & Secrets (LLMs, Brokers, etc.):**
    *   **DO NOT store raw API keys or secrets directly in database tables like `agent_states` or `agent_configurations`.**
    *   **Best Practice:** Use environment variables that are securely injected into the application runtime. The `LLMConfig` Pydantic model's `api_key_env_var: Optional[str]` field suggests this pattern is intended – the application reads the API key from the environment variable named in this field.
        *   For deployments (e.g., Railway, Docker), use the platform's secret management features.
        *   For local development, use `.env` files (added to `.gitignore`).
    *   **Supabase Vault:** If secrets absolutely *must* be stored in a way that the database has access to them (less ideal for application API keys), use Supabase Vault. Vault encrypts secrets at rest and provides controlled access. This might be more relevant for database-level secrets or configurations used by Postgres functions, rather than application API keys.

*   **Sensitive PII or Financial Data:**
    *   If the system evolves to handle Personally Identifiable Information (PII) or highly sensitive financial details (beyond just trade signals, e.g., linked bank account details – which is NOT implied by current docs but a future consideration):
        *   Evaluate Supabase's platform-level encryption.
        *   For extremely sensitive fields, consider application-level encryption before storing data in the database, or use database column encryption features if available and appropriate.

## 5. Regular Audits & Reviews (Conceptual)

*   **Periodic Reviews:** Schedule regular reviews (e.g., every 6-12 months or after major system changes) of:
    *   RLS policies: Ensure they are still appropriate and correctly enforced.
    *   Database access permissions: Review who/what has access to the database and with what privileges.
    *   Data handling practices in application code.
    *   Backup and recovery procedures, including test recovery results.
*   **Stay Updated:** Keep abreast of Supabase security advisories and best practice recommendations.

By implementing these guidelines, the Cival Dashboard can maintain a higher level of data integrity, security, and resilience.
