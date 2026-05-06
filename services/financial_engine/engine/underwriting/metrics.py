from dataclasses import dataclass


@dataclass
class LoanMetrics:
    loan_amount: float
    annual_debt_service: float
    dscr: float
    ltv: float
    break_even_occupancy: float


def compute_dscr(noi: float, annual_debt_service: float) -> float:
    if annual_debt_service == 0:
        return float("inf")
    return round(noi / annual_debt_service, 3)


def compute_loan_metrics(
    value: float,
    noi: float,
    ltv_ratio: float = 0.65,
    interest_rate: float = 0.065,
    amortization_years: int = 25,
) -> LoanMetrics:
    loan_amount = value * ltv_ratio
    monthly_rate = interest_rate / 12
    n_payments = amortization_years * 12
    monthly_payment = loan_amount * (monthly_rate * (1 + monthly_rate) ** n_payments) / (
        (1 + monthly_rate) ** n_payments - 1
    )
    annual_ds = monthly_payment * 12
    dscr = compute_dscr(noi, annual_ds)
    break_even = annual_ds / (noi / 0.70) if noi else 0  # rough breakeven occupancy

    return LoanMetrics(
        loan_amount=round(loan_amount, 2),
        annual_debt_service=round(annual_ds, 2),
        dscr=dscr,
        ltv=ltv_ratio,
        break_even_occupancy=round(break_even, 4),
    )


def compute_irr(cash_flows: list[float]) -> float:
    """Newton-Raphson IRR solver."""
    from scipy.optimize import brentq

    def npv_func(rate: float) -> float:
        return sum(cf / (1 + rate) ** t for t, cf in enumerate(cash_flows))

    try:
        return round(brentq(npv_func, -0.999, 100.0), 6)
    except ValueError:
        return float("nan")


def equity_multiple(equity_invested: float, total_distributions: float) -> float:
    if equity_invested == 0:
        return 0.0
    return round(total_distributions / equity_invested, 3)
