# Generic Query Optimization Guidelines for Python Services

This document provides general principles and strategies for optimizing database queries, particularly relevant for Python services like a `MemoryService` (handling agent memories) and a `SharedKnowledgeService` (managing shared knowledge bases, potentially including vector embeddings).

## 1. Database Indexing

Proper indexing is often the most effective way to improve query performance. Indexes allow the database to locate and retrieve data much faster than scanning entire tables.

*   **General Importance:**
    *   Index columns frequently used in `WHERE` clauses to filter data.
    *   Index columns used in `JOIN` conditions to speed up table joins.
    *   Index columns used in `ORDER BY` clauses to avoid costly sorting operations.
    *   Index columns used in `GROUP BY` clauses.
*   Be mindful that indexes also have a write-time cost (insertions, updates, deletions become slightly slower) and consume disk space. Create indexes strategically.

*   **Specific Examples for `MemoryService` (e.g., storing agent chat history, events, or learned information):**
    *   `agent_id`: Essential for quickly retrieving all memories for a specific agent.
    *   `timestamp` (or `created_at`): Useful for time-based filtering (e.g., "last 24 hours") and ordering memories chronologically. Consider a composite index with `agent_id` (e.g., `(agent_id, timestamp)`).
    *   `memory_type` (if applicable, e.g., "chat", "event", "reflection"): For filtering memories by their type.

*   **Specific Examples for `SharedKnowledgeService` (e.g., storing articles, documents, FAQs, potentially chunked and with embeddings):**
    *   Metadata fields:
        *   `document_id` or `article_id`: For retrieving specific documents.
        *   `tags`, `category`: For filtering by common classification terms.
        *   `author_id`, `source`: For filtering by origin.
        *   `created_at`, `updated_at`: For time-based queries.
    *   If text search is a primary feature, consider Full-Text Search indexes provided by your database (e.g., GIN/GiST in PostgreSQL).

*   **Specialized Indexing for Vector Data (for `SharedKnowledgeService` with embeddings):**
    *   When dealing with vector embeddings for similarity search, standard B-tree indexes are not effective.
    *   Utilize specialized vector indexes like:
        *   **HNSW (Hierarchical Navigable Small World):** Good for accuracy, build time can be long.
        *   **IVF (Inverted File Index) with Flat or PQ (Product Quantization):** Balances speed and accuracy.
        *   **Annoy (Approximate Nearest Neighbors Oh Yeah):** Space-efficient, good for read-heavy workloads.
    *   These are commonly available in dedicated vector databases (e.g., Pinecone, Weaviate, Milvus) or extensions like `pgvector` for PostgreSQL.

## 2. Efficient Query Patterns

Writing efficient SQL queries (or ORM equivalents) is crucial.

*   **Avoid N+1 Problems:**
    *   This occurs when you execute one query to fetch a list of items, and then N subsequent queries to fetch related data for each item.
    *   **Solution:** Use `JOIN` operations in SQL to fetch related data in a single query. If using an ORM, utilize its mechanisms for eager loading (e.g., `select_related` and `prefetch_related` in Django, `joinedload` or `selectinload` in SQLAlchemy).

*   **Select Only Necessary Columns:**
    *   Avoid `SELECT *`. Instead, explicitly list only the columns your application needs: `SELECT col1, col2, col3 FROM my_table;`.
    *   This reduces data transfer between the database and application, lowers memory usage, and can sometimes allow the database to use more efficient index-only scans.

*   **Use `EXPLAIN` (or equivalent):**
    *   Most databases provide a command (e.g., `EXPLAIN` or `EXPLAIN ANALYZE` in PostgreSQL) to show the query execution plan.
    *   Analyze this plan to understand how the database is accessing data, whether indexes are being used, and identify bottlenecks (e.g., full table scans, inefficient join methods).

## 3. Data Handling & Pagination

*   **Implement Pagination:**
    *   For queries that can return a large number of rows (e.g., listing all memories for an agent, browsing all knowledge articles), always implement pagination using `LIMIT` and `OFFSET` (or cursor-based pagination for better performance with very large datasets).
    *   This prevents overwhelming the application with data and improves user experience.

*   **Archiving or Summarizing Old Data (especially for `MemoryService`):**
    *   If the volume of data in `MemoryService` grows significantly over time (e.g., very long agent interaction histories), performance can degrade.
    *   Consider strategies for:
        *   **Archiving:** Moving older, less frequently accessed memories to a separate, cheaper storage solution.
        *   **Summarization:** Periodically creating summary memories and potentially pruning detailed older ones.

## 4. Connection Management

*   **Use Database Connection Pooling:**
    *   Establishing database connections can be resource-intensive. Connection pooling allows reusing existing connections instead of creating new ones for each request.
    *   Most web frameworks and database libraries provide mechanisms for connection pooling. Ensure it's configured appropriately for your expected load.

*   **Ensure Connections are Properly Closed/Released:**
    *   Leaked connections can exhaust database resources.
    *   Use `try...finally` blocks or context managers (`with ... as ...`) to ensure connections are always released back to the pool or closed, even if errors occur.

## 5. Vector Search Specifics (for `SharedKnowledgeService`)

When performing similarity searches on vector embeddings:

*   **Optimize Similarity Search Queries:**
    *   **Choice of Distance Metric:** Ensure the distance metric used (e.g., Cosine Similarity, Euclidean Distance, Dot Product) aligns with how the embeddings were trained and the nature of your data.
    *   **Filtering:**
        *   **Pre-filtering (Metadata Filtering):** If possible, filter results by metadata *before* performing the vector search. This reduces the number of vectors the similarity search needs to compare against. This is highly effective if your vector database or extension supports it efficiently.
        *   **Post-filtering:** Apply metadata filters *after* the vector search. Less efficient than pre-filtering but sometimes necessary.
    *   Tune parameters like `k` (number of nearest neighbors to retrieve) based on application needs.

*   **Batching Embedding Generation and Database Insertion:**
    *   When adding new knowledge articles, generate embeddings in batches rather than one by one.
    *   Similarly, insert new data (articles, chunks, and their embeddings) into the database in batches to reduce per-insert overhead.

## 6. Caching (Application-Level)

*   While database optimization is key, application-level caching can be a valuable complementary strategy.
*   For frequently accessed, rarely changing data (e.g., popular knowledge articles, common agent configurations derived from memory), consider using a caching layer like Redis (as recently implemented for other API endpoints).
*   This can further reduce database load and improve response times, especially if direct database optimizations have reached their limits or are complex to implement for specific query patterns.

## 7. Regular Monitoring & Profiling

Optimization is not a one-time task.

*   **Monitor Database Performance:** Keep an eye on key database metrics (CPU, memory, I/O, active connections, slow query logs).
*   **Profile Slow Queries:** Regularly identify and analyze slow queries that appear in production logs. Use `EXPLAIN` and other tools to understand their behavior and optimize them.
*   Database performance characteristics can change as data volume grows and query patterns evolve.
