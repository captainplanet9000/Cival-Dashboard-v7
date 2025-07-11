import json
from typing import List, Optional, Dict, Any, Callable
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, asc
from datetime import datetime, timezone
import uuid # For internal_order_id if not using DB default, but DB model has default

from ..models.db_models import OrderDB
from ..models.dashboard_models import OrderLogItem # For converting DB model to Pydantic for API responses
from ..models.hyperliquid_models import HyperliquidOrderResponseData # For type hinting
# Pydantic model for parameters when creating an order - assuming a generic Dict for now,
# but could be a specific Pydantic model if defined (e.g. GenericOrderParams)
# from ..models.trading_models import GenericOrderParams

from loguru import logger

class OrderHistoryServiceError(Exception):
    pass

class OrderHistoryService:
    def __init__(self, session_factory: Callable[[], Session]):
        self.session_factory = session_factory
        logger.info("OrderHistoryService initialized with database session factory.")

    def _pydantic_order_to_db_dict(self, order_data: Dict[str, Any], agent_id: str, strategy_name: Optional[str], client_order_id: Optional[str]) -> Dict[str, Any]:
        """
        Prepares a dictionary from input data suitable for creating an OrderDB instance.
        'order_data' here is assumed to be the 'trade_params' from TradingCoordinator.
        """
        # Extract relevant fields from order_data (trade_params)
        # This mapping depends on the structure of 'trade_params'
        return {
            "agent_id": agent_id,
            "asset": order_data.get("symbol"),
            "side": order_data.get("action"), # 'action' in trade_params maps to 'side'
            "order_type": order_data.get("order_type"),
            "quantity": float(order_data.get("quantity", 0.0)),
            "limit_price": float(order_data.get("price")) if order_data.get("price") is not None else None,
            "status": "PENDING_SUBMISSION", # Initial status before actual submission attempt
            "client_order_id": client_order_id,
            "raw_order_params_json": json.dumps(order_data), # Store the original params
            "strategy_name": strategy_name,
            "associated_fill_ids_json": "[]" # Initialize as empty list
            # internal_order_id, timestamp_created, timestamp_updated are set by DB/default
        }

    def _db_order_to_pydantic_log_item(self, db_order: OrderDB) -> OrderLogItem:
        """Converts OrderDB ORM object to OrderLogItem Pydantic model."""
        return OrderLogItem(
            internal_order_id=db_order.internal_order_id,
            agent_id=db_order.agent_id,
            timestamp_created=db_order.timestamp_created,
            timestamp_updated=db_order.timestamp_updated,
            asset=db_order.asset,
            side=db_order.side, # type: ignore # Literal should match
            order_type=db_order.order_type, # type: ignore # Literal should match
            quantity=db_order.quantity,
            limit_price=db_order.limit_price,
            status=db_order.status, # type: ignore # Literal should match
            exchange_order_id=db_order.exchange_order_id,
            client_order_id=db_order.client_order_id,
            error_message=db_order.error_message,
            # associated_fill_ids are not directly in OrderLogItem, handled separately if needed by caller
            strategy_name=db_order.strategy_name
        )

    async def record_order_submission(
        self,
        agent_id: str,
        order_params: Dict[str, Any], # This is the original trade_params from TC
        strategy_name: Optional[str] = None,
        client_order_id: Optional[str] = None
    ) -> OrderDB:
        db: Session = self.session_factory()
        logger.debug(f"OHS: Recording order submission for agent {agent_id}, params: {order_params}")
        try:
            db_order_data_dict = self._pydantic_order_to_db_dict(order_params, agent_id, strategy_name, client_order_id)

            # internal_order_id will be generated by default by the DB model
            db_order = OrderDB(**db_order_data_dict)

            db.add(db_order)
            db.commit()
            db.refresh(db_order) # To get DB-generated values like internal_order_id, timestamps
            logger.info(f"OHS: Order {db_order.internal_order_id} recorded to DB for agent {agent_id} with status PENDING_SUBMISSION.")
            return db_order
        except Exception as e:
            db.rollback()
            logger.error(f"OHS: Failed to record order for agent {agent_id} to DB: {e}", exc_info=True)
            raise OrderHistoryServiceError(f"DB error recording order: {e}")
        finally:
            db.close()

    async def update_order_from_hl_response(
        self,
        internal_order_id: str,
        hl_response: HyperliquidOrderResponseData, # Pydantic model from HLES
        error_str: Optional[str] = None
    ):
        db: Session = self.session_factory()
        logger.info(f"OHS: Updating order {internal_order_id} based on HL response. Status: {hl_response.status}, OID: {hl_response.oid}, Error: {error_str}")
        try:
            db_order = db.query(OrderDB).filter(OrderDB.internal_order_id == internal_order_id).first()
            if not db_order:
                logger.error(f"OHS: Order {internal_order_id} not found in DB for HL update.")
                raise OrderHistoryServiceError(f"Order {internal_order_id} not found for HL update.")

            if error_str:
                db_order.status = "ERROR"
                db_order.error_message = error_str
            else:
                # Map HL status to internal status
                # Example mapping:
                # HL 'resting' -> 'ACCEPTED_BY_EXCHANGE' (order is on book)
                # HL 'filled' -> 'FILLED'
                # HL 'canceled' -> 'CANCELED'
                # HL 'rejected' -> 'REJECTED_BY_EXCHANGE'
                # HL 'ok' (general success for some actions) -> might need context, or use current status if no specific mapping
                hl_status = hl_response.status.lower()
                if hl_status == "resting":
                    db_order.status = "ACCEPTED_BY_EXCHANGE"
                elif hl_status == "filled":
                    db_order.status = "FILLED"
                elif hl_status == "canceled": # Assuming HL uses "canceled"
                    db_order.status = "CANCELED"
                elif hl_status == "rejected": # Assuming HL uses "rejected"
                    db_order.status = "REJECTED_BY_EXCHANGE"
                elif hl_status == "error": # If HL response itself indicates an error status
                     db_order.status = "ERROR"
                     # Potentially parse error from hl_response if available
                     db_order.error_message = "Error status from Hyperliquid"
                else: # Default for "ok" or other unmapped statuses
                    logger.warning(f"OHS: Unmapped Hyperliquid status '{hl_response.status}' for order {internal_order_id}. Current DB status: {db_order.status}")
                    # Maintain current status or set to a generic "SUBMITTED_TO_EXCHANGE" if appropriate
                    if db_order.status == "PENDING_SUBMISSION": # If it was just submitted
                        db_order.status = "SUBMITTED_TO_EXCHANGE"


            if hl_response.oid is not None:
                db_order.exchange_order_id = str(hl_response.oid)

            db_order.timestamp_updated = datetime.now(timezone.utc)
            db.commit()
            logger.info(f"OHS: Order {internal_order_id} updated. New status: {db_order.status}, Exchange OID: {db_order.exchange_order_id}")
        except Exception as e:
            db.rollback()
            logger.error(f"OHS: Failed to update order {internal_order_id} from HL response: {e}", exc_info=True)
            raise OrderHistoryServiceError(f"DB error updating order from HL response: {e}")
        finally:
            db.close()

    async def update_order_from_dex_response(self, internal_order_id: str, dex_tx_response: Dict[str, Any]):
        db: Session = self.session_factory()
        logger.info(f"OHS: Updating order {internal_order_id} based on DEX response: {dex_tx_response}")
        try:
            db_order = db.query(OrderDB).filter(OrderDB.internal_order_id == internal_order_id).first()
            if not db_order:
                logger.error(f"OHS: Order {internal_order_id} not found in DB for DEX update.")
                raise OrderHistoryServiceError(f"Order {internal_order_id} not found for DEX update.")

            dex_status = dex_tx_response.get("status", "").lower()
            if "success" in dex_status: # e.g. "success", "success_mocked_dex"
                # For DEX, "success" might mean transaction submitted. It might not be FILLED yet.
                # If fills are immediate, it could be FILLED. For now, let's use ACCEPTED.
                db_order.status = "ACCEPTED_BY_EXCHANGE"
                # If DEX response guarantees fill, set to FILLED.
                # if dex_tx_response.get("amount_out_wei_actual") is not None: db_order.status = "FILLED"
            elif "failed" in dex_status:
                db_order.status = "REJECTED_BY_EXCHANGE"
                db_order.error_message = dex_tx_response.get("error", "DEX transaction failed")
            else: # Unrecognized status
                logger.warning(f"OHS: Unmapped DEX status '{dex_tx_response.get('status')}' for order {internal_order_id}. Keeping status: {db_order.status}")
                if db_order.status == "PENDING_SUBMISSION":
                    db_order.status = "SUBMITTED_TO_EXCHANGE"


            tx_hash = dex_tx_response.get("tx_hash")
            if tx_hash:
                db_order.exchange_order_id = tx_hash # Store tx_hash as exchange_order_id for DEX

            db_order.timestamp_updated = datetime.now(timezone.utc)
            db.commit()
            logger.info(f"OHS: Order {internal_order_id} updated from DEX response. New status: {db_order.status}, TxHash: {db_order.exchange_order_id}")
        except Exception as e:
            db.rollback()
            logger.error(f"OHS: Failed to update order {internal_order_id} from DEX response: {e}", exc_info=True)
            raise OrderHistoryServiceError(f"DB error updating order from DEX response: {e}")
        finally:
            db.close()

    async def update_order_status(self, internal_order_id: str, new_status: str, error_message: Optional[str] = None, exchange_order_id: Optional[str] = None):
        db: Session = self.session_factory()
        logger.info(f"OHS: Updating status for order {internal_order_id} to {new_status}. Error: {error_message}, ExchangeOID: {exchange_order_id}")
        try:
            db_order = db.query(OrderDB).filter(OrderDB.internal_order_id == internal_order_id).first()
            if not db_order:
                logger.error(f"OHS: Order {internal_order_id} not found for status update.")
                raise OrderHistoryServiceError(f"Order {internal_order_id} not found for status update.")

            db_order.status = new_status
            if error_message:
                db_order.error_message = error_message
            if exchange_order_id: # Useful if exchange ID comes later or needs correction
                db_order.exchange_order_id = exchange_order_id

            db_order.timestamp_updated = datetime.now(timezone.utc)
            db.commit()
            logger.info(f"OHS: Order {internal_order_id} status updated to {new_status}.")
        except Exception as e:
            db.rollback()
            logger.error(f"OHS: Failed to update status for order {internal_order_id}: {e}", exc_info=True)
            raise OrderHistoryServiceError(f"DB error updating order status: {e}")
        finally:
            db.close()

    async def link_fill_to_order(self, internal_order_id: str, fill_id: str):
        db: Session = self.session_factory()
        logger.info(f"OHS: Linking fill_id {fill_id} to order {internal_order_id}.")
        try:
            db_order = db.query(OrderDB).filter(OrderDB.internal_order_id == internal_order_id).first()
            if not db_order:
                logger.error(f"OHS: Order {internal_order_id} not found for linking fill {fill_id}.")
                raise OrderHistoryServiceError(f"Order {internal_order_id} not found for linking fill.")

            fill_ids_list = json.loads(db_order.associated_fill_ids_json or "[]")
            if fill_id not in fill_ids_list:
                fill_ids_list.append(fill_id)
                db_order.associated_fill_ids_json = json.dumps(fill_ids_list)
                db_order.timestamp_updated = datetime.now(timezone.utc)
                db.commit()
                logger.info(f"OHS: Fill {fill_id} linked to order {internal_order_id}. Current links: {fill_ids_list}")
            else:
                logger.debug(f"OHS: Fill {fill_id} already linked to order {internal_order_id}.")
        except Exception as e:
            db.rollback()
            logger.error(f"OHS: Failed to link fill {fill_id} to order {internal_order_id}: {e}", exc_info=True)
            raise OrderHistoryServiceError(f"DB error linking fill to order: {e}")
        finally:
            db.close()

    async def get_orders_for_agent(
        self, agent_id: str, limit: int = 100, offset: int = 0,
        status_filter: Optional[str] = None, sort_desc: bool = True
    ) -> List[OrderDB]: # Returning ORM objects directly
        db: Session = self.session_factory()
        logger.debug(f"OHS: Fetching orders for agent {agent_id}. Limit: {limit}, Offset: {offset}, Status: {status_filter}")
        try:
            stmt = select(OrderDB).where(OrderDB.agent_id == agent_id)
            if status_filter:
                stmt = stmt.where(OrderDB.status == status_filter)

            if sort_desc:
                stmt = stmt.order_by(desc(OrderDB.timestamp_created))
            else:
                stmt = stmt.order_by(asc(OrderDB.timestamp_created))

            stmt = stmt.limit(limit).offset(offset)

            results = db.execute(stmt).scalars().all()
            logger.info(f"OHS: Retrieved {len(results)} orders from DB for agent {agent_id}.")
            return list(results)
        except Exception as e:
            logger.error(f"OHS: Failed to retrieve orders for agent {agent_id} from DB: {e}", exc_info=True)
            raise OrderHistoryServiceError(f"DB error retrieving orders: {e}")
        finally:
            db.close()

    async def get_order_by_internal_id(self, internal_order_id: str) -> Optional[OrderDB]:
        db: Session = self.session_factory()
        logger.debug(f"OHS: Fetching order by internal_order_id {internal_order_id}.")
        try:
            stmt = select(OrderDB).where(OrderDB.internal_order_id == internal_order_id)
            result = db.execute(stmt).scalar_one_or_none()
            if result:
                logger.info(f"OHS: Order {internal_order_id} found.")
            else:
                logger.info(f"OHS: Order {internal_order_id} not found.")
            return result
        except Exception as e:
            logger.error(f"OHS: Failed to retrieve order {internal_order_id}: {e}", exc_info=True)
            raise OrderHistoryServiceError(f"DB error retrieving order by internal ID: {e}")
        finally:
            db.close()

