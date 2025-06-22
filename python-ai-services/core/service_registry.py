"""
Core Service Registry for Dependency Injection
Centralized service and connection management for the monorepo
"""

import logging
from typing import Dict, Any, Optional, Callable
import asyncio
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class ServiceRegistry:
    """
    Centralized registry for managing services and connections
    Provides dependency injection and lifecycle management
    """
    
    def __init__(self):
        self._services: Dict[str, Any] = {}
        self._connections: Dict[str, Any] = {}
        self._factories: Dict[str, Callable] = {}
        self._initialized = False
    
    def register_connection(self, name: str, connection: Any) -> None:
        """Register a database/cache connection"""
        self._connections[name] = connection
        logger.info(f"Registered connection: {name}")
    
    def register_service(self, name: str, service: Any) -> None:
        """Register a service instance"""
        self._services[name] = service
        logger.info(f"Registered service: {name}")
    
    def register_service_factory(self, name: str, factory: Callable) -> None:
        """Register a factory function for lazy service initialization"""
        self._factories[name] = factory
        logger.info(f"Registered service factory: {name}")
    
    def get_connection(self, name: str) -> Optional[Any]:
        """Get a connection by name"""
        connection = self._connections.get(name)
        if not connection:
            logger.warning(f"Connection '{name}' not found")
        return connection
    
    def get_service(self, name: str) -> Optional[Any]:
        """Get a service by name, creating it from factory if needed"""
        # Check if service already exists
        if name in self._services:
            return self._services[name]
        
        # Check if factory exists to create service
        if name in self._factories:
            logger.info(f"Creating service '{name}' from factory")
            service = self._factories[name]()
            self._services[name] = service
            return service
        
        logger.warning(f"Service '{name}' not found")
        return None
    
    def list_services(self) -> list:
        """List all available services"""
        available = list(self._services.keys()) + list(self._factories.keys())
        return sorted(set(available))
    
    def list_connections(self) -> list:
        """List all available connections"""
        return sorted(self._connections.keys())
    
    @property
    def all_services(self) -> Dict[str, Any]:
        """Get all initialized services"""
        return self._services.copy()
    
    @property 
    def all_connections(self) -> Dict[str, Any]:
        """Get all connections"""
        return self._connections.copy()
    
    def is_initialized(self) -> bool:
        """Check if registry is initialized"""
        return self._initialized
    
    def mark_initialized(self) -> None:
        """Mark registry as initialized"""
        self._initialized = True
        logger.info("Service registry marked as initialized")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all services and connections"""
        health_status = {
            "registry": "healthy",
            "services": {},
            "connections": {},
            "summary": {
                "total_services": len(self._services),
                "total_connections": len(self._connections),
                "total_factories": len(self._factories)
            }
        }
        
        # Check services
        for name, service in self._services.items():
            try:
                if hasattr(service, 'health_check'):
                    status = await service.health_check()
                    health_status["services"][name] = status
                else:
                    health_status["services"][name] = "available"
            except Exception as e:
                health_status["services"][name] = f"error: {str(e)}"
                logger.error(f"Health check failed for service {name}: {e}")
        
        # Check connections
        for name, connection in self._connections.items():
            try:
                if name == "redis" and hasattr(connection, 'ping'):
                    await connection.ping()
                    health_status["connections"][name] = "connected"
                elif name == "supabase":
                    # Simple health check for Supabase
                    result = connection.table('users').select('id').limit(1).execute()
                    health_status["connections"][name] = "connected"
                else:
                    health_status["connections"][name] = "available"
            except Exception as e:
                health_status["connections"][name] = f"error: {str(e)}"
                logger.error(f"Health check failed for connection {name}: {e}")
        
        return health_status
    
    async def cleanup(self) -> None:
        """Cleanup all connections and services"""
        logger.info("Starting registry cleanup...")
        
        # Cleanup services with cleanup methods
        for name, service in self._services.items():
            try:
                if hasattr(service, 'cleanup'):
                    await service.cleanup()
                    logger.info(f"Cleaned up service: {name}")
            except Exception as e:
                logger.error(f"Error cleaning up service {name}: {e}")
        
        # Cleanup connections
        for name, connection in self._connections.items():
            try:
                if name == "redis" and hasattr(connection, 'close'):
                    if asyncio.iscoroutinefunction(connection.close):
                        await connection.close()
                    else:
                        connection.close()
                    logger.info(f"Closed connection: {name}")
            except Exception as e:
                logger.error(f"Error closing connection {name}: {e}")
        
        self._services.clear()
        self._connections.clear()
        self._factories.clear()
        self._initialized = False
        logger.info("Registry cleanup completed")

# Import and register Phase 2 agent trading services
def register_agent_trading_services():
    """Register Phase 2 agent trading integration services"""
    from ..services.agent_trading_bridge import create_agent_trading_bridge
    from ..services.trading_safety_service import create_trading_safety_service
    from ..services.agent_performance_service import create_agent_performance_service
    from ..services.agent_coordination_service import create_agent_coordination_service
    
    # Register safety service first (no dependencies)
    registry.register_service_factory("trading_safety_service", create_trading_safety_service)
    
    # Register performance service (no dependencies)
    registry.register_service_factory("agent_performance_service", create_agent_performance_service)
    
    # Register agent trading bridge (requires execution, risk, agent services)
    def create_bridge():
        execution_service = registry.get_service("execution_specialist_service")
        risk_service = registry.get_service("risk_manager_service")
        agent_service = registry.get_service("agent_management_service")
        return create_agent_trading_bridge(execution_service, risk_service, agent_service)
    
    registry.register_service_factory("agent_trading_bridge", create_bridge)
    
    # Register coordination service (requires bridge, safety, performance)
    def create_coordination():
        bridge = registry.get_service("agent_trading_bridge")
        safety = registry.get_service("trading_safety_service")
        performance = registry.get_service("agent_performance_service")
        return create_agent_coordination_service(bridge, safety, performance)
    
    registry.register_service_factory("agent_coordination_service", create_coordination)
    
    logger.info("Registered Phase 2 agent trading services")

# Import and register Phase 5 advanced services
def register_phase5_services():
    """Register Phase 5 advanced agent operations and analytics services"""
    from ..services.agent_scheduler_service import create_agent_scheduler_service
    from ..services.market_regime_service import create_market_regime_service
    from ..services.adaptive_risk_service import create_adaptive_risk_service
    from ..services.portfolio_optimizer_service import create_portfolio_optimizer_service
    from ..services.alerting_service import create_alerting_service
    
    # Register standalone services
    registry.register_service_factory("agent_scheduler_service", create_agent_scheduler_service)
    registry.register_service_factory("market_regime_service", create_market_regime_service)
    registry.register_service_factory("adaptive_risk_service", create_adaptive_risk_service)
    registry.register_service_factory("portfolio_optimizer_service", create_portfolio_optimizer_service)
    registry.register_service_factory("alerting_service", create_alerting_service)
    
    logger.info("Registered Phase 5 advanced services")

# Import and register Phase 6-8 autonomous services
def register_autonomous_services():
    """Register Phase 6-8 autonomous services (Master Wallet, Farms, Goals)"""
    from ..services.autonomous_fund_distribution_engine import create_autonomous_fund_distribution_engine
    from ..contracts.master_wallet_contracts import create_master_wallet_smart_contract_service
    from ..services.goal_management_service import create_goal_management_service
    from ..services.farm_management_service import create_farm_management_service
    
    # Register autonomous fund distribution engine
    registry.register_service_factory("autonomous_fund_distribution_engine", create_autonomous_fund_distribution_engine)
    
    # Register smart contract service
    registry.register_service_factory("master_wallet_contracts", create_master_wallet_smart_contract_service)
    
    # Register goal management service
    registry.register_service_factory("goal_management_service", create_goal_management_service)
    
    # Register farm management service
    registry.register_service_factory("farm_management_service", create_farm_management_service)
    
    logger.info("Registered Phase 6-8 autonomous services")

# Global registry instance
registry = ServiceRegistry()

def get_registry() -> ServiceRegistry:
    """Get the global service registry"""
    return registry

# Dependency injection helpers for FastAPI
def get_service_dependency(service_name: str):
    """Create a FastAPI dependency for a service"""
    def dependency():
        service = registry.get_service(service_name)
        if not service:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=503, 
                detail=f"Service '{service_name}' is not available"
            )
        return service
    
    dependency.__name__ = f"get_{service_name}_service"
    return dependency

def get_connection_dependency(connection_name: str):
    """Create a FastAPI dependency for a connection"""
    def dependency():
        connection = registry.get_connection(connection_name)
        if not connection:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=503, 
                detail=f"Connection '{connection_name}' is not available"
            )
        return connection
    
    dependency.__name__ = f"get_{connection_name}_connection"
    return dependency

# Context manager for service lifecycle
@asynccontextmanager
async def service_lifecycle():
    """Context manager for service lifecycle management"""
    try:
        logger.info("Starting service lifecycle")
        yield registry
    finally:
        logger.info("Ending service lifecycle")
        await registry.cleanup()