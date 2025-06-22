# Railway Deployment Plan for Trading Farm

This deployment plan outlines how to set up the entire Trading Farm system on Railway, leveraging Railway's platform for seamless deployment, scaling, and monitoring.

## Railway Platform Benefits

- **Zero infrastructure management**
- **Automatic deployments** from GitHub
- **Built-in monitoring and logging**
- **Easy environment variable management**
- **Horizontal scaling** capabilities
- **Global edge deployment** for low latency

## System Architecture Overview

The system will be deployed as interconnected services on Railway:

```
┌──────────────────────── Railway Platform ────────────────────────┐
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Frontend│  │ FastAPI │  │ Trading      │  │ Background     │  │
│  │ Next.js │  │  API    │  │ Agents       │  │ Workers        │  │
│  └─────────┘  └─────────┘  └──────────────┘  └────────────────┘  │
│        │           │               │                 │           │
│        └───────────┴───────────────┴─────────────────┘           │
│                             │                                    │
│                      ┌──────────────┐                            │
│                      │   Shared     │                            │
│                      │ Environment  │                            │
│                      └──────────────┘                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌──────────────────┐
    │   Supabase      │           │     Redis        │
    │  (External)     │           │    (External)    │
    └─────────────────┘           └──────────────────┘
```

## Step 1: Railway Project Setup (0.5 days)

1. Create a new Railway project:
   ```
   railway login
   railway init
   ```

2. Configure project settings:
   - Set up GitHub integration
   - Configure team access
   - Set up project variables

## Step 2: Configure Supabase Connection (0.5 days)

1. Get your Supabase connection details:
   - Database URL
   - API Key
   - JWT Secret

2. Add these as Railway environment variables:
   ```
   railway variables set SUPABASE_URL=https://your-project.supabase.co
   railway variables set SUPABASE_ANON_KEY=your-anon-key
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## Step 3: Configure Redis Connection (0.5 days)

1. Get your Redis connection details:
   - Redis URL
   - Redis Password (if applicable)

2. Add these as Railway environment variables:
   ```
   railway variables set REDIS_URL=redis://your-redis-host:6379
   railway variables set REDIS_PASSWORD=your-redis-password
   ```

## Step 4: Deploy Frontend (Next.js) (1 day)

1. Prepare the frontend repository:
   ```bash
   cd cival-dashboard
   
   # Create a Railway configuration file
   cat > railway.json << EOF
   {
     "schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "nixpacksVersion": "1.6.0",
       "buildCommand": "npm run build"
     },
     "deploy": {
       "startCommand": "npm start",
       "healthcheckPath": "/api/health",
       "healthcheckTimeout": 300,
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   EOF
   ```

2. Deploy to Railway:
   ```
   railway up
   ```

3. Configure custom domain (optional):
   ```
   railway domain
   ```

## Step 5: Deploy FastAPI Backend (1 day)

1. Prepare the backend repository:
   ```bash
   cd python-ai-services
   
   # Create requirements.txt if not exists
   cat > requirements.txt << EOF
   fastapi>=0.95.0
   uvicorn>=0.21.1
   pydantic>=1.10.7
   supabase>=1.0.3
   redis>=4.5.4
   httpx>=0.24.0
   openbb>=3.0.0
   pandas>=2.0.0
   numpy>=1.24.3
   zipline-reloaded>=2.5.0
   vectorbt>=0.25.0
   alphalens>=0.4.0
   riskfolio-lib>=4.0.0
   crewai>=0.1.0
   EOF
   
   # Create Railway configuration
   cat > railway.json << EOF
   {
     "schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "nixpacksVersion": "1.6.0"
     },
     "deploy": {
       "startCommand": "uvicorn api.main:app --host 0.0.0.0 --port \$PORT",
       "healthcheckPath": "/health",
       "healthcheckTimeout": 300,
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   EOF
   ```

2. Deploy to Railway:
   ```
   railway up
   ```

## Step 6: Deploy Trading Agents (1 day)

1. Create a separate service for trading agents:
   ```bash
   cd python-ai-services
   railway service create trading-agents
   
   # Create agent-specific configuration
   cat > railway.json << EOF
   {
     "schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "nixpacksVersion": "1.6.0"
     },
     "deploy": {
       "startCommand": "python agents/main.py",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10,
       "sleepApplication": false
     }
   }
   EOF
   ```

2. Deploy to Railway:
   ```
   railway up
   ```

3. **Important**: Configure the service to never sleep
   - Go to Railway dashboard
   - Select trading-agents service
   - Go to Settings > General
   - Disable "Sleep application when inactive"

## Step 7: Deploy Background Workers (1 day)

1. Create a separate service for background tasks:
   ```bash
   cd python-ai-services
   railway service create background-workers
   
   # Create worker-specific configuration
   cat > railway.json << EOF
   {
     "schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "nixpacksVersion": "1.6.0"
     },
     "deploy": {
       "startCommand": "python workers/main.py",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10,
       "sleepApplication": false
     }
   }
   EOF
   ```

2. Deploy to Railway:
   ```
   railway up
   ```

3. **Important**: Configure the service to never sleep
   - Go to Railway dashboard
   - Select background-workers service
   - Go to Settings > General
   - Disable "Sleep application when inactive"

## Step 8: Shared Environment Variables (0.5 days)

Set up shared environment variables across all services:

```bash
railway variables set \
  NODE_ENV=production \
  LOG_LEVEL=info \
  OPENAI_API_KEY=your-openai-key \
  TRADING_API_KEY=your-trading-api-key \
  JWT_SECRET=your-jwt-secret
```

## Step 9: Configure Webhooks and Integrations (1 day)

1. Set up GitHub integration for CI/CD:
   - Connect Railway project to GitHub repositories
   - Configure automatic deployments on push

2. Set up monitoring webhooks:
   - Slack/Discord notifications for deployment events
   - Error alerting via webhook

3. Configure custom domains and SSL (if needed)

## Step 10: Scheduled Tasks with GitHub Actions (1 day)

Since Railway doesn't have built-in cron jobs, use GitHub Actions:

1. Create `.github/workflows/scheduled-tasks.yml` in your repository:

```yaml
name: Scheduled Tasks

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC

jobs:
  daily-maintenance:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger maintenance endpoint
        run: |
          curl -X POST ${{ secrets.API_MAINTENANCE_URL }} \
            -H "Authorization: Bearer ${{ secrets.API_KEY }}" \
            -H "Content-Type: application/json" \
            --data '{"task": "daily-maintenance"}'
```

## Step 11: Monitoring and Logging (1 day)

1. Set up Railway monitoring:
   - Configure alert thresholds
   - Set up notification channels

2. Add custom logging in your applications:
   ```python
   # In Python code
   import logging
   import os
   
   logging.basicConfig(
       level=os.getenv("LOG_LEVEL", "INFO"),
       format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
   )
   ```

3. Set up log forwarding (optional):
   - Configure Railway to forward logs to a third-party service

## Step 12: Backup Strategy (1 day)

1. Create a separate service for database backups:
   ```bash
   railway service create db-backup
   
   # Create backup script
   cat > backup.py << EOF
   import os
   import subprocess
   import datetime
   import boto3
   
   # Run backup and upload to S3
   def backup_to_s3():
       timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
       filename = f"backup_{timestamp}.sql.gz"
       
       # Get database URL from environment
       db_url = os.getenv("DATABASE_URL")
       
       # Run pg_dump
       subprocess.run(f"pg_dump {db_url} | gzip > {filename}", shell=True, check=True)
       
       # Upload to S3
       s3 = boto3.client('s3')
       s3.upload_file(filename, os.getenv("S3_BUCKET"), f"backups/{filename}")
       
       # Clean up
       os.remove(filename)
       
   if __name__ == "__main__":
       backup_to_s3()
   EOF
   
   # Create Railway configuration
   cat > railway.json << EOF
   {
     "schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "nixpacksVersion": "1.6.0"
     },
     "deploy": {
       "startCommand": "python backup.py",
       "cron": "0 0 * * *"
     }
   }
   EOF
   ```

2. Configure S3 credentials:
   ```
   railway variables set \
     AWS_ACCESS_KEY_ID=your-access-key \
     AWS_SECRET_ACCESS_KEY=your-secret-key \
     S3_BUCKET=your-backup-bucket
   ```

## Step 13: Testing and Verification (1 day)

1. Test each service endpoint:
   ```bash
   # Test FastAPI
   curl https://your-api-url.railway.app/health
   
   # Test WebSocket connections
   wscat -c wss://your-api-url.railway.app/ws
   ```

2. Verify environment variables are correctly set:
   ```bash
   railway run printenv
   ```

3. Test interactions between services

## Step 14: Documentation (0.5 days)

Create deployment documentation:

1. Service architecture diagram
2. Environment variable list
3. Deployment procedures
4. Rollback procedures
5. Monitoring instructions

## Scaling Considerations

1. **Railway Pro Plan**: Required for production workloads
2. **Instance Sizes**: 
   - Frontend: Starter (512MB RAM)
   - API: Standard (1GB RAM)
   - Trading Agents: Business (2GB RAM)
   - Background Workers: Standard (1GB RAM)
3. **Auto-scaling**:
   - Configure auto-scaling for API instances
   - Keep trading agents at fixed capacity

## Disaster Recovery Plan

1. **Service Failure**:
   - Railway automatically restarts failed services
   - Manual restart: `railway service restart [service-name]`

2. **Data Recovery**:
   - Restore from S3 backup
   - Point-in-time recovery from Supabase

3. **Complete Rebuild**:
   - Re-deploy all services from GitHub repositories
   - Restore database from backup

## Total Implementation Time

- Initial setup and deployment: ~9.5 days
- Testing and verification: ~1 day
- **Total**: ~10.5 days (2 weeks)