"""SQLAlchemy models. PostgreSQL in production; SQLite works for quick local runs and tests."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import JSON, DateTime, Float, Integer, String, Boolean, create_engine, select, func, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "buildings.json"


class Base(DeclarativeBase):
    pass


class BuildingRow(Base):
    __tablename__ = "buildings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    aliases: Mapped[list[str]] = mapped_column(JSON, default=list)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    zone: Mapped[str] = mapped_column(String(32))
    category: Mapped[str] = mapped_column(String(32))
    year_built: Mapped[int] = mapped_column(Integer)
    floors: Mapped[int] = mapped_column(Integer)
    photo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Photographer and licence, shown under the photo (required by CC licences).
    photo_credit: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_source: Mapped[str | None] = mapped_column(String(255), nullable=True)


class PlayRow(Base):
    """One finished daily game. Powers the 'how did everyone else do' stats."""

    __tablename__ = "plays"
    __table_args__ = (Index("ix_plays_puzzle", "puzzle"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    puzzle: Mapped[int] = mapped_column(Integer)
    won: Mapped[bool] = mapped_column(Boolean)
    guesses: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


def make_engine(url: str | None = None):
    url = url or os.environ.get("DATABASE_URL", "sqlite:///./westerndle.db")
    # Accept the plain postgres:// URLs most hosts hand out.
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    kwargs = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {"pool_pre_ping": True}
    return create_engine(url, **kwargs)


def init_db(engine, data_file: Path = DATA_FILE) -> None:
    """Create tables and load the building list from the JSON file.

    The buildings table is only a copy of the file, so it is dropped and rebuilt
    on every start: schema changes and removed buildings need no migration.
    The plays table holds real player results and is never dropped.
    """
    buildings = json.loads(data_file.read_text())["buildings"]
    BuildingRow.__table__.drop(engine, checkfirst=True)
    Base.metadata.create_all(engine)
    with Session(engine) as s, s.begin():
        s.add_all(
            BuildingRow(
                id=b["id"],
                name=b["name"],
                aliases=b.get("aliases", []),
                lat=b["lat"],
                lon=b["lon"],
                zone=b["zone"],
                category=b["category"],
                year_built=b["year_built"],
                floors=b["floors"],
                photo=b.get("photo"),
                photo_credit=b.get("photo_credit"),
                photo_source=b.get("photo_source"),
            )
            for b in buildings
        )


def session_factory(engine):
    return sessionmaker(engine, expire_on_commit=False)


def play_stats(s: Session, puzzle: int, max_guesses: int) -> dict:
    rows = s.execute(
        select(PlayRow.won, PlayRow.guesses, func.count()).where(PlayRow.puzzle == puzzle).group_by(PlayRow.won, PlayRow.guesses)
    ).all()
    distribution = [0] * max_guesses
    plays = wins = 0
    for won, guesses, count in rows:
        plays += count
        if won:
            wins += count
            if 1 <= guesses <= max_guesses:
                distribution[guesses - 1] += count
    return {"puzzle": puzzle, "plays": plays, "wins": wins, "distribution": distribution}
