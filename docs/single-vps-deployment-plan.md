# Single VPS Deployment Plan for Trading Farm

This deployment plan outlines how to set up the entire Trading Farm system on a single VPS, ensuring 24/7 availability for all components including trading agents, data collection, and the dashboard.

## VPS Requirements

- **Recommended Specifications**:
  - 4+ CPU cores
  - 8+ GB RAM
  - 100+ GB SSD storage
  - Ubuntu 22.04 LTS
- **Providers**:
  - DigitalOcean ($40-80/month)
  - Linode ($40-80/month)
  - Vultr ($40-80/month)
  - Hetzner ($30-60/month - best value)

## System Architecture Overview

All components will run on a single VPS using Docker containers orchestrated with Docker Compose:

```
┌─────────────────────── Single VPS ───────────────────────┐
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐  │
│  │ Frontend│  │ FastAPI │  │  Redis  │  │   Python    │  │
│  │ Next.js │  │  API    │  │ Server  │  │ AI Services │  │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────┘  │
│        │           │            │              │         │
│        └───────────┴────────────┴──────────────┘         │
│                           │                              │
│  ┌─────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │  Database   │  │  Monitoring   │  │   Scheduled    │  │
│  │  (Postgres) │  │  (Prometheus) │  │    Tasks       │  │
│  └─────────────┘  └───────────────┘  └────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Step 1: Initial VPS Setup (1 day)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install -y docker.io docker-compose

# Set up system user
sudo adduser tradingfarm
sudo usermod -aG docker tradingfarm
```

## Step 2: Directory Structure Setup (0.5 days)

```bash
# As tradingfarm user
mkdir -p ~/trading-farm
cd ~/trading-farm

# Create directories
mkdir -p data/postgres data/redis logs backups

# Clone repositories
git clone https://github.com/yourusername/cival-dashboard.git
git clone https://github.com/yourusername/python-ai-services.git
```

## Step 3: Docker Compose Configuration (1 day)

Create `docker-compose.yml` in the root directory:

```yaml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:14
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_DB: ${POSTGRES_DB}
    restart: always
    ports:
      - "5432:5432"

  # Redis for caching and messaging
  redis:
    image: redis:alpine
    volumes:
      - ./data/redis:/data
    restart: always
    ports:
      - "6379:6379"

  # Next.js frontend
  frontend:
    build:
      context: ./cival-dashboard
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  # FastAPI backend
  api:
    build:
      context: ./python-ai-services
      dockerfile: Dockerfile.api
    restart: always
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  # Python AI services for trading
  trading_agents:
    build:
      context: ./python-ai-services
      dockerfile: Dockerfile.agents
    restart: always
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
      - api

  # Monitoring with Prometheus and Grafana
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    restart: always

  grafana:
    image: grafana/grafana
    volumes:
      - ./data/grafana:/var/lib/grafana
    ports:
      - "3001:3000"
    restart: always
    depends_on:
      - prometheus
      
  # Scheduled backups
  backup:
    image: postgres:14
    volumes:
      - ./backups:/backups
      - ./backup.sh:/backup.sh
    environment:
      - PGPASSWORD=${POSTGRES_PASSWORD}
    entrypoint: ["/bin/bash", "/backup.sh"]
    depends_on:
      - postgres
```

## Step 4: Create Environment Files (0.5 days)

Create `.env` file:

```
# Database
POSTGRES_USER=tradingfarm
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=tradingfarm

# API Keys
OPENAI_API_KEY=your_api_key
TRADING_API_KEY=your_trading_api_key

# Security
JWT_SECRET=your_jwt_secret
```

## Step 5: Dockerfiles (1 day)

### Frontend Dockerfile (cival-dashboard/Dockerfile)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

### API Dockerfile (python-ai-services/Dockerfile.api)

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Trading Agents Dockerfile (python-ai-services/Dockerfile.agents)

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir openbb pandas numpy zipline-reloaded vectorbt alphalens riskfolio-lib

COPY . .

CMD ["python", "agents/main.py"]
```

## Step 6: Monitoring and Logging Setup (1 day)

### Prometheus Configuration (prometheus.yml)

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['api:8000']
  
  - job_name: 'trading_agents'
    static_configs:
      - targets: ['trading_agents:8080']
  
  - job_name: 'node'
    static_configs:
      - targets: ['frontend:3000']
```

### Backup Script (backup.sh)

```bash
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/tradingfarm_$TIMESTAMP.sql"

echo "Creating backup $BACKUP_FILE"
pg_dump -h postgres -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 7 days of backups
find /backups -type f -name "tradingfarm_*.sql.gz" -mtime +7 -delete

echo "Backup completed"
```

## Step 7: Deployment (1 day)

```bash
# Start all services
cd ~/trading-farm
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Step 8: Security Configuration (1 day)

```bash
# Install and configure UFW firewall
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Install and configure Fail2Ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Step 9: Reverse Proxy with Nginx (1 day)

```bash
# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/tradingfarm

# Enable site
sudo ln -s /etc/nginx/sites-available/tradingfarm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Set up SSL
sudo certbot --nginx -d yourdomain.com
```

## Step 10: Automated Maintenance (0.5 days)

Create cron jobs for maintenance:

```bash
# Add to crontab
crontab -e

# Add these lines:
0 2 * * * cd ~/trading-farm && docker-compose exec trading_agents python scripts/daily_maintenance.py
0 3 * * 0 cd ~/trading-farm && docker-compose restart trading_agents
0 4 * * * cd ~/trading-farm && docker system prune -af --volumes
```

## Step 11: Monitoring and Alerting (1 day)

Set up Grafana dashboards and alerts:

1. Access Grafana at http://your-vps-ip:3001
2. Configure data source (Prometheus)
3. Import dashboards for Node.js, Python, and Postgres
4. Configure alerting via email or webhook

## Recovery Plan

### Service Failure Recovery

```bash
# Restart specific service
docker-compose restart [service_name]

# View logs for diagnostics
docker-compose logs -f [service_name]

# Complete restart of all services
docker-compose down
docker-compose up -d
```

### System Backup Recovery

```bash
# Restore database from backup
gunzip -c /path/to/backup.sql.gz | docker-compose exec -T postgres psql -U tradingfarm -d tradingfarm
```

## Maintenance Schedule

- **Daily**: Automated health checks (via cron)
- **Weekly**: Service restarts for memory cleanup
- **Monthly**: System updates and security patches
- **Quarterly**: Full backup verification and restore test

## Scaling Considerations

When a single VPS becomes insufficient, consider:

1. **Vertical Scaling**: Upgrade VPS to a larger instance
2. **Component Separation**: Move database to dedicated instance
3. **Load Balancing**: Add multiple API instances behind load balancer
4. **Dedicated Services**: Move trading agents to specialized instances

## Total Implementation Time

- Initial setup and deployment: ~7.5 days
- Testing and verification: ~2 days
- **Total**: ~9.5 days (2 weeks)