"""
SQLAlchemy model for the Certificado (certificate) table.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Certificado(Base):
    """
    Immutable degradation certificate.

    Records the full transformation process of a work,
    including a SHA-256 hash to verify integrity.

    Attributes:
        id: Unique UUID identifier.
        obra_id: FK to the associated work.
        hash_sha256: Integrity hash of the certificate.
        transformaciones: JSON with the list of applied transformations.
        momento_detencion: Stop timestamp (only for Witness mode).
        creado_en: Creation timestamp.
    """
    __tablename__ = "certificados"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    obra_id = Column(String(36), ForeignKey("obras.id"), nullable=False)
    hash_sha256 = Column(String(64), nullable=False)
    transformaciones = Column(Text, nullable=False)  # serialized JSON
    momento_detencion = Column(DateTime, nullable=True)
    creado_en = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationship with work
    obra = relationship("Obra", back_populates="certificados")
