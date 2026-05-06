"""Initial domain schema

Revision ID: 0001
Revises:
Create Date: 2026-05-06 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="analyst"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # --------------------------------------------------------------- hotel_assets
    op.create_table(
        "hotel_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("asset_name", sa.String(255), nullable=False),
        sa.Column("asset_type", sa.String(100)),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("brand", sa.String(255)),
        sa.Column("chain_scale", sa.String(100)),
        sa.Column("operator", sa.String(255)),
        sa.Column("owner", sa.String(255)),
        sa.Column("address", sa.String(500)),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("country", sa.String(100), nullable=False, server_default="ES"),
        sa.Column("submarket", sa.String(255)),
        sa.Column("latitude", sa.Numeric(10, 7)),
        sa.Column("longitude", sa.Numeric(10, 7)),
        sa.Column("keys", sa.Integer(), nullable=False),
        sa.Column("star_rating", sa.Numeric(2, 1)),
        sa.Column("meeting_space_sqft", sa.Integer()),
        sa.Column("opening_year", sa.Integer()),
        sa.Column("year_renovated", sa.Integer()),
        sa.Column("gfa_sqft", sa.Integer()),
        sa.Column("status", sa.String(50), nullable=False, server_default="operating"),
        sa.Column("franchise_agreement", sa.String(255)),
        sa.Column("meta", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_hotel_assets_asset_name", "hotel_assets", ["asset_name"])
    op.create_index("ix_hotel_assets_city", "hotel_assets", ["city"])
    op.create_index("ix_hotel_assets_submarket", "hotel_assets", ["submarket"])
    op.create_index("ix_hotel_assets_slug", "hotel_assets", ["slug"], unique=True)

    # ------------------------------------------------------------ hotel_financials
    op.create_table(
        "hotel_financials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "asset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hotel_assets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("period", sa.String(20), nullable=False, server_default="annual"),
        sa.Column("rooms_revenue", sa.Numeric(15, 2)),
        sa.Column("fb_revenue", sa.Numeric(15, 2)),
        sa.Column("other_revenue", sa.Numeric(15, 2)),
        sa.Column("total_revenue", sa.Numeric(15, 2)),
        sa.Column("occupancy_rate", sa.Numeric(5, 4)),
        sa.Column("adr", sa.Numeric(10, 2)),
        sa.Column("revpar", sa.Numeric(10, 2)),
        sa.Column("total_expenses", sa.Numeric(15, 2)),
        sa.Column("ebitda", sa.Numeric(15, 2)),
        sa.Column("noi", sa.Numeric(15, 2)),
        sa.Column("noi_margin", sa.Numeric(5, 4)),
        sa.Column("source", sa.String(100)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_hotel_financials_asset_id", "hotel_financials", ["asset_id"])

    # ----------------------------------------------------------- flex_living_assets
    op.create_table(
        "flex_living_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("asset_type", sa.String(100), nullable=False),
        sa.Column("address", sa.String(500)),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("country", sa.String(100), nullable=False, server_default="ES"),
        sa.Column("total_units", sa.Integer(), nullable=False),
        sa.Column("studio_units", sa.Integer()),
        sa.Column("one_bed_units", sa.Integer()),
        sa.Column("two_bed_units", sa.Integer()),
        sa.Column("three_plus_bed_units", sa.Integer()),
        sa.Column("year_built", sa.Integer()),
        sa.Column("year_renovated", sa.Integer()),
        sa.Column("gfa_sqft", sa.Integer()),
        sa.Column("avg_daily_rate", sa.Numeric(10, 2)),
        sa.Column("monthly_rental_rate", sa.Numeric(10, 2)),
        sa.Column("occupancy_rate", sa.Numeric(5, 4)),
        sa.Column("min_stay_days", sa.Integer()),
        sa.Column("mix_short_term_pct", sa.Numeric(5, 4)),
        sa.Column("mix_long_term_pct", sa.Numeric(5, 4)),
        sa.Column("asset_status", sa.String(50), nullable=False, server_default="operating"),
        sa.Column("operator", sa.String(255)),
        sa.Column("meta", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_flex_living_assets_name", "flex_living_assets", ["name"])
    op.create_index("ix_flex_living_assets_city", "flex_living_assets", ["city"])
    op.create_index("ix_flex_living_assets_slug", "flex_living_assets", ["slug"], unique=True)

    # --------------------------------------------------------------- markets
    op.create_table(
        "markets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("submarket", sa.String(255), nullable=False),
        sa.Column("market_tier", sa.String(50)),
        sa.Column("tourism_demand", sa.Numeric(12, 2)),
        sa.Column("seasonality_index", sa.Numeric(6, 4)),
        sa.Column("total_supply_keys", sa.Integer()),
        sa.Column("pipeline_keys", sa.Integer()),
        sa.Column("costar_submarket_id", sa.String(100)),
        sa.Column("meta", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_markets_country", "markets", ["country"])
    op.create_index("ix_markets_city", "markets", ["city"])
    op.create_index("ix_markets_submarket", "markets", ["submarket"])
    op.create_index("ix_markets_costar_submarket_id", "markets", ["costar_submarket_id"], unique=True)

    # ----------------------------------------------------------- market_snapshots
    op.create_table(
        "market_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("submarket", sa.String(255), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("country", sa.String(100), nullable=False, server_default="ES"),
        sa.Column("period_year", sa.Integer(), nullable=False),
        sa.Column("period_month", sa.Integer()),
        sa.Column("period_type", sa.String(20), nullable=False, server_default="annual"),
        sa.Column("market_occupancy", sa.Numeric(5, 4)),
        sa.Column("market_adr", sa.Numeric(10, 2)),
        sa.Column("market_revpar", sa.Numeric(10, 2)),
        sa.Column("market_supply", sa.Integer()),
        sa.Column("market_demand", sa.Integer()),
        sa.Column("revpar_growth_yoy", sa.Numeric(6, 4)),
        sa.Column("adr_growth_yoy", sa.Numeric(6, 4)),
        sa.Column("occupancy_change_yoy", sa.Numeric(6, 4)),
        sa.Column("source", sa.String(100)),
        sa.Column("meta", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_market_snapshots_submarket", "market_snapshots", ["submarket"])
    op.create_index("ix_market_snapshots_city", "market_snapshots", ["city"])

    # ------------------------------------------------- comparable_transactions
    op.create_table(
        "comparable_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "asset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hotel_assets.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("property_name", sa.String(255), nullable=False),
        sa.Column("brand", sa.String(255)),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("country", sa.String(100), nullable=False, server_default="ES"),
        sa.Column("property_type", sa.String(100)),
        sa.Column("chain_scale", sa.String(100)),
        sa.Column("total_keys", sa.Integer()),
        sa.Column("year_built", sa.Integer()),
        sa.Column("star_rating", sa.Numeric(2, 1)),
        sa.Column("transaction_date", sa.String(10), nullable=False),
        sa.Column("transaction_price", sa.Numeric(18, 2)),
        sa.Column("price_per_key", sa.Numeric(12, 2)),
        sa.Column("cap_rate", sa.Numeric(6, 4)),
        sa.Column("buyer", sa.String(255)),
        sa.Column("seller", sa.String(255)),
        sa.Column("transaction_type", sa.String(100)),
        sa.Column("occupancy_at_sale", sa.Numeric(5, 4)),
        sa.Column("adr_at_sale", sa.Numeric(10, 2)),
        sa.Column("revpar_at_sale", sa.Numeric(10, 2)),
        sa.Column("noi_at_sale", sa.Numeric(15, 2)),
        sa.Column("source", sa.String(100)),
        sa.Column("source_id", sa.String(255)),
        sa.Column("notes", sa.Text()),
        sa.Column("meta", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_comparable_transactions_asset_id", "comparable_transactions", ["asset_id"]
    )
    op.create_index(
        "ix_comparable_transactions_property_name",
        "comparable_transactions",
        ["property_name"],
    )
    op.create_index(
        "ix_comparable_transactions_city", "comparable_transactions", ["city"]
    )
    op.create_index(
        "ix_comparable_transactions_transaction_date",
        "comparable_transactions",
        ["transaction_date"],
    )

    # ---------------------------------------------------- financial_scenarios
    op.create_table(
        "financial_scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "asset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hotel_assets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("scenario_name", sa.String(255), nullable=False),
        sa.Column("holding_period", sa.Integer(), nullable=False),
        sa.Column("exit_cap_rate", sa.Numeric(6, 4)),
        sa.Column("discount_rate", sa.Numeric(6, 4)),
        sa.Column("occupancy", sa.Numeric(5, 4)),
        sa.Column("adr", sa.Numeric(10, 2)),
        sa.Column("revpar", sa.Numeric(10, 2)),
        sa.Column("entry_cap_rate", sa.Numeric(6, 4)),
        sa.Column("revenue_growth_rate", sa.Numeric(6, 4)),
        sa.Column("expense_growth_rate", sa.Numeric(6, 4)),
        sa.Column("noi_margin", sa.Numeric(5, 4)),
        sa.Column("acquisition_price", sa.Numeric(18, 2)),
        sa.Column("equity_investment", sa.Numeric(18, 2)),
        sa.Column("currency", sa.String(3), nullable=False, server_default="EUR"),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("notes", sa.Text()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_financial_scenarios_asset_id", "financial_scenarios", ["asset_id"]
    )

    # ------------------------------------------------------ dcf_model_outputs
    op.create_table(
        "dcf_model_outputs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "scenario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("financial_scenarios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("irr", sa.Numeric(8, 6)),
        sa.Column("npv", sa.Numeric(18, 2)),
        sa.Column("equity_multiple", sa.Numeric(8, 4)),
        sa.Column("terminal_value", sa.Numeric(18, 2)),
        sa.Column("stabilized_noi", sa.Numeric(15, 2)),
        sa.Column("cash_on_cash_return", sa.Numeric(8, 6)),
        sa.Column("dscr", sa.Numeric(6, 4)),
        sa.Column("total_return", sa.Numeric(8, 6)),
        sa.Column("cash_flows", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("sensitivity", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_dcf_model_outputs_scenario_id", "dcf_model_outputs", ["scenario_id"]
    )

    # -------------------------------------------------------------- valuations
    op.create_table(
        "valuations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "hotel_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hotel_assets.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "flex_asset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("flex_living_assets.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("valuation_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("effective_date", sa.String(10), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="EUR"),
        sa.Column("concluded_value", sa.Numeric(18, 2)),
        sa.Column("value_per_key", sa.Numeric(12, 2)),
        sa.Column("implied_cap_rate", sa.Numeric(6, 4)),
        sa.Column("assumptions", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("cash_flows", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("sensitivity", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("notes", sa.Text()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ------------------------------------------------------------- underwritings
    op.create_table(
        "underwritings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "valuation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("valuations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("projection_years", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("stabilized_occupancy", sa.Numeric(5, 4)),
        sa.Column("stabilized_adr", sa.Numeric(10, 2)),
        sa.Column("stabilized_revpar", sa.Numeric(10, 2)),
        sa.Column("revenue_growth_rate", sa.Numeric(6, 4)),
        sa.Column("expense_growth_rate", sa.Numeric(6, 4)),
        sa.Column("noi_margin", sa.Numeric(5, 4)),
        sa.Column("cap_rate_entry", sa.Numeric(6, 4)),
        sa.Column("cap_rate_exit", sa.Numeric(6, 4)),
        sa.Column("discount_rate", sa.Numeric(6, 4)),
        sa.Column("ltv_ratio", sa.Numeric(5, 4)),
        sa.Column("debt_service_coverage", sa.Numeric(6, 4)),
        sa.Column("irr", sa.Numeric(6, 4)),
        sa.Column("equity_multiple", sa.Numeric(6, 3)),
        sa.Column("detail", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_underwritings_valuation_id", "underwritings", ["valuation_id"], unique=True
    )


def downgrade() -> None:
    op.drop_table("underwritings")
    op.drop_table("valuations")
    op.drop_table("dcf_model_outputs")
    op.drop_table("financial_scenarios")
    op.drop_table("comparable_transactions")
    op.drop_table("market_snapshots")
    op.drop_table("markets")
    op.drop_table("flex_living_assets")
    op.drop_table("hotel_financials")
    op.drop_table("hotel_assets")
    op.drop_table("users")
