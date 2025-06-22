# Deployment Guidelines for `python-ai-services`

## Introduction

This document outlines conceptual steps and best practices for packaging and deploying the `python-ai-services` application. It covers containerization with Docker, deployment to cloud platforms like Railway, and manual deployment using PM2 on a Virtual Private Server (VPS).

## 1. Packaging `python-ai-services` for Deployment

Containerizing the application using Docker is strongly recommended as it provides consistency across different environments and simplifies deployment.

### Recommendation for Docker:
Using Docker allows you to package the `python-ai-services` application with all its dependencies, Python runtime, and configurations into a portable image.

### Dockerfile Example:
Create a `Dockerfile` in the root of your project or alongside the `python-ai-services` directory.

```dockerfile
# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file first to leverage Docker cache
COPY ./python-ai-services/requirements.txt /app/requirements.txt

# Install any needed system dependencies (if any, e.g., for certain Python packages)
# RUN apt-get update && apt-get install -y --no-install-recommends some-package && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
# This assumes your python-ai-services directory contains main.py, services/, types/, etc.
# If you have other shared local modules (like 'utils' or 'strategies' at the project root),
# you'll need to adjust the COPY paths or ensure they are part of the python-ai-services structure.
COPY ./python-ai-services/ /app/

# Expose the port the app runs on
EXPOSE 9000

# Define the command to run the application
# This runs Uvicorn directly. For production, you might consider Gunicorn as a process manager in front of Uvicorn workers.
# CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-c", "./gunicorn_conf.py", "main:app"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
```

**Notes on the Dockerfile:**
*   Adjust the Python version (`python:3.9-slim`) as needed to match your project's requirements.
*   The `COPY ./python-ai-services/ /app/` line assumes that the `Dockerfile` is placed in the project root, and `python-ai-services` is a subdirectory. If your `Dockerfile` is inside `python-ai-services`, the copy path would be `COPY . /app/`.
*   The `CMD` uses Uvicorn directly. For more robust production deployments, you might use Gunicorn to manage Uvicorn workers (example commented out). This would require adding Gunicorn to `requirements.txt` and creating a `gunicorn_conf.py`.

### `.dockerignore` File:
Create a `.dockerignore` file in the same directory as your `Dockerfile` to prevent unnecessary files and folders from being copied into the Docker image, which helps keep the image size small and build times fast.

```
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
.venv/
.git/
.github/
.pytest_cache/
.mypy_cache/
*.log
local_settings.py
.env
```

## 2. Deployment on Railway (Conceptual)

Railway is a modern deployment platform that can simplify deploying containerized applications. The user documents referenced a `docker-compose.yml` for a Node.js service on Railway; for a Python service packaged with a Dockerfile, the process is often more direct.

*   **Direct Dockerfile Deployment:** Railway can typically build and deploy an application directly from a `Dockerfile` present in your repository. You would link your GitHub repository to a Railway project, and Railway would detect the `Dockerfile` and build/deploy it.

*   **Environment Variables:**
    *   **Crucial:** All configuration details must be set as environment variables within the Railway service settings. **Do not hardcode secrets or environment-specific configurations.**
    *   This includes:
        *   Supabase URL and an appropriate Supabase service key (e.g., `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`).
        *   Redis connection URL (e.g., `REDIS_URL`).
        *   API keys for any external services used by agents (e.g., `OPENAI_API_KEY`, `GEMINI_API_KEY`, ensuring these are read from environment variables as per `LLMConfig.api_key_env_var`).
        *   `PYTHONPATH=/app` (or similar, if your Dockerfile structure requires it for Python to find modules correctly, though often the `WORKDIR` and `COPY` setup handles this).
        *   Any other operational parameters (e.g., `LOG_LEVEL`).
    *   Refer to Railway's documentation for the specific UI or CLI commands to set these variables.

*   **Persistent Volumes (if needed):**
    *   The current design of `python-ai-services` seems to rely on external services (Supabase for database, Redis for cache/queue) for persistent state.
    *   If any part of the service were to require local file system persistence (e.g., temporary large file processing, specific types of local logging not sent to stdout), Railway supports persistent volumes. The user's example `agent-data:/app/data` indicates familiarity with this concept.

*   **Health Checks & Port Exposure:**
    *   Railway will automatically detect the port exposed by your Docker container (e.g., `EXPOSE 9000` in the Dockerfile).
    *   Railway typically uses HTTP health checks on a specified path to determine if a deployment is successful and healthy. The `/health` endpoint in `python-ai-services/main.py` is suitable for this purpose. Ensure Railway is configured to use this endpoint.

## 3. Deployment with PM2 on a VPS (Conceptual)

If deploying to a traditional Virtual Private Server (VPS), PM2 can be used to manage the Python/Uvicorn process.

*   **Prerequisites:**
    *   A configured VPS with Python (and virtual environment tools) installed.
    *   The project code cloned onto the VPS.
    *   Dependencies installed (e.g., `pip install -r requirements.txt` within a virtual environment).
    *   PM2 installed (`npm install pm2 -g`).

*   **Using the PM2 `ecosystem.config.js`:**
    *   Refer to the PM2 configuration example provided in `process_management_and_reliability.md` for `python-ai-services`. This configuration file defines how PM2 should run, monitor, and manage the Uvicorn process.
    *   Start the application using: `pm2 start ecosystem.config.js` (or the specific JSON file if you named it differently).

*   **Environment Variables with PM2:**
    *   Environment variables can be set directly within the `env` block of the PM2 `ecosystem.config.js` file for each application. This is generally the cleanest way for PM2.
    *   Alternatively, applications can use a library like `python-dotenv` to load variables from a `.env` file, but ensure this file is secured and not committed to the repository.

*   **Reverse Proxy (e.g., Nginx):**
    *   It is highly recommended to run a web server like Nginx as a reverse proxy in front of your PM2-managed Uvicorn process(es).
    *   **Benefits:**
        *   **SSL/TLS Termination:** Nginx can handle HTTPS, encrypting traffic between clients and the server.
        *   **Request Logging:** Centralized and more configurable request logging.
        *   **Serving Static Files:** If your application had static assets (not typical for this kind of pure API service).
        *   **Basic Load Balancing:** If running multiple instances of the service on the same VPS (PM2's cluster mode also provides this for Node.js, and for Python with Gunicorn+Uvicorn, Nginx can distribute to multiple Gunicorn instances).
        *   **Security:** Can provide an additional layer of security (e.g., rate limiting, IP blocking).
    *   Nginx would be configured to proxy requests to the port Uvicorn is running on (e.g., `localhost:9000`).

## 4. General Deployment Considerations

*   **Logging:**
    *   Ensure `python-ai-services` (using Loguru) is configured to log to `stdout` and `stderr`. This is standard practice for containerized applications and services managed by process managers like PM2, as these tools capture these streams for their logging facilities.
    *   Railway and other PaaS platforms typically collect logs from `stdout`/`stderr`.

*   **Database Migrations:**
    *   Any changes to the Supabase database schema (e.g., modifications to `agent_states`, `agent_memories`, or new tables) must be managed through migrations.
    *   Use the Supabase CLI for creating and applying migrations (e.g., `npx supabase migration new <migration_name>`, review the SQL, then `npx supabase db push` for local dev or `npx supabase migration up` for deploying to linked Supabase projects).
    *   **Crucial:** Apply database migrations *before* deploying new application code that depends on those schema changes to avoid runtime errors. This might involve a brief maintenance window or careful coordination if zero-downtime is required.
