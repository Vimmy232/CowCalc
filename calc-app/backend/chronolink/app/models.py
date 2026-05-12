from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List
from uuid import UUID, uuid4

from pydantic import validator
from sqlalchemy import CheckConstraint, Column, UniqueConstraint
from sqlalchemy.types import JSON
from sqlmodel import Field, Relationship, SQLModel


class ZeroTrustModel(SQLModel):
    class Config:
        validate_assignment = True
        anystr_strip_whitespace = True
        extra = "forbid"


class ConstraintTargetType(str, Enum):
    TEACHER = "Teacher"
    ROOM = "Room"
    STUDENT_GROUP = "StudentGroup"
    SUBJECT = "Subject"
    SCHEDULED_SESSION = "ScheduledSession"


class ConstraintRuleType(str, Enum):
    AVAILABILITY = "Availability"
    CAPACITY = "Capacity"
    AFFINITY = "Affinity"


class Teacher(ZeroTrustModel, table=True):
    __tablename__ = "teachers"
    __table_args__ = (UniqueConstraint("name", name="uq_teachers_name"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    name: str = Field(min_length=1, max_length=120, nullable=False, index=True)

    sessions: List["ScheduledSession"] = Relationship(back_populates="teacher")


class Room(ZeroTrustModel, table=True):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint("name", name="uq_rooms_name"),
        CheckConstraint("capacity > 0", name="ck_rooms_capacity_positive"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    name: str = Field(min_length=1, max_length=120, nullable=False, index=True)
    capacity: int = Field(gt=0, nullable=False)

    sessions: List["ScheduledSession"] = Relationship(back_populates="room")


class StudentGroup(ZeroTrustModel, table=True):
    __tablename__ = "student_groups"
    __table_args__ = (
        UniqueConstraint("name", name="uq_student_groups_name"),
        CheckConstraint("size > 0", name="ck_student_groups_size_positive"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    name: str = Field(min_length=1, max_length=120, nullable=False, index=True)
    size: int = Field(gt=0, nullable=False)

    sessions: List["ScheduledSession"] = Relationship(back_populates="student_group")


class Subject(ZeroTrustModel, table=True):
    __tablename__ = "subjects"
    __table_args__ = (UniqueConstraint("name", name="uq_subjects_name"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    name: str = Field(min_length=1, max_length=120, nullable=False, index=True)

    sessions: List["ScheduledSession"] = Relationship(back_populates="subject")


class ScheduledSession(ZeroTrustModel, table=True):
    __tablename__ = "scheduled_sessions"
    __table_args__ = (
        CheckConstraint("start_slot >= 0 AND start_slot <= 20", name="ck_sessions_start_slot_range"),
        CheckConstraint("day_of_week >= 0 AND day_of_week <= 4", name="ck_sessions_day_of_week_range"),
        UniqueConstraint("teacher_id", "day_of_week", "start_slot", name="uq_teacher_timeslot"),
        UniqueConstraint("room_id", "day_of_week", "start_slot", name="uq_room_timeslot"),
        UniqueConstraint("student_group_id", "day_of_week", "start_slot", name="uq_student_group_timeslot"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    day_of_week: int = Field(nullable=False, index=True)
    start_slot: int = Field(nullable=False, index=True)

    teacher_id: UUID = Field(foreign_key="teachers.id", nullable=False, index=True)
    room_id: UUID = Field(foreign_key="rooms.id", nullable=False, index=True)
    student_group_id: UUID = Field(foreign_key="student_groups.id", nullable=False, index=True)
    subject_id: UUID = Field(foreign_key="subjects.id", nullable=False, index=True)

    teacher: Teacher = Relationship(back_populates="sessions")
    room: Room = Relationship(back_populates="sessions")
    student_group: StudentGroup = Relationship(back_populates="sessions")
    subject: Subject = Relationship(back_populates="sessions")

    @validator("start_slot")
    def validate_start_slot(cls, value: int) -> int:
        if value < 0 or value > 20:
            raise ValueError("start_slot must be in the inclusive range 0-20.")
        return value

    @validator("day_of_week")
    def validate_day_of_week(cls, value: int) -> int:
        if value < 0 or value > 4:
            raise ValueError("day_of_week must be in the inclusive range 0-4.")
        return value


class Constraint(ZeroTrustModel, table=True):
    __tablename__ = "constraints"
    __table_args__ = (
        UniqueConstraint(
            "target_type",
            "target_id",
            "rule_type",
            name="uq_constraints_target_rule_type",
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    target_type: ConstraintTargetType = Field(nullable=False, index=True)
    target_id: UUID = Field(nullable=False, index=True)
    rule_type: ConstraintRuleType = Field(nullable=False, index=True)
    value: Dict[str, Any] = Field(sa_column=Column(JSON, nullable=False))

    @validator("target_id")
    def validate_target_id(cls, value: UUID) -> UUID:
        if value.int == 0:
            raise ValueError("target_id cannot be a nil UUID.")
        return value

    @validator("value")
    def validate_rule_value(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(value, dict):
            raise ValueError("value must be a JSON object.")
        if not value:
            raise ValueError("value cannot be empty.")
        return value
