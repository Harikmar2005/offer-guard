"""
OfferGuard Database Setup Script for PostgreSQL / SQLite using SQLAlchemy
"""
import os
from sqlalchemy import create_engine
from models.sqlalchemy_models import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///offerguard.db")

def init_db():
    print(f"Connecting to database: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL, echo=False)
    Base.metadata.create_all(bind=engine)
    print("SQLAlchemy tables successfully created or verified.")

if __name__ == "__main__":
    init_db()
