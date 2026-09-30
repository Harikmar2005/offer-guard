"""
OfferGuard Relational Database Models (SQLAlchemy / PostgreSQL + SQLite)
Verify Before You Apply.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    create_engine,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import enum

Base = declarative_base()


class UserRoleEnum(str, enum.Enum):
    STUDENT = "STUDENT"
    REVIEWER = "REVIEWER"
    ADMIN = "ADMIN"


class RiskLevelEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class VerificationStatusEnum(str, enum.Enum):
    VERIFIED = "VERIFIED"
    LOW_RISK = "LOW RISK"
    MEDIUM_RISK = "MEDIUM RISK"
    HIGH_RISK = "HIGH RISK"
    CRITICAL_RISK = "CRITICAL RISK"
    UNABLE_TO_VERIFY = "UNABLE TO VERIFY"
    HUMAN_REVIEW_REQUIRED = "HUMAN REVIEW REQUIRED"


class ReviewVerdictEnum(str, enum.Enum):
    VERIFIED_LEGITIMATE = "VERIFIED_LEGITIMATE"
    WARNING = "WARNING"
    SCAM = "SCAM"
    REQUIRES_MORE_INFO = "REQUIRES_MORE_INFO"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRoleEnum), default=UserRoleEnum.STUDENT, nullable=False)
    college = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    cases = relationship("Case", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="reviewer")


class Case(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True)
    case_number = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submission_type = Column(String, nullable=False)  # text, document, recruiter_chat, upi_qr
    raw_input = Column(Text, nullable=False)
    student_name = Column(String, nullable=False)
    student_email = Column(String, nullable=False)
    student_college = Column(String, nullable=False)
    student_roll = Column(String, nullable=False)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(SQLEnum(RiskLevelEnum), nullable=False)
    verification_status = Column(SQLEnum(VerificationStatusEnum), nullable=False)
    summary = Column(Text, nullable=False)
    reasoning = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    unverified_info_json = Column(Text, nullable=False, default="[]")
    human_review_required = Column(Boolean, default=False, nullable=False)
    review_status = Column(String, default="NOT_REQUIRED", nullable=False)
    is_demo_case = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="cases")
    investigation = relationship("Investigation", back_populates="case", uselist=False, cascade="all, delete-orphan")
    extracted_details = relationship("ExtractedDetails", back_populates="case", uselist=False, cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    risk_signals = relationship("RiskSignal", back_populates="case", cascade="all, delete-orphan")
    review = relationship("Review", back_populates="case", uselist=False, cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="case", cascade="all, delete-orphan")


class ExtractedDetails(Base):
    __tablename__ = "extracted_details"

    id = Column(String, primary_key=True)
    case_id = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name = Column(String, nullable=False)
    recruiter_name = Column(String, nullable=True)
    recruiter_email = Column(String, nullable=True)
    recruiter_phone = Column(String, nullable=True)
    job_title = Column(String, nullable=False)
    internship_type = Column(String, nullable=True)
    location = Column(String, nullable=True)
    salary = Column(String, nullable=True)
    stipend = Column(String, nullable=True)
    website = Column(String, nullable=True)
    email_domain = Column(String, nullable=True)
    payment_requested = Column(Boolean, default=False, nullable=False)
    payment_amount = Column(Float, default=0.0, nullable=False)
    payment_method = Column(String, nullable=True)
    payment_reason = Column(String, nullable=True)
    requested_documents_json = Column(Text, default="[]")
    deadline = Column(String, nullable=True)
    claims_json = Column(Text, default="[]")
    suspicious_phrases_json = Column(Text, default="[]")
    contact_information = Column(Text, nullable=True)

    case = relationship("Case", back_populates="extracted_details")


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(String, primary_key=True)
    case_id = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), unique=True, nullable=False)
    engine_version = Column(String, default="2.4.0", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("Case", back_populates="investigation")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String, primary_key=True)
    investigation_id = Column(String, nullable=True)
    case_id = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    step = Column(String, nullable=False)
    signal = Column(String, nullable=False)
    source = Column(String, nullable=False)
    status = Column(String, nullable=False)  # VERIFIED, UNVERIFIED, SUSPICIOUS, MISMATCH
    confidence = Column(Float, default=1.0, nullable=False)
    explanation = Column(Text, nullable=False)
    impact_score = Column(Integer, default=0, nullable=False)
    is_fictional_demo_data = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("Case", back_populates="evidence")


class RiskSignal(Base):
    __tablename__ = "risk_signals"

    id = Column(String, primary_key=True)
    investigation_id = Column(String, nullable=True)
    case_id = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    impact = Column(Integer, default=0, nullable=False)
    severity = Column(String, nullable=False)  # low, medium, high, critical
    evidence = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("Case", back_populates="risk_signals")


class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False, index=True)
    domain = Column(String, nullable=True)
    cin_number = Column(String, nullable=True)
    registration_status = Column(String, nullable=True)
    verified_source = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    recruiters = relationship("Recruiter", back_populates="company")


class Recruiter(Base):
    __tablename__ = "recruiters"

    id = Column(String, primary_key=True)
    company_id = Column(String, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True)
    status = Column(String, default="UNVERIFIED", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    company = relationship("Company", back_populates="recruiters")


class Domain(Base):
    __tablename__ = "domains"

    id = Column(String, primary_key=True)
    domain_name = Column(String, unique=True, nullable=False, index=True)
    mx_records_json = Column(Text, nullable=True)
    has_valid_mx = Column(Boolean, default=False, nullable=False)
    is_freemail = Column(Boolean, default=False, nullable=False)
    is_blacklisted = Column(Boolean, default=False, nullable=False)
    checked_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ScamPattern(Base):
    __tablename__ = "scam_patterns"

    id = Column(String, primary_key=True)
    category = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    indicators_json = Column(Text, nullable=False)
    target_audience = Column(String, nullable=False)
    risk_level = Column(String, nullable=False)
    date_logged = Column(String, nullable=False)
    report_count = Column(Integer, default=1, nullable=False)
    is_fictional_demo_data = Column(Boolean, default=True, nullable=False)


class SuspiciousEntity(Base):
    __tablename__ = "suspicious_entities"

    id = Column(String, primary_key=True)
    type = Column(String, nullable=False)  # UPI_ID, COMPANY, EMAIL, DOMAIN, PHONE
    value = Column(String, nullable=False, index=True)
    claimed_entity = Column(String, nullable=False)
    evidence = Column(Text, nullable=False)
    risk_level = Column(String, nullable=False)
    date_added = Column(String, nullable=False)
    match_count = Column(Integer, default=0, nullable=False)
    is_fictional_demo_data = Column(Boolean, default=True, nullable=False)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True)
    case_id = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), unique=True, nullable=False)
    reviewer_id = Column(String, ForeignKey("users.id"), nullable=False)
    reviewer_name = Column(String, nullable=False)
    reviewer_role = Column(String, nullable=False)
    verdict = Column(SQLEnum(ReviewVerdictEnum), nullable=False)
    notes = Column(Text, nullable=False)
    add_to_scam_db = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("Case", back_populates="review")
    reviewer = relationship("User", back_populates="reviews")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True)
    case_id = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    actor_type = Column(String, nullable=False)  # student, reviewer, admin, system
    actor_name = Column(String, nullable=False)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=False)

    case = relationship("Case", back_populates="audit_events")
