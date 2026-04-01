"""add archived_chat_messages table

Revision ID: a1b2c3d4e5f6
Revises: cead83e035a6
Create Date: 2026-04-01 16:15:00.000000

Adds the `archived_chat_messages` table used by the rolling 7-day
retention system for Community Chat.  Messages older than 7 days are
moved here by the daily APScheduler job (app/tasks/chat_cleanup.py).
This table is SCOPED to Community Chat only.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'cead83e035a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create archived_chat_messages table."""
    op.create_table(
        'archived_chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sender_id', sa.String(), nullable=False),
        sa.Column('sender_name', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('file_url', sa.String(), nullable=True),
        sa.Column('file_type', sa.String(), nullable=True),
        sa.Column('file_name', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column(
            'archived_at',
            sa.DateTime(),
            nullable=False,
            server_default=sa.text('NOW()'),
        ),
        sa.PrimaryKeyConstraint('id'),
    )

    # Index on created_at — supports fast range queries if you ever
    # need to audit archived messages within a date range.
    op.create_index(
        'ix_archived_chat_messages_created_at',
        'archived_chat_messages',
        ['created_at'],
        unique=False,
    )

    # Index on archived_at — useful for auditing / purging old archives.
    op.create_index(
        'ix_archived_chat_messages_archived_at',
        'archived_chat_messages',
        ['archived_at'],
        unique=False,
    )


def downgrade() -> None:
    """Drop archived_chat_messages table."""
    op.drop_index(
        'ix_archived_chat_messages_archived_at',
        table_name='archived_chat_messages',
    )
    op.drop_index(
        'ix_archived_chat_messages_created_at',
        table_name='archived_chat_messages',
    )
    op.drop_table('archived_chat_messages')
