"""
Seed script: generates users and payments data, populates business glossary and data catalog.
Run from backend/: python -m seed.seed_data
"""

import sys
import os
import random
import sqlite3

import numpy as np
import pandas as pd
from faker import Faker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.core.database import engine, SessionLocal
from app.core.security import hash_password
from app.models.base import Base
from app.models.user import User
from app.models.business_glossary import BusinessGlossary
from app.models.data_catalog import DataCatalog

import json

def seed_analytics_db():
    settings = get_settings()
    db_path = settings.payments_db_path
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(os.path.dirname(base_dir), "dataset")
    
    print(f"Loading real datasets from {dataset_dir}...")
    accounts_df = pd.read_csv(os.path.join(dataset_dir, "accounts.csv"))
    customers_df = pd.read_csv(os.path.join(dataset_dir, "customers.csv"))
    loans_df = pd.read_csv(os.path.join(dataset_dir, "loans.csv"))
    transactions_df = pd.read_csv(os.path.join(dataset_dir, "transactions.csv"))

    conn = sqlite3.connect(db_path)
    accounts_df.to_sql("accounts", conn, index=False, if_exists="replace")
    customers_df.to_sql("customers", conn, index=False, if_exists="replace")
    loans_df.to_sql("loans", conn, index=False, if_exists="replace")
    transactions_df.to_sql("transactions", conn, index=False, if_exists="replace")
    conn.close()

    print(f"Created Analytics DB with {len(accounts_df)} accounts, {len(customers_df)} customers, {len(loans_df)} loans, and {len(transactions_df)} transactions at {db_path}")


def seed_admin_user(session):
    existing = session.query(User).filter(User.email == "admin@analytics.com").first()
    if existing:
        print("Admin user already exists.")
        return

    admin = User(
        email="admin@analytics.com",
        hashed_password=hash_password("admin123!"),
        full_name="System Admin",
        role="admin",
    )
    session.add(admin)
    session.commit()
    print("Created admin user: admin@analytics.com / admin123!")


def seed_glossary(session):
    if session.query(BusinessGlossary).count() > 0:
        session.query(BusinessGlossary).delete()
        session.commit()

    entries = [
        BusinessGlossary(
            term="Revenue",
            definition="Total value of successful customer outbound payments, debit transactions, and transfers",
            sql_expression="SUM(amount) WHERE status='SUCCESS' AND transaction_type IN ('DEBIT', 'PAYMENT', 'TRANSFER')",
            category="Financial",
            created_by=1,
        ),
        BusinessGlossary(
            term="Transactions",
            definition="Total number of transaction records",
            sql_expression="COUNT(*)",
            category="Volume",
            created_by=1,
        ),
        BusinessGlossary(
            term="NPA Rate",
            definition="Percentage of loans categorized as Non-Performing Assets (defaults)",
            sql_expression="COUNT(CASE WHEN is_npa=True THEN 1 END) * 100.0 / COUNT(*)",
            category="Quality",
            created_by=1,
        ),
        BusinessGlossary(
            term="Active Accounts",
            definition="Total count of active bank accounts",
            sql_expression="COUNT(account_id) WHERE account_status='ACTIVE'",
            category="Accounts",
            created_by=1,
        ),
        BusinessGlossary(
            term="Outstanding Balance",
            definition="Sum of outstanding unpaid balances on all active loans",
            sql_expression="SUM(outstanding_balance) WHERE loan_status='ACTIVE'",
            category="Financial",
            created_by=1,
        )
    ]
    session.add_all(entries)
    session.commit()
    print(f"Seeded {len(entries)} glossary entries.")


def seed_catalog(session):
    if session.query(DataCatalog).count() > 0:
        session.query(DataCatalog).delete()
        session.commit()

    catalog_metadata = {
        "accounts": {
            "account_id": ("INTEGER / VARCHAR", "Unique identifier for the bank account", True, ["[MASKED]"]),
            "customer_id": ("VARCHAR", "Identifier for the customer who owns the account", True, ["[MASKED]"]),
            "account_type": ("VARCHAR", "Type of account (SAVINGS, CHECKING, CREDIT, FIXED_DEPOSIT, INVESTMENT)", False, ["SAVINGS", "CHECKING"]),
            "account_number": ("VARCHAR", "Unique bank account number", True, ["[MASKED]"]),
            "ifsc_routing_code": ("VARCHAR", "Routing/IFSC transit code for transfers", False, ["BANK4984"]),
            "currency": ("VARCHAR", "Local currency of the account (USD, INR, GBP, EUR)", False, ["USD", "INR"]),
            "current_balance": ("FLOAT", "Current total ledger balance in the account", False, [7291.64]),
            "available_balance": ("FLOAT", "Spendable balance after pending hold transactions", False, [7049.80]),
            "credit_limit": ("FLOAT", "Maximum credit limit if it is a credit card or overdraft account", False, [50000.00]),
            "interest_rate_pct": ("FLOAT", "Annualized interest rate percentage applied", False, [3.5]),
            "account_status": ("VARCHAR", "Status of the account (ACTIVE, DORMANT, CLOSED)", False, ["ACTIVE", "DORMANT"]),
            "opened_date": ("DATE / TIMESTAMP", "Date when the account was opened", False, ["2022-01-15"]),
            "last_transaction_date": ("DATE / TIMESTAMP", "Date of the last transaction activity on this account", False, ["2024-03-10"]),
            "overdraft_allowed": ("BOOLEAN", "Whether overdraft spending is permitted", False, [True, False]),
            "joint_account": ("BOOLEAN", "Whether this is a joint ownership account", False, [True, False]),
            "bank_name": ("VARCHAR", "Name of the bank holding the account", False, ["Wells Fargo", "Citibank"]),
            "branch_code": ("VARCHAR", "Bank branch location identifier code", False, ["BR120"])
        },
        "customers": {
            "customer_id": ("VARCHAR", "Unique identifier for the customer", True, ["[MASKED]"]),
            "first_name": ("VARCHAR", "First name of the customer", True, ["[MASKED]"]),
            "last_name": ("VARCHAR", "Last name of the customer", True, ["[MASKED]"]),
            "email": ("VARCHAR", "Email address of the customer", True, ["[MASKED]"]),
            "phone": ("VARCHAR", "Contact phone number of the customer", True, ["[MASKED]"]),
            "date_of_birth": ("DATE", "Customer birthdate", True, ["[MASKED]"]),
            "age": ("INTEGER", "Current calculated age of the customer", False, [34, 45]),
            "gender": ("VARCHAR", "Gender identity of the customer (M, F, OTHER)", False, ["M", "F"]),
            "city": ("VARCHAR", "City of residence", False, ["Chicago", "Houston"]),
            "state": ("VARCHAR", "State or province of residence", False, ["Illinois", "Texas"]),
            "country": ("VARCHAR", "Country of residence", False, ["USA", "India"]),
            "zip_code": ("VARCHAR", "Postal zip code", False, ["60601", "77001"]),
            "occupation": ("VARCHAR", "Primary occupation of the customer", False, ["Engineer", "Teacher"]),
            "annual_income": ("FLOAT", "Reported annual income of the customer", False, [85000.00]),
            "credit_score": ("INTEGER", "FICO/Credit rating score at registration", False, [720, 680]),
            "risk_category": ("VARCHAR", "Risk classification (LOW, MEDIUM, HIGH)", False, ["LOW", "MEDIUM"]),
            "kyc_verified": ("BOOLEAN", "Whether KYC documentation is verified", False, [True, False]),
            "is_active": ("BOOLEAN", "Whether the customer is currently active", False, [True, False]),
            "customer_since": ("DATE", "Date when the customer first signed up", False, ["2019-11-23"]),
            "preferred_channel": ("VARCHAR", "Preferred channel (MOBILE, WEB, ATM, BRANCH)", False, ["MOBILE", "WEB"]),
            "bank_name": ("VARCHAR", "Name of the primary bank associated with the customer", False, ["Chase", "Citibank"]),
            "region": ("VARCHAR", "Geographic region (West, South, Midwest, Northeast, International)", False, ["West", "South"]),
            "customer_segment": ("VARCHAR", "Customer value segment (Wealth, Premium, Standard, Economy)", False, ["Wealth", "Economy"])
        },
        "loans": {
            "loan_id": ("VARCHAR", "Unique identifier for the loan", False, ["LOAN0001"]),
            "customer_id": ("VARCHAR", "Identifier of the customer taking the loan", True, ["[MASKED]"]),
            "account_id": ("VARCHAR", "Bank account associated with the loan disbursements/repayments", False, ["ACC0001"]),
            "loan_type": ("VARCHAR", "Type of loan (PERSONAL, HOME, EDUCATION, BUSINESS, AUTO, MORTGAGE)", False, ["PERSONAL", "HOME"]),
            "principal_amount": ("FLOAT", "Original sanctioned principal loan amount", False, [25000.00]),
            "outstanding_balance": ("FLOAT", "Current unpaid loan balance", False, [18450.20]),
            "interest_rate_pct": ("FLOAT", "Annualized loan interest rate", False, [8.5]),
            "tenure_months": ("INTEGER", "Total loan tenure duration in months", False, [36, 60]),
            "emi_amount": ("FLOAT", "Equated Monthly Installment repayment amount", False, [540.25]),
            "disbursement_date": ("DATE", "Date when the loan amount was disbursed", False, ["2023-05-12"]),
            "maturity_date": ("DATE", "Date when the loan term ends", False, ["2026-05-12"]),
            "loan_status": ("VARCHAR", "Current state of the loan (APPROVED, ACTIVE, CLOSED, DEFAULTED)", False, ["ACTIVE", "CLOSED"]),
            "installments_paid": ("INTEGER", "Number of monthly installments paid so far", False, [12, 24]),
            "installments_remaining": ("INTEGER", "Number of remaining monthly installments", False, [24, 36]),
            "days_past_due": ("INTEGER", "Number of days repayment is past due (DPD)", False, [0, 5, 30]),
            "collateral_type": ("VARCHAR", "Type of collateral pledged (VEHICLE, PROPERTY, FD, NONE)", False, ["NONE", "PROPERTY"]),
            "collateral_value": ("FLOAT", "Estimated value of the collateral asset", False, [0.0, 150000.00]),
            "loan_purpose": ("VARCHAR", "Purpose/reason for taking the loan", False, ["Home Renovation", "Education"]),
            "credit_score_at_origination": ("INTEGER", "Customer credit score at the time of loan approval", False, [710, 750]),
            "annual_income_at_origination": ("FLOAT", "Customer reported annual income during loan application", False, [95000.00]),
            "debt_to_income_ratio": ("FLOAT", "Debt-to-income ratio (DTI) calculated at origination", False, [0.32, 0.45]),
            "is_npa": ("BOOLEAN", "Whether the loan is classified as a Non-Performing Asset (defaulted/bad debt)", False, [True, False]),
            "bank_name": ("VARCHAR", "Name of the lending bank", False, ["Wells Fargo", "Citibank"]),
            "loan_officer_id": ("VARCHAR", "Employee ID of the loan officer managing this account", False, ["LO386"])
        },
        "transactions": {
            "transaction_id": ("VARCHAR", "Unique transaction tracking identifier", False, ["TXN0001"]),
            "source_account_id": ("VARCHAR", "Originating bank account identifier", False, ["ACC0001"]),
            "destination_account_id": ("VARCHAR", "Receiving bank account identifier (if transfer)", False, ["ACC0002"]),
            "customer_id": ("VARCHAR", "Identifier for the customer executing the transaction", True, ["[MASKED]"]),
            "transaction_type": ("VARCHAR", "Transaction type (DEPOSIT, WITHDRAWAL, DEBIT, CREDIT, PAYMENT, TRANSFER, REFUND)", False, ["DEPOSIT", "WITHDRAWAL"]),
            "amount": ("FLOAT", "Transaction monetary amount", False, [250.00]),
            "currency": ("VARCHAR", "Currency of the transaction (USD, INR, GBP, EUR)", False, ["USD", "EUR"]),
            "transaction_date": ("DATE", "Calendar date of the transaction", False, ["2024-03-12"]),
            "transaction_time": ("VARCHAR", "Time of day of the transaction", False, ["14:30:00"]),
            "transaction_datetime": ("TIMESTAMP", "Exact timestamp of the transaction", False, ["2024-03-12 14:30:00"]),
            "channel": ("VARCHAR", "Channel used (WEB, MOBILE, ATM, POS, BRANCH, UPI, RTGS, NEFT)", False, ["MOBILE", "ATM"]),
            "category": ("VARCHAR", "Spending category (Shopping, Utilities, Salary, Travel, Rent, Dining, Education)", False, ["Shopping", "Salary"]),
            "merchant_name": ("VARCHAR", "Name of the merchant involved in the transaction", False, ["Merchant_123"]),
            "merchant_city": ("VARCHAR", "City where the merchant is registered", False, ["New York", "Chicago"]),
            "balance_after_txn": ("FLOAT", "Calculated account ledger balance immediately after this transaction", False, [4500.50]),
            "status": ("VARCHAR", "Outcome status of the transaction (SUCCESS, PENDING, FAILED)", False, ["SUCCESS", "FAILED"]),
            "reference_number": ("VARCHAR", "System generated reference tracking number", False, ["REF831922"]),
            "description": ("VARCHAR", "Freeform memo or note attached to the transaction", False, ["DEPOSIT - Salary"]),
            "is_flagged_fraud": ("BOOLEAN", "Whether the transaction was flagged for fraud monitoring", False, [True, False]),
            "fraud_score": ("FLOAT", "ML model calculated fraud probability score (0 to 1)", False, [0.02, 0.85]),
            "ip_address": ("VARCHAR", "IP address of the client device", True, ["[MASKED]"]),
            "device_id": ("VARCHAR", "Device fingerprint/hardware ID used", True, ["[MASKED]"])
        }
    }

    columns = []
    for table_name, cols in catalog_metadata.items():
        for column_name, (data_type, desc, is_pii, samples) in cols.items():
            columns.append(
                DataCatalog(
                    table_name=table_name,
                    column_name=column_name,
                    data_type=data_type,
                    description=desc,
                    sample_values=samples,
                    is_pii=is_pii,
                    is_active=True
                )
            )

    session.add_all(columns)
    session.commit()
    print(f"Seeded {len(columns)} catalog entries.")


def main():
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")

    seed_analytics_db()

    session = SessionLocal()
    try:
        seed_admin_user(session)
        seed_glossary(session)
        seed_catalog(session)
    finally:
        session.close()

    print("\nSeeding complete!")


if __name__ == "__main__":
    main()