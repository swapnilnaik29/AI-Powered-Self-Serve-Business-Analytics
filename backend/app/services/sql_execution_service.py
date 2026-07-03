import logging
import sqlite3
import os
from typing import Optional, Tuple

import duckdb
import pandas as pd

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_cached_accounts: Optional[pd.DataFrame] = None
_cached_customers: Optional[pd.DataFrame] = None
_cached_loans: Optional[pd.DataFrame] = None
_cached_transactions: Optional[pd.DataFrame] = None


def _load_dataframes() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    global _cached_accounts, _cached_customers, _cached_loans, _cached_transactions
    if (
        _cached_accounts is not None
        and _cached_customers is not None
        and _cached_loans is not None
        and _cached_transactions is not None
    ):
        return _cached_accounts, _cached_customers, _cached_loans, _cached_transactions

    settings = get_settings()
    db_path = settings.payments_db_path

    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        _cached_accounts = pd.read_sql("SELECT * FROM accounts", conn)
        _cached_customers = pd.read_sql("SELECT * FROM customers", conn)
        _cached_loans = pd.read_sql("SELECT * FROM loans", conn)
        _cached_transactions = pd.read_sql("SELECT * FROM transactions", conn)
        conn.close()
    else:
        # Fallback to load CSV files directly
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        dataset_dir = os.path.join(os.path.dirname(base_dir), "dataset")
        _cached_accounts = pd.read_csv(os.path.join(dataset_dir, "accounts.csv"))
        _cached_customers = pd.read_csv(os.path.join(dataset_dir, "customers.csv"))
        _cached_loans = pd.read_csv(os.path.join(dataset_dir, "loans.csv"))
        _cached_transactions = pd.read_csv(os.path.join(dataset_dir, "transactions.csv"))

    # Normalize datetimes for duckdb
    if "opened_date" in _cached_accounts.columns:
        _cached_accounts["opened_date"] = pd.to_datetime(_cached_accounts["opened_date"]).dt.tz_localize(None)
    if "last_transaction_date" in _cached_accounts.columns:
        _cached_accounts["last_transaction_date"] = pd.to_datetime(_cached_accounts["last_transaction_date"]).dt.tz_localize(None)

    if "customer_since" in _cached_customers.columns:
        _cached_customers["customer_since"] = pd.to_datetime(_cached_customers["customer_since"]).dt.tz_localize(None)

    if "disbursement_date" in _cached_loans.columns:
        _cached_loans["disbursement_date"] = pd.to_datetime(_cached_loans["disbursement_date"]).dt.tz_localize(None)
    if "maturity_date" in _cached_loans.columns:
        _cached_loans["maturity_date"] = pd.to_datetime(_cached_loans["maturity_date"]).dt.tz_localize(None)

    if "transaction_datetime" in _cached_transactions.columns:
        _cached_transactions["transaction_datetime"] = pd.to_datetime(_cached_transactions["transaction_datetime"]).dt.tz_localize(None)
    if "transaction_date" in _cached_transactions.columns:
        _cached_transactions["transaction_date"] = pd.to_datetime(_cached_transactions["transaction_date"]).dt.tz_localize(None)
    
    logger.info("Loaded DataFrames: %d accounts, %d customers, %d loans, %d transactions",
                len(_cached_accounts), len(_cached_customers), len(_cached_loans), len(_cached_transactions))
    return _cached_accounts, _cached_customers, _cached_loans, _cached_transactions


class SQLExecutionService:
    def execute(self, sql: str) -> Tuple[Optional[pd.DataFrame], bool]:
        accounts, customers, loans, transactions = _load_dataframes()
        con = duckdb.connect()
        try:
            # Register tables
            con.register("accounts", accounts)
            con.register("customers", customers)
            con.register("loans", loans)
            con.register("transactions", transactions)
            
            result = con.execute(sql).fetchdf()
            logger.debug("SQL executed successfully, %d rows returned", len(result))
            return result, True
        except Exception as e:
            logger.warning("SQL execution failed: %s | Query: %s", e, sql[:200])
            return None, False
        finally:
            con.close()
