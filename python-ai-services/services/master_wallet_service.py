"""
Phase 9: Master Wallet Service + React Components
Enhanced HD wallet generation, multi-chain support, and performance-based capital allocation
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from dataclasses import dataclass, asdict
import hashlib
import secrets
import json
from enum import Enum

from web3 import Web3
from eth_account import Account
import redis.asyncio as redis

from ..models.master_wallet_models import (
    MasterWallet, MasterWalletConfig, WalletAddress, WalletBalance,
    FundAllocation, FundDistributionRule, WalletTransaction,
    WalletPerformanceMetrics, CreateMasterWalletRequest,
    FundAllocationRequest, FundCollectionRequest
)
from ..core.service_registry import get_registry

logger = logging.getLogger(__name__)

class ChainType(Enum):
    """Supported blockchain networks"""
    ETHEREUM = "ethereum"
    BINANCE_SMART_CHAIN = "bsc"
    POLYGON = "polygon"
    ARBITRUM = "arbitrum"
    OPTIMISM = "optimism"
    AVALANCHE = "avalanche"
    SOLANA = "solana"
    BITCOIN = "bitcoin"

class WalletStatus(Enum):
    """Wallet status states"""
    ACTIVE = "active"
    PAUSED = "paused"
    LOCKED = "locked"
    ARCHIVED = "archived"
    ERROR = "error"

@dataclass
class HDWalletKey:
    """HD wallet key information"""
    derivation_path: str
    public_key: str
    address: str
    chain_type: ChainType
    key_index: int
    created_at: datetime
    is_active: bool = True

@dataclass
class AdvancedPerformanceMetrics:
    """Advanced wallet performance metrics"""
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    total_pnl: Decimal
    total_pnl_percentage: float
    max_drawdown: float
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    volatility: float
    avg_trade_duration: float  # in hours
    profit_factor: float
    largest_win: Decimal
    largest_loss: Decimal
    consecutive_wins: int
    consecutive_losses: int
    recovery_factor: float
    risk_adjusted_return: float
    monthly_returns: List[float]
    performance_score: float  # Composite score 0-100

@dataclass
class AllocationRule:
    """Capital allocation rules"""
    rule_id: str
    name: str
    description: str
    min_performance_score: float
    max_allocation_percentage: float
    min_allocation_amount: Decimal
    max_allocation_amount: Decimal
    risk_multiplier: float
    rebalance_frequency: str  # 'daily', 'weekly', 'monthly'
    conditions: Dict[str, Any]
    is_active: bool
    created_at: datetime

@dataclass
class WalletAllocation:
    """Current wallet allocation"""
    wallet_id: str
    allocation_amount: Decimal
    allocation_percentage: float
    performance_score: float
    risk_score: float
    last_rebalance: datetime
    target_allocation: Decimal
    actual_allocation: Decimal
    deviation_percentage: float
    allocation_rule_id: str

class MasterWalletService:
    """
    Master wallet service for autonomous trading system
    Phase 9: Enhanced HD wallet generation, multi-chain support, performance-based allocation
    """
    
    def __init__(self, redis_client=None, supabase_client=None):
        self.registry = get_registry()
        self.redis = redis_client
        self.supabase = supabase_client
        
        # Service dependencies
        self.event_service = None
        self.crypto_service = None
        self.analytics_service = None
        self.goal_service = None
        
        # Multi-chain Web3 connections
        self.web3_connections: Dict[str, Web3] = {}
        self.chain_configs = {
            "ethereum": {"chain_id": 1, "rpc_url": "https://eth.llamarpc.com"},
            "polygon": {"chain_id": 137, "rpc_url": "https://polygon.llamarpc.com"},
            "bsc": {"chain_id": 56, "rpc_url": "https://bsc.llamarpc.com"},
            "arbitrum": {"chain_id": 42161, "rpc_url": "https://arb1.arbitrum.io/rpc"},
            "optimism": {"chain_id": 10, "rpc_url": "https://optimism.llamarpc.com"},
            "avalanche": {"chain_id": 43114, "rpc_url": "https://avalanche.llamarpc.com"}
        }
        
        # HD wallet derivation paths
        self.default_derivation_paths = {
            ChainType.ETHEREUM: "m/44'/60'/0'/0",
            ChainType.BINANCE_SMART_CHAIN: "m/44'/60'/0'/0",
            ChainType.POLYGON: "m/44'/60'/0'/0", 
            ChainType.ARBITRUM: "m/44'/60'/0'/0",
            ChainType.OPTIMISM: "m/44'/60'/0'/0",
            ChainType.AVALANCHE: "m/44'/60'/0'/0",
            ChainType.SOLANA: "m/44'/501'/0'/0",
            ChainType.BITCOIN: "m/44'/0'/0'/0"
        }
        
        # Active wallets cache
        self.active_wallets: Dict[str, MasterWallet] = {}
        self.hd_wallet_keys: Dict[str, List[HDWalletKey]] = {}
        self.allocation_history: List[Dict[str, Any]] = []
        
        # Performance tracking
        self.performance_cache: Dict[str, AdvancedPerformanceMetrics] = {}
        
        # Performance calculation settings
        self.performance_lookback_days = 90
        self.rebalance_threshold = 0.05  # 5% deviation triggers rebalance
        self.max_allocation_per_wallet = 0.25  # 25% max per wallet
        
        # Auto-distribution settings
        self.auto_distribution_enabled = True
        self.distribution_interval = 300  # 5 minutes
        
        logger.info("MasterWalletService Phase 9 initialized")
    
    async def initialize(self):
        """Initialize the master wallet service"""
        try:
            # Get required services
            self.event_service = self.registry.get_service("wallet_event_streaming_service")
            self.crypto_service = self.registry.get_service("crypto_service")
            self.analytics_service = self.registry.get_service("analytics_service")
            self.goal_service = self.registry.get_service("intelligent_goal_service")
            
            # Initialize Web3 connections
            await self._initialize_web3_connections()
            
            # Load active wallets from database
            await self._load_active_wallets()
            
            # Start background tasks
            asyncio.create_task(self._auto_distribution_loop())
            asyncio.create_task(self._performance_monitoring_loop())
            asyncio.create_task(self._periodic_rebalance())
            asyncio.create_task(self._update_performance_metrics())
            
            logger.info("MasterWalletService Phase 9 initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize MasterWalletService: {e}")
            raise
    
    async def _initialize_web3_connections(self):
        """Initialize Web3 connections for all supported chains"""
        for chain_name, config in self.chain_configs.items():
            try:
                web3 = Web3(Web3.HTTPProvider(config["rpc_url"]))
                if web3.is_connected():
                    self.web3_connections[chain_name] = web3
                    logger.info(f"Connected to {chain_name} (Chain ID: {config['chain_id']})")
                else:
                    logger.warning(f"Failed to connect to {chain_name}")
            except Exception as e:
                logger.error(f"Error connecting to {chain_name}: {e}")
    
    async def _load_active_wallets(self):
        """Load active wallets from database"""
        try:
            if self.supabase:
                response = self.supabase.table('master_wallets').select('*').eq('is_active', True).execute()
                
                for wallet_data in response.data:
                    wallet = MasterWallet.parse_obj(wallet_data)
                    self.active_wallets[wallet.wallet_id] = wallet
                    
                logger.info(f"Loaded {len(self.active_wallets)} active wallets")
                
        except Exception as e:
            logger.error(f"Failed to load active wallets: {e}")
    
    async def create_master_wallet(self, request: CreateMasterWalletRequest) -> MasterWallet:
        """Create a new master wallet"""
        try:
            # Create wallet instance
            wallet = MasterWallet(
                config=request.config,
                addresses=request.initial_addresses or [],
                balances=request.initial_balances or []
            )
            
            # Generate default wallet addresses if none provided
            if not wallet.addresses:
                await self._generate_default_addresses(wallet)
            
            # Save to database
            if self.supabase:
                wallet_data = wallet.dict()
                response = self.supabase.table('master_wallets').insert(wallet_data).execute()
                
                if response.data:
                    logger.info(f"Created master wallet: {wallet.wallet_id}")
            
            # Add to active wallets
            self.active_wallets[wallet.wallet_id] = wallet
            
            # Cache in Redis
            if self.redis:
                await self.redis.setex(
                    f"master_wallet:{wallet.wallet_id}",
                    3600,  # 1 hour TTL
                    wallet.json()
                )
            
            return wallet
            
        except Exception as e:
            logger.error(f"Failed to create master wallet: {e}")
            raise
    
    async def _generate_default_addresses(self, wallet: MasterWallet):
        """Generate default wallet addresses for supported chains"""
        try:
            # Generate a new private key (in production, use secure key generation)
            account = Account.create()
            
            for chain_name in wallet.config.supported_chains:
                if chain_name in self.chain_configs:
                    chain_id = self.chain_configs[chain_name]["chain_id"]
                    
                    address = WalletAddress(
                        address=account.address,
                        chain_id=chain_id,
                        chain_name=chain_name
                    )
                    
                    wallet.addresses.append(address)
            
            logger.info(f"Generated {len(wallet.addresses)} addresses for wallet {wallet.wallet_id}")
            
        except Exception as e:
            logger.error(f"Failed to generate wallet addresses: {e}")
            raise
    
    async def get_wallet_balances(self, wallet_id: str) -> List[WalletBalance]:
        """Get current wallet balances across all chains"""
        try:
            wallet = self.active_wallets.get(wallet_id)
            if not wallet:
                raise ValueError(f"Wallet {wallet_id} not found")
            
            balances = []
            
            for address_info in wallet.addresses:
                # Get native token balance
                chain_name = address_info.chain_name
                if chain_name in self.web3_connections:
                    web3 = self.web3_connections[chain_name]
                    
                    # Get ETH/native token balance
                    balance_wei = web3.eth.get_balance(address_info.address)
                    balance_eth = web3.from_wei(balance_wei, 'ether')
                    
                    native_balance = WalletBalance(
                        asset_symbol=self._get_native_symbol(chain_name),
                        balance=Decimal(str(balance_eth)),
                        available_balance=Decimal(str(balance_eth))
                    )
                    balances.append(native_balance)
                    
                    # Get ERC20 token balances (USDC, USDT, etc.)
                    await self._get_erc20_balances(address_info.address, chain_name, balances)
            
            # Update wallet balances
            wallet.balances = balances
            
            # Cache updated balances
            if self.redis:
                await self.redis.setex(
                    f"wallet_balances:{wallet_id}",
                    300,  # 5 minutes TTL
                    json.dumps([b.dict() for b in balances], default=str)
                )
            
            return balances
            
        except Exception as e:
            logger.error(f"Failed to get wallet balances for {wallet_id}: {e}")
            raise
    
    async def _get_erc20_balances(self, address: str, chain_name: str, balances: List[WalletBalance]):
        """Get ERC20 token balances for an address"""
        try:
            # Common token contracts by chain
            token_contracts = {
                "ethereum": {
                    "USDC": "0xA0b86a33E6417c1bb79F6b3C2f58E1e9C23b2FBE",
                    "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7"
                },
                "polygon": {
                    "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
                    "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
                }
            }
            
            if chain_name not in token_contracts:
                return
            
            web3 = self.web3_connections[chain_name]
            
            # Standard ERC20 ABI for balanceOf
            erc20_abi = [
                {
                    "constant": True,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                },
                {
                    "constant": True,
                    "inputs": [],
                    "name": "decimals",
                    "outputs": [{"name": "", "type": "uint8"}],
                    "type": "function"
                }
            ]
            
            for symbol, contract_address in token_contracts[chain_name].items():
                try:
                    contract = web3.eth.contract(
                        address=Web3.to_checksum_address(contract_address),
                        abi=erc20_abi
                    )
                    
                    # Get balance and decimals
                    balance_raw = contract.functions.balanceOf(address).call()
                    decimals = contract.functions.decimals().call()
                    
                    # Convert to decimal
                    balance_decimal = Decimal(balance_raw) / (Decimal(10) ** decimals)
                    
                    if balance_decimal > 0:
                        token_balance = WalletBalance(
                            asset_symbol=symbol,
                            balance=balance_decimal,
                            available_balance=balance_decimal
                        )
                        balances.append(token_balance)
                        
                except Exception as e:
                    logger.warning(f"Failed to get {symbol} balance on {chain_name}: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"Failed to get ERC20 balances: {e}")
    
    def _get_native_symbol(self, chain_name: str) -> str:
        """Get native token symbol for chain"""
        symbols = {
            "ethereum": "ETH",
            "polygon": "MATIC",
            "bsc": "BNB",
            "arbitrum": "ETH"
        }
        return symbols.get(chain_name, "ETH")
    
    async def allocate_funds(self, wallet_id: str, request: FundAllocationRequest) -> FundAllocation:
        """Allocate funds to agent/farm/goal"""
        try:
            wallet = self.active_wallets.get(wallet_id)
            if not wallet:
                raise ValueError(f"Wallet {wallet_id} not found")
            
            # Check if enough funds available
            total_balance_usd = await self._calculate_total_balance_usd(wallet)
            
            if request.amount_usd > total_balance_usd * wallet.config.max_allocation_per_agent:
                raise ValueError(f"Allocation exceeds maximum per-agent limit")
            
            # Create allocation
            allocation = FundAllocation(
                target_type=request.target_type,
                target_id=request.target_id,
                target_name=request.target_name,
                allocated_amount_usd=request.amount_usd,
                allocated_percentage=request.amount_usd / total_balance_usd * 100,
                current_value_usd=request.amount_usd,
                initial_allocation=request.amount_usd
            )
            
            # Add to wallet allocations
            wallet.allocations.append(allocation)
            
            # Update database
            if self.supabase:
                allocation_data = allocation.dict()
                allocation_data['wallet_id'] = wallet_id
                self.supabase.table('fund_allocations').insert(allocation_data).execute()
            
            # Create transaction record
            transaction = WalletTransaction(
                transaction_type="allocation",
                amount=request.amount_usd,
                asset_symbol="USD",
                amount_usd=request.amount_usd,
                to_entity=f"{request.target_type}:{request.target_id}"
            )
            
            await self._record_transaction(wallet_id, transaction)
            
            logger.info(f"Allocated ${request.amount_usd} to {request.target_type}:{request.target_id}")
            
            return allocation
            
        except Exception as e:
            logger.error(f"Failed to allocate funds: {e}")
            raise
    
    async def collect_funds(self, wallet_id: str, request: FundCollectionRequest) -> Decimal:
        """Collect funds from allocation"""
        try:
            wallet = self.active_wallets.get(wallet_id)
            if not wallet:
                raise ValueError(f"Wallet {wallet_id} not found")
            
            # Find allocation
            allocation = None
            for alloc in wallet.allocations:
                if alloc.allocation_id == request.allocation_id:
                    allocation = alloc
                    break
            
            if not allocation:
                raise ValueError(f"Allocation {request.allocation_id} not found")
            
            # Calculate collection amount
            if request.collection_type == "full":
                collection_amount = allocation.current_value_usd
            elif request.collection_type == "profits_only":
                collection_amount = max(Decimal("0"), allocation.total_pnl)
            else:  # partial
                collection_amount = request.amount_usd or Decimal("0")
            
            # Update allocation
            allocation.current_value_usd -= collection_amount
            allocation.realized_pnl += collection_amount - allocation.initial_allocation
            
            if request.collection_type == "full":
                allocation.is_active = False
            
            # Create transaction record
            transaction = WalletTransaction(
                transaction_type="collection",
                amount=collection_amount,
                asset_symbol="USD",
                amount_usd=collection_amount,
                from_entity=f"{allocation.target_type}:{allocation.target_id}"
            )
            
            await self._record_transaction(wallet_id, transaction)
            
            logger.info(f"Collected ${collection_amount} from {allocation.target_type}:{allocation.target_id}")
            
            return collection_amount
            
        except Exception as e:
            logger.error(f"Failed to collect funds: {e}")
            raise
    
    async def _calculate_total_balance_usd(self, wallet: MasterWallet) -> Decimal:
        """Calculate total wallet balance in USD"""
        total_usd = Decimal("0")
        
        for balance in wallet.balances:
            if balance.balance_usd:
                total_usd += balance.balance_usd
            else:
                # Get current price and calculate USD value
                price_usd = await self._get_asset_price_usd(balance.asset_symbol)
                balance_usd = balance.balance * price_usd
                total_usd += balance_usd
        
        return total_usd
    
    async def _get_asset_price_usd(self, asset_symbol: str) -> Decimal:
        """Get current asset price in USD"""
        try:
            # Use market data service if available
            market_data_service = self.registry.get_service("market_data")
            if market_data_service:
                price_data = await market_data_service.get_live_data(f"{asset_symbol}/USD")
                if price_data and 'price' in price_data:
                    return Decimal(str(price_data['price']))
            
            # Fallback to hardcoded prices (replace with real price feed)
            fallback_prices = {
                "ETH": Decimal("2500"),
                "BTC": Decimal("45000"),
                "MATIC": Decimal("0.8"),
                "BNB": Decimal("300"),
                "USDC": Decimal("1"),
                "USDT": Decimal("1")
            }
            
            return fallback_prices.get(asset_symbol, Decimal("1"))
            
        except Exception as e:
            logger.error(f"Failed to get price for {asset_symbol}: {e}")
            return Decimal("1")
    
    async def _record_transaction(self, wallet_id: str, transaction: WalletTransaction):
        """Record a wallet transaction"""
        try:
            if self.supabase:
                transaction_data = transaction.dict()
                transaction_data['wallet_id'] = wallet_id
                self.supabase.table('wallet_transactions').insert(transaction_data).execute()
            
            # Cache recent transactions in Redis
            if self.redis:
                await self.redis.lpush(
                    f"wallet_transactions:{wallet_id}",
                    transaction.json()
                )
                await self.redis.ltrim(f"wallet_transactions:{wallet_id}", 0, 99)  # Keep last 100
                
        except Exception as e:
            logger.error(f"Failed to record transaction: {e}")
    
    async def calculate_wallet_performance(self, wallet_id: str) -> WalletPerformanceMetrics:
        """Calculate comprehensive wallet performance metrics"""
        try:
            wallet = self.active_wallets.get(wallet_id)
            if not wallet:
                raise ValueError(f"Wallet {wallet_id} not found")
            
            # Calculate total values
            total_value_usd = await self._calculate_total_balance_usd(wallet)
            
            # Calculate total P&L from allocations
            total_pnl = sum(alloc.total_pnl for alloc in wallet.allocations)
            
            # Calculate allocation metrics
            active_allocations = sum(1 for alloc in wallet.allocations if alloc.is_active)
            total_allocated = sum(alloc.allocated_amount_usd for alloc in wallet.allocations if alloc.is_active)
            
            # Calculate performance metrics
            performance = WalletPerformanceMetrics(
                wallet_id=wallet_id,
                total_value_usd=total_value_usd,
                total_pnl=total_pnl,
                total_pnl_percentage=(total_pnl / total_value_usd * 100) if total_value_usd > 0 else Decimal("0"),
                active_allocations=active_allocations,
                total_allocated_usd=total_allocated,
                available_balance_usd=total_value_usd - total_allocated
            )
            
            # Cache performance metrics
            self.performance_cache[wallet_id] = performance
            
            return performance
            
        except Exception as e:
            logger.error(f"Failed to calculate wallet performance: {e}")
            raise
    
    async def _auto_distribution_loop(self):
        """Background task for automatic fund distribution"""
        while self.auto_distribution_enabled:
            try:
                await asyncio.sleep(self.distribution_interval)
                
                for wallet_id, wallet in self.active_wallets.items():
                    if wallet.config.auto_distribution:
                        await self._execute_auto_distribution(wallet)
                        
            except Exception as e:
                logger.error(f"Error in auto-distribution loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    async def _execute_auto_distribution(self, wallet: MasterWallet):
        """Execute automatic fund distribution for a wallet"""
        try:
            # Get performance data for all targets
            performance_data = await self._get_target_performance_data()
            
            # Apply distribution rules
            for rule in wallet.distribution_rules:
                if rule.is_active:
                    await self._apply_distribution_rule(wallet, rule, performance_data)
                    
        except Exception as e:
            logger.error(f"Failed to execute auto-distribution for wallet {wallet.wallet_id}: {e}")
    
    async def _get_target_performance_data(self) -> Dict[str, Any]:
        """Get performance data for all allocation targets"""
        performance_data = {}
        
        try:
            # Get agent performance data
            agent_performance_service = self.registry.get_service("agent_performance_service")
            if agent_performance_service:
                agent_rankings = await agent_performance_service.get_agent_rankings()
                performance_data['agents'] = {
                    ranking.agent_id: ranking for ranking in agent_rankings
                }
            
            # Get farm performance data
            farm_service = self.registry.get_service("farm_management_service")
            if farm_service:
                farm_performance = await farm_service.get_all_farm_performance()
                performance_data['farms'] = farm_performance
            
            # Get goal performance data
            goal_service = self.registry.get_service("goal_management_service")
            if goal_service:
                goal_progress = await goal_service.get_all_goal_progress()
                performance_data['goals'] = goal_progress
                
        except Exception as e:
            logger.error(f"Failed to get target performance data: {e}")
        
        return performance_data
    
    async def _apply_distribution_rule(self, wallet: MasterWallet, rule: FundDistributionRule, performance_data: Dict[str, Any]):
        """Apply a specific distribution rule"""
        try:
            # Implementation depends on rule type and conditions
            # This is a simplified version - full implementation would be more complex
            
            if rule.distribution_method == "performance_weighted":
                await self._apply_performance_weighted_distribution(wallet, rule, performance_data)
            elif rule.distribution_method == "equal":
                await self._apply_equal_distribution(wallet, rule)
            elif rule.distribution_method == "risk_adjusted":
                await self._apply_risk_adjusted_distribution(wallet, rule, performance_data)
                
        except Exception as e:
            logger.error(f"Failed to apply distribution rule {rule.rule_id}: {e}")
    
    async def _apply_performance_weighted_distribution(self, wallet: MasterWallet, rule: FundDistributionRule, performance_data: Dict[str, Any]):
        """Apply performance-weighted fund distribution"""
        # Implementation would analyze performance data and redistribute funds
        # based on performance metrics (Sharpe ratio, returns, win rate, etc.)
        pass
    
    async def _apply_equal_distribution(self, wallet: MasterWallet, rule: FundDistributionRule):
        """Apply equal fund distribution"""
        # Implementation would distribute funds equally among all active targets
        pass
    
    async def _apply_risk_adjusted_distribution(self, wallet: MasterWallet, rule: FundDistributionRule, performance_data: Dict[str, Any]):
        """Apply risk-adjusted fund distribution"""
        # Implementation would adjust fund allocation based on risk metrics
        pass
    
    async def _performance_monitoring_loop(self):
        """Background task for performance monitoring"""
        while True:
            try:
                await asyncio.sleep(300)  # Update every 5 minutes
                
                for wallet_id in self.active_wallets:
                    await self.calculate_wallet_performance(wallet_id)
                    
            except Exception as e:
                logger.error(f"Error in performance monitoring loop: {e}")
                await asyncio.sleep(60)
    
    async def get_wallet_status(self, wallet_id: str) -> Dict[str, Any]:
        """Get comprehensive wallet status"""
        try:
            wallet = self.active_wallets.get(wallet_id)
            if not wallet:
                return {"status": "not_found", "message": f"Wallet {wallet_id} not found"}
            
            # Get current balances
            balances = await self.get_wallet_balances(wallet_id)
            
            # Get performance metrics
            performance = await self.calculate_wallet_performance(wallet_id)
            
            return {
                "status": "active" if wallet.is_active else "inactive",
                "wallet_id": wallet_id,
                "total_value_usd": float(performance.total_value_usd),
                "total_pnl": float(performance.total_pnl),
                "active_allocations": performance.active_allocations,
                "available_balance_usd": float(performance.available_balance_usd),
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get wallet status: {e}")
            return {"status": "error", "message": str(e)}
    
    async def get_service_status(self) -> Dict[str, Any]:
        """Get service status and health metrics"""
        return {
            "service": "master_wallet_service",
            "status": "running",
            "active_wallets": len(self.active_wallets),
            "web3_connections": len(self.web3_connections),
            "auto_distribution_enabled": self.auto_distribution_enabled,
            "last_health_check": datetime.now(timezone.utc).isoformat()
        }
    
    # ================================
    # PHASE 9: ENHANCED FUNCTIONALITY
    # ================================
    
    async def generate_hd_wallet_keys(self, wallet_id: str, chains: List[ChainType]) -> List[HDWalletKey]:
        """Generate HD wallet keys for multiple chains"""
        try:
            if wallet_id not in self.hd_wallet_keys:
                self.hd_wallet_keys[wallet_id] = []
            
            wallet_keys = []
            for chain in chains:
                key = await self._generate_hd_wallet_key(chain, wallet_id)
                wallet_keys.append(key)
                self.hd_wallet_keys[wallet_id].append(key)
            
            # Emit event
            if self.event_service:
                await self.event_service.emit_event({
                    'event_type': 'hd_wallet_keys.generated',
                    'wallet_id': wallet_id,
                    'chains': [chain.value for chain in chains],
                    'key_count': len(wallet_keys),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                })
            
            logger.info(f"Generated {len(wallet_keys)} HD wallet keys for {wallet_id}")
            return wallet_keys
            
        except Exception as e:
            logger.error(f"Failed to generate HD wallet keys: {e}")
            raise
    
    async def _generate_hd_wallet_key(self, chain: ChainType, wallet_id: str) -> HDWalletKey:
        """Generate HD wallet key for specific chain"""
        try:
            derivation_path = self.default_derivation_paths[chain]
            existing_keys = self.hd_wallet_keys.get(wallet_id, [])
            key_index = len([k for k in existing_keys if k.chain_type == chain])
            
            # Generate mock keys (replace with actual crypto library)
            private_key = secrets.token_hex(32)
            public_key = hashlib.sha256(private_key.encode()).hexdigest()
            address = f"0x{hashlib.sha256(public_key.encode()).hexdigest()[:40]}"
            
            return HDWalletKey(
                derivation_path=f"{derivation_path}/{key_index}",
                public_key=public_key,
                address=address,
                chain_type=chain,
                key_index=key_index,
                created_at=datetime.now(timezone.utc),
                is_active=True
            )
            
        except Exception as e:
            logger.error(f"Failed to generate HD wallet key: {e}")
            raise
    
    async def calculate_advanced_performance_metrics(self, wallet_id: str) -> AdvancedPerformanceMetrics:
        """Calculate comprehensive performance metrics"""
        try:
            wallet = self.active_wallets.get(wallet_id)
            if not wallet:
                raise ValueError("Wallet not found")
            
            # Mock performance calculation (replace with real trading data)
            trades_data = await self._fetch_trading_history(wallet_id)
            
            total_trades = len(trades_data)
            winning_trades = len([t for t in trades_data if t.get('pnl', 0) > 0])
            losing_trades = total_trades - winning_trades
            
            win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
            
            total_pnl = sum(Decimal(str(t.get('pnl', 0))) for t in trades_data)
            total_balance = await self._calculate_total_balance_usd(wallet)
            total_pnl_percentage = float(total_pnl / total_balance * 100) if total_balance > 0 else 0
            
            # Calculate advanced metrics
            returns = [t.get('return_pct', 0) for t in trades_data]
            max_drawdown = self._calculate_max_drawdown(returns)
            sharpe_ratio = self._calculate_sharpe_ratio(returns)
            sortino_ratio = self._calculate_sortino_ratio(returns)
            
            # Calculate composite performance score
            performance_score = self._calculate_performance_score({
                'win_rate': win_rate,
                'total_pnl_percentage': total_pnl_percentage,
                'max_drawdown': max_drawdown,
                'sharpe_ratio': sharpe_ratio,
                'total_trades': total_trades
            })
            
            performance_metrics = AdvancedPerformanceMetrics(
                total_trades=total_trades,
                winning_trades=winning_trades,
                losing_trades=losing_trades,
                win_rate=win_rate,
                total_pnl=total_pnl,
                total_pnl_percentage=total_pnl_percentage,
                max_drawdown=max_drawdown,
                sharpe_ratio=sharpe_ratio,
                sortino_ratio=sortino_ratio,
                calmar_ratio=total_pnl_percentage / abs(max_drawdown) if max_drawdown != 0 else 0,
                volatility=self._calculate_volatility(returns),
                avg_trade_duration=sum(t.get('duration_hours', 0) for t in trades_data) / len(trades_data) if trades_data else 0,
                profit_factor=self._calculate_profit_factor(trades_data),
                largest_win=max((Decimal(str(t.get('pnl', 0))) for t in trades_data), default=Decimal('0')),
                largest_loss=min((Decimal(str(t.get('pnl', 0))) for t in trades_data), default=Decimal('0')),
                consecutive_wins=self._calculate_consecutive_wins(trades_data),
                consecutive_losses=self._calculate_consecutive_losses(trades_data),
                recovery_factor=self._calculate_recovery_factor(returns),
                risk_adjusted_return=total_pnl_percentage / (max(abs(max_drawdown), 1)),
                monthly_returns=self._calculate_monthly_returns(trades_data),
                performance_score=performance_score
            )
            
            # Cache performance metrics
            self.performance_cache[wallet_id] = performance_metrics
            
            return performance_metrics
            
        except Exception as e:
            logger.error(f"Failed to calculate performance metrics: {e}")
            raise
    
    async def rebalance_allocations(self, wallet_id: str, force: bool = False) -> Dict[str, Any]:
        """Rebalance capital allocations based on performance"""
        try:
            wallet = self.active_wallets.get(wallet_id)
            if not wallet:
                raise ValueError("Wallet not found")
            
            # Calculate current performance
            await self.calculate_advanced_performance_metrics(wallet_id)
            
            # Get all wallets for allocation comparison
            all_wallets = list(self.active_wallets.values())
            wallet_performances = {}
            
            for w in all_wallets:
                if w.is_active:
                    performance = self.performance_cache.get(w.wallet_id)
                    if performance:
                        wallet_performances[w.wallet_id] = performance.performance_score
            
            # Calculate new allocations
            new_allocations = self._calculate_optimal_allocations(
                wallet_performances,
                await self._calculate_total_balance_usd(wallet),
                []  # Would use allocation rules if available
            )
            
            # Execute rebalance
            total_allocated = sum(new_allocations.values())
            
            # Record allocation history
            self.allocation_history.append({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'wallet_id': wallet_id,
                'allocations': [{'wallet_id': k, 'amount': float(v)} for k, v in new_allocations.items()],
                'total_allocated': float(total_allocated),
                'trigger': 'manual' if force else 'automatic'
            })
            
            # Emit event
            if self.event_service:
                await self.event_service.emit_event({
                    'event_type': 'wallet.rebalanced',
                    'wallet_id': wallet_id,
                    'total_allocated': float(total_allocated),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                })
            
            logger.info(f"Rebalanced allocations for wallet {wallet_id}")
            
            return {
                'rebalanced': True,
                'new_allocations': [{'wallet_id': k, 'amount': float(v)} for k, v in new_allocations.items()],
                'total_allocated': float(total_allocated)
            }
            
        except Exception as e:
            logger.error(f"Failed to rebalance allocations: {e}")
            raise
    
    async def get_allocation_recommendations(self, wallet_id: str) -> Dict[str, Any]:
        """Get AI-powered allocation recommendations"""
        try:
            wallet = self.active_wallets.get(wallet_id)
            if not wallet:
                raise ValueError("Wallet not found")
            
            # Calculate current performance
            await self.calculate_advanced_performance_metrics(wallet_id)
            
            # Get all wallets for comparison
            all_wallets = list(self.active_wallets.values())
            
            # Analyze performance patterns
            recommendations = []
            
            for w in all_wallets:
                if w.is_active and w.wallet_id != wallet_id:
                    performance = self.performance_cache.get(w.wallet_id)
                    if performance and performance.performance_score > 70:  # High performance
                        recommendations.append({
                            'wallet_id': w.wallet_id,
                            'action': 'increase_allocation',
                            'performance_score': performance.performance_score,
                            'reason': f'High performance score ({performance.performance_score:.1f})',
                            'confidence': 0.85
                        })
            
            return {
                'wallet_id': wallet_id,
                'recommendations': recommendations,
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get allocation recommendations: {e}")
            raise
    
    # Performance calculation helper methods
    async def _fetch_trading_history(self, wallet_id: str) -> List[Dict[str, Any]]:
        """Fetch trading history (mock implementation)"""
        # Mock trading data
        trades = []
        for i in range(50):  # Generate 50 mock trades
            pnl = (secrets.randbelow(2000) - 1000) / 10  # -100 to +100
            trades.append({
                'trade_id': f"trade_{i}",
                'pnl': pnl,
                'return_pct': pnl / 1000 * 100,
                'duration_hours': secrets.randbelow(48) + 1,
                'timestamp': (datetime.now(timezone.utc) - timedelta(days=secrets.randbelow(90))).isoformat()
            })
        return trades
    
    def _calculate_max_drawdown(self, returns: List[float]) -> float:
        """Calculate maximum drawdown"""
        if not returns:
            return 0.0
        
        cumulative = [1.0]
        for ret in returns:
            cumulative.append(cumulative[-1] * (1 + ret / 100))
        
        max_value = cumulative[0]
        max_drawdown = 0.0
        
        for value in cumulative:
            if value > max_value:
                max_value = value
            else:
                drawdown = (max_value - value) / max_value * 100
                max_drawdown = max(max_drawdown, drawdown)
        
        return max_drawdown
    
    def _calculate_sharpe_ratio(self, returns: List[float], risk_free_rate: float = 2.0) -> float:
        """Calculate Sharpe ratio"""
        if not returns or len(returns) < 2:
            return 0.0
        
        avg_return = sum(returns) / len(returns)
        volatility = (sum((r - avg_return) ** 2 for r in returns) / (len(returns) - 1)) ** 0.5
        
        if volatility == 0:
            return 0.0
        
        return (avg_return - risk_free_rate / 12) / volatility
    
    def _calculate_sortino_ratio(self, returns: List[float], risk_free_rate: float = 2.0) -> float:
        """Calculate Sortino ratio"""
        if not returns:
            return 0.0
        
        avg_return = sum(returns) / len(returns)
        negative_returns = [r for r in returns if r < 0]
        
        if not negative_returns:
            return float('inf') if avg_return > risk_free_rate / 12 else 0.0
        
        downside_deviation = (sum(r ** 2 for r in negative_returns) / len(negative_returns)) ** 0.5
        
        if downside_deviation == 0:
            return 0.0
        
        return (avg_return - risk_free_rate / 12) / downside_deviation
    
    def _calculate_volatility(self, returns: List[float]) -> float:
        """Calculate volatility"""
        if len(returns) < 2:
            return 0.0
        
        avg_return = sum(returns) / len(returns)
        variance = sum((r - avg_return) ** 2 for r in returns) / (len(returns) - 1)
        return variance ** 0.5
    
    def _calculate_profit_factor(self, trades: List[Dict[str, Any]]) -> float:
        """Calculate profit factor"""
        winning_trades = [t for t in trades if t.get('pnl', 0) > 0]
        losing_trades = [t for t in trades if t.get('pnl', 0) < 0]
        
        gross_profit = sum(t.get('pnl', 0) for t in winning_trades)
        gross_loss = abs(sum(t.get('pnl', 0) for t in losing_trades))
        
        if gross_loss == 0:
            return float('inf') if gross_profit > 0 else 0.0
        
        return gross_profit / gross_loss
    
    def _calculate_consecutive_wins(self, trades: List[Dict[str, Any]]) -> int:
        """Calculate maximum consecutive wins"""
        max_consecutive = 0
        current_consecutive = 0
        
        for trade in sorted(trades, key=lambda t: t.get('timestamp', '')):
            if trade.get('pnl', 0) > 0:
                current_consecutive += 1
                max_consecutive = max(max_consecutive, current_consecutive)
            else:
                current_consecutive = 0
        
        return max_consecutive
    
    def _calculate_consecutive_losses(self, trades: List[Dict[str, Any]]) -> int:
        """Calculate maximum consecutive losses"""
        max_consecutive = 0
        current_consecutive = 0
        
        for trade in sorted(trades, key=lambda t: t.get('timestamp', '')):
            if trade.get('pnl', 0) < 0:
                current_consecutive += 1
                max_consecutive = max(max_consecutive, current_consecutive)
            else:
                current_consecutive = 0
        
        return max_consecutive
    
    def _calculate_recovery_factor(self, returns: List[float]) -> float:
        """Calculate recovery factor"""
        if not returns:
            return 0.0
        
        total_return = sum(returns)
        max_drawdown = self._calculate_max_drawdown(returns)
        
        if max_drawdown == 0:
            return float('inf') if total_return > 0 else 0.0
        
        return total_return / max_drawdown
    
    def _calculate_monthly_returns(self, trades: List[Dict[str, Any]]) -> List[float]:
        """Calculate monthly returns"""
        # Group trades by month and calculate returns
        monthly_data = {}
        
        for trade in trades:
            timestamp = datetime.fromisoformat(trade.get('timestamp', ''))
            month_key = timestamp.strftime('%Y-%m')
            
            if month_key not in monthly_data:
                monthly_data[month_key] = []
            
            monthly_data[month_key].append(trade.get('return_pct', 0))
        
        return [sum(returns) for returns in monthly_data.values()]
    
    def _calculate_performance_score(self, metrics: Dict[str, Any]) -> float:
        """Calculate composite performance score (0-100)"""
        score = 50.0  # Base score
        
        # Win rate component (0-25 points)
        win_rate = metrics.get('win_rate', 0)
        score += (win_rate - 50) * 0.25  # +/- 12.5 points for 50% win rate deviation
        
        # PnL percentage component (0-25 points)
        pnl_pct = metrics.get('total_pnl_percentage', 0)
        score += min(25, max(-25, pnl_pct * 2.5))  # +/- 25 points for 10% PnL
        
        # Drawdown component (0-20 points)
        max_drawdown = metrics.get('max_drawdown', 0)
        score -= max_drawdown * 0.5  # -0.5 points per 1% drawdown
        
        # Sharpe ratio component (0-15 points)
        sharpe = metrics.get('sharpe_ratio', 0)
        score += min(15, max(-15, sharpe * 7.5))  # +/- 15 points for 2.0 Sharpe
        
        # Trade volume component (0-15 points)
        total_trades = metrics.get('total_trades', 0)
        if total_trades >= 50:
            score += 15
        elif total_trades >= 20:
            score += 10
        elif total_trades >= 10:
            score += 5
        
        return max(0, min(100, score))
    
    def _calculate_optimal_allocations(
        self,
        wallet_performances: Dict[str, float],
        total_capital: Decimal,
        allocation_rules: List[AllocationRule]
    ) -> Dict[str, Decimal]:
        """Calculate optimal capital allocations using performance-based algorithm"""
        allocations = {}
        
        if not wallet_performances:
            return allocations
        
        # Calculate allocation weights based on performance scores
        total_score = sum(wallet_performances.values())
        available_capital = total_capital * Decimal('0.85')  # Reserve 15% cash
        
        for wallet_id, score in wallet_performances.items():
            if score > 40:  # Minimum performance threshold
                # Base allocation proportional to performance
                weight = score / total_score
                base_allocation = available_capital * Decimal(str(weight))
                
                # Apply maximum allocation limit
                max_allocation = total_capital * Decimal(str(self.max_allocation_per_wallet))
                final_allocation = min(base_allocation, max_allocation)
                
                allocations[wallet_id] = final_allocation
        
        return allocations
    
    async def _periodic_rebalance(self):
        """Background task for periodic rebalancing"""
        while True:
            try:
                await asyncio.sleep(3600)  # Check every hour
                
                for wallet_id, wallet in self.active_wallets.items():
                    if wallet.is_active:
                        # Check if rebalance is due based on performance changes
                        await self.rebalance_allocations(wallet_id, force=False)
                
            except Exception as e:
                logger.error(f"Error in periodic rebalance: {e}")
    
    async def _update_performance_metrics(self):
        """Background task for updating performance metrics"""
        while True:
            try:
                await asyncio.sleep(1800)  # Update every 30 minutes
                
                for wallet_id in self.active_wallets.keys():
                    await self.calculate_advanced_performance_metrics(wallet_id)
                    
            except Exception as e:
                logger.error(f"Error updating performance metrics: {e}")

# Factory function for service registry
def create_master_wallet_service():
    """Factory function to create MasterWalletService instance"""
    registry = get_registry()
    redis_client = registry.get_connection("redis")
    supabase_client = registry.get_connection("supabase")
    
    service = MasterWalletService(redis_client, supabase_client)
    return service