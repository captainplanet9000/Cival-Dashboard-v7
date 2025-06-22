"""
Farm Management Service - Phase 7
Advanced agent farm coordination and strategy-based group management
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import json
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

import redis.asyncio as redis
from ..core.service_registry import get_registry

logger = logging.getLogger(__name__)

class FarmType(Enum):
    TREND_FOLLOWING = "trend_following"
    BREAKOUT = "breakout" 
    PRICE_ACTION = "price_action"
    ARBITRAGE = "arbitrage"
    SCALPING = "scalping"
    MULTI_STRATEGY = "multi_strategy"

class FarmStatus(Enum):
    INACTIVE = "inactive"
    ACTIVE = "active"
    PAUSED = "paused"
    MAINTENANCE = "maintenance"
    SCALING = "scaling"

@dataclass
class Farm:
    """Farm definition"""
    farm_id: str
    farm_name: str
    farm_type: FarmType
    description: str
    status: FarmStatus
    max_agents: int
    current_agents: int
    assigned_agents: List[str]
    strategy_config: Dict[str, Any]
    performance_target: Dict[str, Decimal]
    risk_limits: Dict[str, Decimal]
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any]
    
    def __post_init__(self):
        if self.assigned_agents is None:
            self.assigned_agents = []
        if self.strategy_config is None:
            self.strategy_config = {}
        if self.performance_target is None:
            self.performance_target = {}
        if self.risk_limits is None:
            self.risk_limits = {}
        if self.metadata is None:
            self.metadata = {}

@dataclass
class FarmPerformance:
    """Farm performance metrics"""
    farm_id: str
    timestamp: datetime
    total_profit: Decimal
    total_trades: int
    win_rate: float
    avg_profit_per_trade: Decimal
    sharpe_ratio: float
    max_drawdown: float
    active_agents: int
    agent_coordination_score: float
    strategy_efficiency: float
    risk_adjusted_return: float

@dataclass
class AgentAssignment:
    """Agent assignment to farm"""
    assignment_id: str
    farm_id: str
    agent_id: str
    assigned_at: datetime
    role: str  # 'primary', 'support', 'specialist'
    performance_weight: float
    is_active: bool

class FarmManagementService:
    """
    Advanced farm management service for strategy-based agent coordination
    """
    
    def __init__(self, redis_client=None, supabase_client=None):
        self.registry = get_registry()
        self.redis = redis_client
        self.supabase = supabase_client
        
        # Farm tracking
        self.active_farms: Dict[str, Farm] = {}
        self.farm_performance: Dict[str, List[FarmPerformance]] = {}
        self.agent_assignments: Dict[str, List[AgentAssignment]] = {}
        
        # Farm templates for different strategies
        self.farm_templates = {
            "trend_following": {
                "name": "Trend Following Farm",
                "type": FarmType.TREND_FOLLOWING,
                "max_agents": 15,
                "strategy_config": {
                    "primary_strategies": ["williams_alligator", "elliott_wave"],
                    "timeframes": ["1h", "4h", "1d"],
                    "risk_per_trade": 0.02,
                    "max_correlation": 0.7
                },
                "performance_target": {
                    "monthly_return": Decimal("0.08"),
                    "sharpe_ratio": Decimal("1.5"),
                    "max_drawdown": Decimal("0.1")
                }
            },
            "breakout": {
                "name": "Breakout Strategy Farm", 
                "type": FarmType.BREAKOUT,
                "max_agents": 12,
                "strategy_config": {
                    "primary_strategies": ["darvas_box", "renko"],
                    "volatility_threshold": 0.02,
                    "volume_confirmation": True,
                    "risk_per_trade": 0.025
                },
                "performance_target": {
                    "monthly_return": Decimal("0.1"),
                    "win_rate": Decimal("0.6"),
                    "max_drawdown": Decimal("0.15")
                }
            },
            "price_action": {
                "name": "Price Action Farm",
                "type": FarmType.PRICE_ACTION,
                "max_agents": 10,
                "strategy_config": {
                    "primary_strategies": ["heikin_ashi", "renko"],
                    "pattern_recognition": True,
                    "support_resistance": True,
                    "risk_per_trade": 0.015
                },
                "performance_target": {
                    "monthly_return": Decimal("0.06"),
                    "win_rate": Decimal("0.75"),
                    "consistency": Decimal("0.8")
                }
            }
        }
        
        # Coordination settings
        self.coordination_check_interval = 120  # seconds
        self.performance_update_interval = 300  # seconds
        self.rebalancing_interval = 1800  # seconds
        
        logger.info("FarmManagementService initialized")
    
    async def initialize(self):
        """Initialize the farm management service"""
        try:
            # Load active farms from database
            await self._load_active_farms()
            
            # Load agent assignments
            await self._load_agent_assignments()
            
            # Start background coordination
            asyncio.create_task(self._farm_coordination_loop())
            asyncio.create_task(self._performance_monitoring_loop())
            asyncio.create_task(self._farm_rebalancing_loop())
            
            logger.info("FarmManagementService initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize FarmManagementService: {e}")
            raise
    
    async def create_farm(self, farm_data: Dict[str, Any]) -> Farm:
        """Create a new farm"""
        try:
            farm = Farm(
                farm_id=str(uuid.uuid4()),
                farm_name=farm_data["name"],
                farm_type=FarmType(farm_data["type"]),
                description=farm_data["description"],
                status=FarmStatus.INACTIVE,
                max_agents=farm_data.get("max_agents", 10),
                current_agents=0,
                assigned_agents=[],
                strategy_config=farm_data.get("strategy_config", {}),
                performance_target=farm_data.get("performance_target", {}),
                risk_limits=farm_data.get("risk_limits", {}),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                metadata=farm_data.get("metadata", {})
            )
            
            # Apply template configuration if specified
            if farm_data.get("use_template") and farm_data["use_template"] in self.farm_templates:
                template = self.farm_templates[farm_data["use_template"]]
                farm.max_agents = template["max_agents"]
                farm.strategy_config.update(template["strategy_config"])
                farm.performance_target.update(template["performance_target"])
            
            # Save to database
            if self.supabase:
                farm_dict = asdict(farm)
                farm_dict["farm_type"] = farm.farm_type.value
                farm_dict["status"] = farm.status.value
                farm_dict["created_at"] = farm.created_at.isoformat()
                farm_dict["updated_at"] = farm.updated_at.isoformat()
                
                self.supabase.table('farms').insert(farm_dict).execute()
            
            # Add to active farms
            self.active_farms[farm.farm_id] = farm
            
            # Initialize performance tracking
            self.farm_performance[farm.farm_id] = []
            self.agent_assignments[farm.farm_id] = []
            
            # Cache in Redis
            if self.redis:
                await self.redis.setex(
                    f"farm:{farm.farm_id}",
                    3600,
                    json.dumps(asdict(farm), default=str)
                )
            
            logger.info(f"Created farm: {farm.farm_name} ({farm.farm_id})")
            return farm
            
        except Exception as e:
            logger.error(f"Failed to create farm: {e}")
            raise
    
    async def assign_agent_to_farm(self, farm_id: str, agent_id: str, role: str = "primary") -> AgentAssignment:
        """Assign an agent to a farm"""
        try:
            farm = self.active_farms.get(farm_id)
            if not farm:
                raise ValueError(f"Farm {farm_id} not found")
            
            if farm.current_agents >= farm.max_agents:
                raise ValueError(f"Farm {farm_id} is at maximum capacity")
            
            if agent_id in farm.assigned_agents:
                raise ValueError(f"Agent {agent_id} already assigned to farm {farm_id}")
            
            # Create assignment
            assignment = AgentAssignment(
                assignment_id=str(uuid.uuid4()),
                farm_id=farm_id,
                agent_id=agent_id,
                assigned_at=datetime.now(timezone.utc),
                role=role,
                performance_weight=1.0,
                is_active=True
            )
            
            # Update farm
            farm.assigned_agents.append(agent_id)
            farm.current_agents += 1
            farm.updated_at = datetime.now(timezone.utc)
            
            # Store assignment
            if farm_id not in self.agent_assignments:
                self.agent_assignments[farm_id] = []
            self.agent_assignments[farm_id].append(assignment)
            
            # Configure agent for farm strategy
            await self._configure_agent_for_farm(agent_id, farm)
            
            # Update database
            if self.supabase:
                assignment_dict = asdict(assignment)
                assignment_dict["assigned_at"] = assignment.assigned_at.isoformat()
                
                self.supabase.table('farm_agent_assignments').insert(assignment_dict).execute()
                
                # Update farm
                self.supabase.table('farms').update({
                    "current_agents": farm.current_agents,
                    "assigned_agents": farm.assigned_agents,
                    "updated_at": farm.updated_at.isoformat()
                }).eq('farm_id', farm_id).execute()
            
            # Activate farm if this is the first agent
            if farm.current_agents == 1 and farm.status == FarmStatus.INACTIVE:
                await self.activate_farm(farm_id)
            
            logger.info(f"Assigned agent {agent_id} to farm {farm_id} as {role}")
            return assignment
            
        except Exception as e:
            logger.error(f"Failed to assign agent to farm: {e}")
            raise
    
    async def remove_agent_from_farm(self, farm_id: str, agent_id: str) -> bool:
        """Remove an agent from a farm"""
        try:
            farm = self.active_farms.get(farm_id)
            if not farm:
                raise ValueError(f"Farm {farm_id} not found")
            
            if agent_id not in farm.assigned_agents:
                raise ValueError(f"Agent {agent_id} not assigned to farm {farm_id}")
            
            # Remove agent from farm
            farm.assigned_agents.remove(agent_id)
            farm.current_agents -= 1
            farm.updated_at = datetime.now(timezone.utc)
            
            # Deactivate assignment
            if farm_id in self.agent_assignments:
                for assignment in self.agent_assignments[farm_id]:
                    if assignment.agent_id == agent_id and assignment.is_active:
                        assignment.is_active = False
                        break
            
            # Reset agent configuration
            await self._reset_agent_configuration(agent_id)
            
            # Update database
            if self.supabase:
                self.supabase.table('farm_agent_assignments').update({
                    "is_active": False,
                    "removed_at": datetime.now(timezone.utc).isoformat()
                }).eq('farm_id', farm_id).eq('agent_id', agent_id).execute()
                
                self.supabase.table('farms').update({
                    "current_agents": farm.current_agents,
                    "assigned_agents": farm.assigned_agents,
                    "updated_at": farm.updated_at.isoformat()
                }).eq('farm_id', farm_id).execute()
            
            # Pause farm if no agents remaining
            if farm.current_agents == 0:
                await self.pause_farm(farm_id)
            
            logger.info(f"Removed agent {agent_id} from farm {farm_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to remove agent from farm: {e}")
            return False
    
    async def activate_farm(self, farm_id: str) -> bool:
        """Activate a farm"""
        try:
            farm = self.active_farms.get(farm_id)
            if not farm:
                raise ValueError(f"Farm {farm_id} not found")
            
            if farm.current_agents == 0:
                raise ValueError(f"Cannot activate farm {farm_id} with no agents")
            
            # Update status
            farm.status = FarmStatus.ACTIVE
            farm.updated_at = datetime.now(timezone.utc)
            
            # Start coordination for all agents
            await self._start_farm_coordination(farm_id)
            
            # Update database
            if self.supabase:
                self.supabase.table('farms').update({
                    "status": farm.status.value,
                    "updated_at": farm.updated_at.isoformat()
                }).eq('farm_id', farm_id).execute()
            
            logger.info(f"Activated farm {farm_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to activate farm: {e}")
            return False
    
    async def pause_farm(self, farm_id: str) -> bool:
        """Pause a farm"""
        try:
            farm = self.active_farms.get(farm_id)
            if not farm:
                raise ValueError(f"Farm {farm_id} not found")
            
            # Update status
            farm.status = FarmStatus.PAUSED
            farm.updated_at = datetime.now(timezone.utc)
            
            # Pause all agent activities in this farm
            await self._pause_farm_activities(farm_id)
            
            # Update database
            if self.supabase:
                self.supabase.table('farms').update({
                    "status": farm.status.value,
                    "updated_at": farm.updated_at.isoformat()
                }).eq('farm_id', farm_id).execute()
            
            logger.info(f"Paused farm {farm_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to pause farm: {e}")
            return False
    
    async def _configure_agent_for_farm(self, agent_id: str, farm: Farm):
        """Configure agent for farm-specific strategy"""
        try:
            agent_service = self.registry.get_service("agent_management_service")
            if not agent_service:
                return
            
            # Configure agent based on farm strategy
            config_updates = {
                "farm_id": farm.farm_id,
                "farm_strategy": farm.farm_type.value,
                "risk_per_trade": farm.strategy_config.get("risk_per_trade", 0.02),
                "coordination_enabled": True
            }
            
            # Add strategy-specific configurations
            if farm.farm_type == FarmType.TREND_FOLLOWING:
                config_updates.update({
                    "primary_strategies": farm.strategy_config.get("primary_strategies", []),
                    "timeframes": farm.strategy_config.get("timeframes", ["1h", "4h"]),
                    "trend_confirmation": True
                })
            elif farm.farm_type == FarmType.BREAKOUT:
                config_updates.update({
                    "breakout_strategies": farm.strategy_config.get("primary_strategies", []),
                    "volume_confirmation": farm.strategy_config.get("volume_confirmation", True),
                    "volatility_threshold": farm.strategy_config.get("volatility_threshold", 0.02)
                })
            elif farm.farm_type == FarmType.PRICE_ACTION:
                config_updates.update({
                    "price_action_strategies": farm.strategy_config.get("primary_strategies", []),
                    "pattern_recognition": farm.strategy_config.get("pattern_recognition", True),
                    "support_resistance": farm.strategy_config.get("support_resistance", True)
                })
            
            await agent_service.update_agent_configuration(agent_id, config_updates)
            
            logger.info(f"Configured agent {agent_id} for farm {farm.farm_id}")
            
        except Exception as e:
            logger.error(f"Failed to configure agent for farm: {e}")
    
    async def _start_farm_coordination(self, farm_id: str):
        """Start coordination activities for a farm"""
        try:
            farm = self.active_farms.get(farm_id)
            if not farm:
                return
            
            # Enable coordination for all agents in the farm
            agent_service = self.registry.get_service("agent_management_service")
            if agent_service:
                for agent_id in farm.assigned_agents:
                    await agent_service.enable_farm_coordination(agent_id, farm_id)
            
            # Set up inter-agent communication channels
            await self._setup_farm_communication(farm_id)
            
            logger.info(f"Started coordination for farm {farm_id}")
            
        except Exception as e:
            logger.error(f"Failed to start farm coordination: {e}")
    
    async def _setup_farm_communication(self, farm_id: str):
        """Set up communication channels for farm agents"""
        try:
            if self.redis:
                # Create farm-specific communication channel
                channel_name = f"farm_communication:{farm_id}"
                
                # Publish farm activation message
                activation_message = {
                    "event_type": "farm_activated",
                    "farm_id": farm_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "coordination_enabled": True
                }
                
                await self.redis.publish(channel_name, json.dumps(activation_message))
                
                logger.info(f"Set up communication for farm {farm_id}")
                
        except Exception as e:
            logger.error(f"Failed to set up farm communication: {e}")
    
    async def calculate_farm_performance(self, farm_id: str) -> FarmPerformance:
        """Calculate comprehensive farm performance metrics"""
        try:
            farm = self.active_farms.get(farm_id)
            if not farm:
                raise ValueError(f"Farm {farm_id} not found")
            
            # Initialize metrics
            total_profit = Decimal("0")
            total_trades = 0
            profit_list = []
            
            # Get performance from all assigned agents
            agent_performance_service = self.registry.get_service("agent_performance_service")
            if agent_performance_service:
                for agent_id in farm.assigned_agents:
                    agent_perf = await agent_performance_service.get_agent_performance(agent_id)
                    if agent_perf:
                        total_profit += agent_perf.get("total_profit", Decimal("0"))
                        total_trades += agent_perf.get("total_trades", 0)
                        profit_list.extend(agent_perf.get("trade_profits", []))
            
            # Calculate derived metrics
            win_rate = 0.0
            avg_profit_per_trade = Decimal("0")
            if total_trades > 0:
                winning_trades = sum(1 for p in profit_list if p > 0)
                win_rate = winning_trades / total_trades
                avg_profit_per_trade = total_profit / total_trades
            
            # Calculate Sharpe ratio (simplified)
            sharpe_ratio = 0.0
            if profit_list:
                import statistics
                returns_std = statistics.stdev(profit_list) if len(profit_list) > 1 else 0
                if returns_std > 0:
                    avg_return = statistics.mean(profit_list)
                    sharpe_ratio = avg_return / returns_std
            
            # Calculate max drawdown
            max_drawdown = 0.0
            if profit_list:
                cumulative = 0
                peak = 0
                for profit in profit_list:
                    cumulative += profit
                    if cumulative > peak:
                        peak = cumulative
                    drawdown = (peak - cumulative) / max(peak, 1)
                    max_drawdown = max(max_drawdown, drawdown)
            
            # Calculate coordination metrics
            agent_coordination_score = await self._calculate_agent_coordination_score(farm_id)
            strategy_efficiency = await self._calculate_strategy_efficiency(farm_id)
            
            # Calculate risk-adjusted return
            risk_adjusted_return = float(total_profit) * (1 - max_drawdown) if max_drawdown < 1 else 0
            
            # Create performance record
            performance = FarmPerformance(
                farm_id=farm_id,
                timestamp=datetime.now(timezone.utc),
                total_profit=total_profit,
                total_trades=total_trades,
                win_rate=win_rate,
                avg_profit_per_trade=avg_profit_per_trade,
                sharpe_ratio=sharpe_ratio,
                max_drawdown=max_drawdown,
                active_agents=farm.current_agents,
                agent_coordination_score=agent_coordination_score,
                strategy_efficiency=strategy_efficiency,
                risk_adjusted_return=risk_adjusted_return
            )
            
            # Store performance
            if farm_id not in self.farm_performance:
                self.farm_performance[farm_id] = []
            self.farm_performance[farm_id].append(performance)
            
            # Keep only last 100 performance records
            if len(self.farm_performance[farm_id]) > 100:
                self.farm_performance[farm_id] = self.farm_performance[farm_id][-100:]
            
            # Update database
            if self.supabase:
                perf_dict = asdict(performance)
                perf_dict["timestamp"] = performance.timestamp.isoformat()
                
                self.supabase.table('farm_performance').insert(perf_dict).execute()
            
            logger.info(f"Calculated performance for farm {farm_id}: {float(total_profit)} profit, {total_trades} trades")
            return performance
            
        except Exception as e:
            logger.error(f"Failed to calculate farm performance: {e}")
            raise
    
    async def _calculate_agent_coordination_score(self, farm_id: str) -> float:
        """Calculate how well agents are coordinating within the farm"""
        try:
            farm = self.active_farms.get(farm_id)
            if not farm or farm.current_agents < 2:
                return 1.0  # Perfect score for single agent or no agents
            
            # Get agent correlation data
            agent_performance_service = self.registry.get_service("agent_performance_service")
            if not agent_performance_service:
                return 0.5
            
            # Calculate coordination metrics
            coordination_factors = []
            
            # Factor 1: Trade timing coordination
            trade_timing_sync = await self._calculate_trade_timing_sync(farm_id)
            coordination_factors.append(trade_timing_sync)
            
            # Factor 2: Risk distribution
            risk_distribution_score = await self._calculate_risk_distribution_score(farm_id)
            coordination_factors.append(risk_distribution_score)
            
            # Factor 3: Strategy complementarity
            strategy_complement_score = await self._calculate_strategy_complement_score(farm_id)
            coordination_factors.append(strategy_complement_score)
            
            # Average coordination score
            coordination_score = sum(coordination_factors) / len(coordination_factors) if coordination_factors else 0.5
            
            return max(0.0, min(1.0, coordination_score))
            
        except Exception as e:
            logger.error(f"Failed to calculate agent coordination score: {e}")
            return 0.5
    
    async def _calculate_strategy_efficiency(self, farm_id: str) -> float:
        """Calculate strategy efficiency for the farm"""
        try:
            farm = self.active_farms.get(farm_id)
            if not farm:
                return 0.0
            
            # Get recent performance data
            if farm_id not in self.farm_performance or not self.farm_performance[farm_id]:
                return 0.5
            
            recent_performances = self.farm_performance[farm_id][-10:]  # Last 10 records
            
            # Calculate efficiency factors
            efficiency_factors = []
            
            # Factor 1: Profit consistency
            profits = [float(p.total_profit) for p in recent_performances]
            if profits:
                profit_consistency = 1.0 - (max(profits) - min(profits)) / (max(profits) + 0.001)
                efficiency_factors.append(max(0.0, profit_consistency))
            
            # Factor 2: Win rate stability
            win_rates = [p.win_rate for p in recent_performances]
            if win_rates:
                win_rate_stability = 1.0 - (max(win_rates) - min(win_rates))
                efficiency_factors.append(max(0.0, win_rate_stability))
            
            # Factor 3: Trade execution efficiency
            trade_counts = [p.total_trades for p in recent_performances]
            if trade_counts and max(trade_counts) > 0:
                trade_efficiency = sum(trade_counts) / (len(trade_counts) * max(trade_counts))
                efficiency_factors.append(trade_efficiency)
            
            # Calculate overall efficiency
            efficiency = sum(efficiency_factors) / len(efficiency_factors) if efficiency_factors else 0.5
            
            return max(0.0, min(1.0, efficiency))
            
        except Exception as e:
            logger.error(f"Failed to calculate strategy efficiency: {e}")
            return 0.5
    
    async def _load_active_farms(self):
        """Load active farms from database"""
        try:
            if self.supabase:
                response = self.supabase.table('farms').select('*')\
                    .in_('status', [FarmStatus.ACTIVE.value, FarmStatus.PAUSED.value])\
                    .execute()
                
                for farm_data in response.data:
                    farm = Farm(
                        farm_id=farm_data['farm_id'],
                        farm_name=farm_data['farm_name'],
                        farm_type=FarmType(farm_data['farm_type']),
                        description=farm_data['description'],
                        status=FarmStatus(farm_data['status']),
                        max_agents=farm_data['max_agents'],
                        current_agents=farm_data['current_agents'],
                        assigned_agents=farm_data.get('assigned_agents', []),
                        strategy_config=farm_data.get('strategy_config', {}),
                        performance_target=farm_data.get('performance_target', {}),
                        risk_limits=farm_data.get('risk_limits', {}),
                        created_at=datetime.fromisoformat(farm_data['created_at']),
                        updated_at=datetime.fromisoformat(farm_data['updated_at']),
                        metadata=farm_data.get('metadata', {})
                    )
                    
                    self.active_farms[farm.farm_id] = farm
                
                logger.info(f"Loaded {len(self.active_farms)} active farms")
                
        except Exception as e:
            logger.error(f"Failed to load active farms: {e}")
    
    async def _load_agent_assignments(self):
        """Load agent assignments from database"""
        try:
            if self.supabase:
                response = self.supabase.table('farm_agent_assignments').select('*')\
                    .eq('is_active', True).execute()
                
                for assignment_data in response.data:
                    assignment = AgentAssignment(
                        assignment_id=assignment_data['assignment_id'],
                        farm_id=assignment_data['farm_id'],
                        agent_id=assignment_data['agent_id'],
                        assigned_at=datetime.fromisoformat(assignment_data['assigned_at']),
                        role=assignment_data['role'],
                        performance_weight=assignment_data['performance_weight'],
                        is_active=assignment_data['is_active']
                    )
                    
                    if assignment.farm_id not in self.agent_assignments:
                        self.agent_assignments[assignment.farm_id] = []
                    self.agent_assignments[assignment.farm_id].append(assignment)
                
                logger.info(f"Loaded agent assignments for {len(self.agent_assignments)} farms")
                
        except Exception as e:
            logger.error(f"Failed to load agent assignments: {e}")
    
    # Background monitoring loops
    async def _farm_coordination_loop(self):
        """Background farm coordination monitoring"""
        while True:
            try:
                await asyncio.sleep(self.coordination_check_interval)
                
                for farm_id, farm in self.active_farms.items():
                    if farm.status == FarmStatus.ACTIVE:
                        await self._monitor_farm_coordination(farm_id)
                
            except Exception as e:
                logger.error(f"Error in farm coordination loop: {e}")
                await asyncio.sleep(60)
    
    async def _performance_monitoring_loop(self):
        """Background performance monitoring"""
        while True:
            try:
                await asyncio.sleep(self.performance_update_interval)
                
                for farm_id in self.active_farms:
                    await self.calculate_farm_performance(farm_id)
                
            except Exception as e:
                logger.error(f"Error in performance monitoring loop: {e}")
                await asyncio.sleep(60)
    
    async def _farm_rebalancing_loop(self):
        """Background farm rebalancing"""
        while True:
            try:
                await asyncio.sleep(self.rebalancing_interval)
                
                for farm_id in self.active_farms:
                    await self._rebalance_farm(farm_id)
                
            except Exception as e:
                logger.error(f"Error in farm rebalancing loop: {e}")
                await asyncio.sleep(300)
    
    async def get_farm_status(self, farm_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive farm status"""
        try:
            farm = self.active_farms.get(farm_id)
            if not farm:
                return None
            
            # Get latest performance
            latest_performance = None
            if farm_id in self.farm_performance and self.farm_performance[farm_id]:
                latest_performance = self.farm_performance[farm_id][-1]
            
            return {
                "farm_id": farm_id,
                "name": farm.farm_name,
                "type": farm.farm_type.value,
                "status": farm.status.value,
                "current_agents": farm.current_agents,
                "max_agents": farm.max_agents,
                "assigned_agents": farm.assigned_agents,
                "strategy_config": farm.strategy_config,
                "latest_performance": asdict(latest_performance) if latest_performance else None,
                "created_at": farm.created_at.isoformat(),
                "updated_at": farm.updated_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get farm status: {e}")
            return None
    
    async def get_all_active_farms(self) -> List[Farm]:
        """Get all active farms"""
        return [farm for farm in self.active_farms.values() if farm.status in [FarmStatus.ACTIVE, FarmStatus.PAUSED]]
    
    async def get_service_status(self) -> Dict[str, Any]:
        """Get service status and metrics"""
        active_farms = sum(1 for farm in self.active_farms.values() if farm.status == FarmStatus.ACTIVE)
        total_agents = sum(farm.current_agents for farm in self.active_farms.values())
        
        return {
            "service": "farm_management_service",
            "status": "running", 
            "total_farms": len(self.active_farms),
            "active_farms": active_farms,
            "total_assigned_agents": total_agents,
            "farm_types": list(set(farm.farm_type.value for farm in self.active_farms.values())),
            "last_health_check": datetime.now(timezone.utc).isoformat()
        }

# Factory function for service registry
def create_farm_management_service():
    """Factory function to create FarmManagementService instance"""
    registry = get_registry()
    redis_client = registry.get_connection("redis")
    supabase_client = registry.get_connection("supabase")
    
    service = FarmManagementService(redis_client, supabase_client)
    return service