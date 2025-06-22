# Cival Dashboard - Advanced Algorithmic Trading Platform

A comprehensive, production-ready algorithmic trading dashboard built with Next.js, featuring real-time market data, AI-powered strategies, paper trading, risk management, and MCP (Model Context Protocol) server integration.

## 🚀 Features

### Core Trading Features
- **Paper Trading Engine** - Risk-free strategy testing with realistic market simulation
- **Real-time Market Data** - Live price feeds with WebSocket connections
- **Strategy Management** - Create, deploy, and monitor algorithmic trading strategies
- **Risk Management** - Comprehensive risk metrics, VaR, and position monitoring
- **Backtesting Engine** - Historical strategy performance analysis
- **Performance Analytics** - Detailed P&L tracking and performance metrics

### Advanced Infrastructure
- **MCP Server Integration** - Model Context Protocol for AI agent coordination
- **Vault Banking Integration** - Secure financial services and compliance management
- **Redis Caching** - High-performance data caching and session management
- **Real-time Updates** - WebSocket-based live data streaming
- **Multi-service Architecture** - Microservices with Docker orchestration

### User Interface
- **Modern Dashboard** - Dark/light mode with responsive design
- **Interactive Charts** - Advanced charting with TradingView-style interface
- **Real-time Alerts** - Smart notifications and alert management
- **Strategy Builder** - Visual strategy configuration interface
- **Portfolio Management** - Multi-account portfolio tracking

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Next.js        │    │  Trading API    │    │  MCP Server     │
│  Dashboard      │◄──►│  (Port 3001)    │◄──►│  (Port 3000)    │
│  (Port 5000)    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐             │
         │              │  Vault Service  │             │
         └─────────────►│  (Port 3002)    │◄────────────┘
                        └─────────────────┘
                                 │
                    ┌─────────────────┐    ┌─────────────────┐
                    │  Redis Cache    │    │  PostgreSQL     │
                    │  (Port 6379)    │    │  (Port 5432)    │
                    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd cival-dashboard
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
npm run setup:env

# Edit .env.local with your API keys
# See env.template for all required variables
```

### 3. Start Redis (Required)
```bash
# Start Redis using Docker
npm run redis:start

# Verify Redis is running
npm run redis:logs
```

### 4. Development Mode
```bash
# Start the dashboard in development mode
npm run dev

# Dashboard will be available at http://localhost:5000
```

## 🐳 Docker Deployment

### Local Development with Docker
```bash
# Start all services
npm run docker:dev

# Stop all services
npm run docker:down
```

### Production Deployment
```bash
# Build and start production containers
npm run docker:prod

# View logs
docker-compose logs -f

# Stop and cleanup
npm run docker:down
```

## 📊 Available Services

### Dashboard (Port 5000)
- Main trading interface
- Strategy management
- Portfolio analytics
- Real-time charts

### Trading API (Port 3001)
- Paper trading engine
- Market data feeds
- Order management
- Risk calculations

### MCP Server (Port 3000)
- AI agent coordination
- Tool calling interface
- Workflow management
- System orchestration

### Vault Service (Port 3002)
- Banking integration
- Compliance management
- Transaction processing
- Fund management

### Redis Cache (Port 6379)
- Session management
- Real-time data caching
- WebSocket state
- Performance optimization

### PostgreSQL (Port 5432)
- Trading data storage
- User management
- Historical data
- System configuration

## 🛠️ Development

### Available Scripts
```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run type-check      # TypeScript type checking

# Testing
npm run test            # Run unit tests
npm run test:ui         # Test with UI
npm run e2e             # End-to-end tests

# Redis Management
npm run redis:start     # Start Redis container
npm run redis:stop      # Stop Redis container
npm run redis:logs      # View Redis logs

# Docker Management
npm run docker:build    # Build dashboard image
npm run docker:run      # Run dashboard container
npm run docker:dev      # Start development stack
npm run docker:prod     # Start production stack
npm run docker:down     # Stop all containers
npm run docker:clean    # Clean up Docker resources

# Utilities
npm run clean           # Clean build cache
npm run install:clean   # Fresh npm install
npm run setup:env       # Setup environment file
```

### Project Structure
```
cival-dashboard/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── dashboard/          # Dashboard pages
│   │   ├── api/                # API routes
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   ├── ui/                 # Base UI components
│   │   ├── trading/            # Trading-specific components
│   │   ├── charts/             # Chart components
│   │   └── layout/             # Layout components
│   ├── lib/                    # Utility libraries
│   │   ├── clients/            # API clients
│   │   ├── services/           # Business logic services
│   │   ├── stores/             # State management (Zustand)
│   │   └── utils/              # Helper functions
│   └── types/                  # TypeScript type definitions
│       ├── trading.ts          # Trading-related types
│       ├── mcp.ts              # MCP server types
│       ├── vault.ts            # Vault banking types
│       └── common.ts           # Shared types
├── services/                   # Backend microservices
│   ├── trading-api/            # Trading engine service
│   ├── mcp-server/             # MCP coordination service
│   ├── vault-service/          # Banking integration
│   └── visualization/          # Python visualization service
├── docker-compose.yml          # Production Docker config
├── Dockerfile                  # Dashboard container config
└── env.template               # Environment variables template
```

## 🔧 Configuration

### Environment Variables
Copy `env.template` to `.env.local` and configure:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# API Endpoints
TRADING_API_URL=http://localhost:3001
MCP_API_URL=http://localhost:3000
VAULT_API_URL=http://localhost:3002

# API Keys
TRADING_API_KEY=your_trading_api_key
VAULT_API_KEY=your_vault_api_key
ANTHROPIC_API_KEY=your_anthropic_key

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/trading

# Feature Flags
ENABLE_PAPER_TRADING=true
ENABLE_REAL_TRADING=false
ENABLE_BACKTESTING=true
```

### Trading Configuration
- **Paper Trading**: Risk-free trading with virtual funds
- **Strategy Parameters**: Configurable risk limits and position sizing
- **Market Data**: Real-time and historical data sources
- **Risk Management**: VaR calculations and position limits

### MCP Integration
- **Agent Coordination**: AI agent management and communication
- **Tool Calling**: Integrated tool execution and monitoring
- **Workflow Management**: Automated trading workflows
- **System Monitoring**: Health checks and performance metrics

## 📈 Usage Examples

### Creating a Paper Trading Account
```typescript
import { tradingClient } from '@/lib/clients/trading-client';

const account = await tradingClient.createPaperAccount(
  'My Strategy Account',
  100000 // Initial balance: $100,000
);
```

### Placing a Trade Order
```typescript
const order = await tradingClient.placeOrder(accountId, {
  account_id: accountId,
  symbol: 'AAPL',
  order_type: 'limit',
  side: 'buy',
  quantity: 100,
  price: 150.00,
  time_in_force: 'gtc'
});
```

### Using MCP Tools
```typescript
import { mcpClient } from '@/lib/clients/mcp-client';

const result = await mcpClient.callTool(
  'trading-server',
  'analyze_market',
  { symbol: 'AAPL', timeframe: '1h' }
);
```

### Real-time Market Data
```typescript
import { tradingClient } from '@/lib/clients/trading-client';

// Connect to real-time data
await tradingClient.connectMarketData();

// Subscribe to symbol updates
tradingClient.on('market_data', (data) => {
  console.log('New market data:', data);
});

await tradingClient.subscribeToSymbol('AAPL');
```

## 🚀 Deployment

### Railway Deployment
1. **Prepare Environment Variables**
   ```bash
   # Set all required environment variables in Railway dashboard
   ```

2. **Deploy Services**
   ```bash
   # Deploy dashboard
   railway up

   # Deploy each microservice separately
   cd services/trading-api && railway up
   cd services/mcp-server && railway up
   cd services/vault-service && railway up
   ```

3. **Database Setup**
   ```bash
   # Provision PostgreSQL and Redis on Railway
   # Update connection strings in environment variables
   ```

### AWS/Google Cloud Deployment
- Use Docker Compose for container orchestration
- Configure load balancers for high availability
- Set up monitoring and logging
- Implement auto-scaling for traffic spikes

## 🔍 Monitoring & Debugging

### Health Checks
```bash
# Check all service health
curl http://localhost:5000/api/health
curl http://localhost:3001/api/health
curl http://localhost:3000/api/health
curl http://localhost:3002/api/health
```

### Redis Monitoring
```bash
# Connect to Redis CLI
docker exec -it redis-cival redis-cli

# Monitor commands
MONITOR

# Check memory usage
INFO memory
```

### Logs
```bash
# View dashboard logs
npm run dev

# View Docker service logs
docker-compose logs -f trading-api
docker-compose logs -f mcp-server
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 API Documentation

### Trading API Endpoints
- `GET /api/market-data/{symbol}` - Get market data
- `POST /api/paper-trading/accounts` - Create trading account
- `POST /api/paper-trading/accounts/{id}/orders` - Place order
- `GET /api/strategies` - List trading strategies

### MCP API Endpoints
- `GET /api/mcp/servers` - List MCP servers
- `POST /api/mcp/tools/call` - Execute tool
- `GET /api/mcp/coordination` - Get coordination state
- `POST /api/mcp/workflows/start` - Start workflow

### WebSocket Events
- `market_data` - Real-time price updates
- `order_update` - Order status changes
- `position_update` - Position changes
- `alert` - Trading alerts

## 🔐 Security

- All API keys are encrypted and stored securely
- Redis connections use authentication
- Database connections are SSL encrypted
- Rate limiting on all API endpoints
- Input validation and sanitization
- CORS configuration for cross-origin requests

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## 🆘 Support

- **Documentation**: See `/docs` directory for detailed guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Community**: Join our Discord server for discussions
- **Email**: support@cival-trading.com

---

**Built with ❤️ by the Cival Trading Team**
