import numpy as np

from engine.dcf.models import CashFlowYear, DCFInput, DCFResult, TerminalValue


def run_dcf(inp: DCFInput) -> DCFResult:
    available_room_nights = inp.total_keys * 365
    base_revenue = available_room_nights * inp.stabilized_occupancy * inp.stabilized_adr

    growth_rates = inp.revenue_growth_rates
    if len(growth_rates) < inp.projection_years:
        # Pad with last rate if list is shorter than projection years
        growth_rates = growth_rates + [growth_rates[-1]] * (inp.projection_years - len(growth_rates))

    cash_flows: list[CashFlowYear] = []
    npv = 0.0

    for year in range(1, inp.projection_years + 1):
        cumulative_growth = np.prod([1 + g for g in growth_rates[:year]])
        gross_revenue = base_revenue * cumulative_growth
        mgmt_fee = gross_revenue * inp.management_fee_pct
        franchise_fee = gross_revenue * inp.franchise_fee_pct
        total_expenses = gross_revenue * inp.expense_ratio + mgmt_fee + franchise_fee
        noi = gross_revenue - total_expenses
        capex = gross_revenue * inp.capex_reserve_pct
        fcf = noi - capex
        discount_factor = 1 / ((1 + inp.discount_rate) ** year)
        pv_fcf = fcf * discount_factor
        npv += pv_fcf

        cash_flows.append(CashFlowYear(
            year=year,
            gross_revenue=round(gross_revenue, 2),
            total_expenses=round(total_expenses, 2),
            noi=round(noi, 2),
            capex_reserve=round(capex, 2),
            free_cash_flow=round(fcf, 2),
            discount_factor=round(discount_factor, 6),
            pv_fcf=round(pv_fcf, 2),
        ))

    # Terminal value — exit cap rate applied to Year N+1 NOI
    cumulative_growth_n1 = np.prod([1 + g for g in growth_rates]) * (1 + growth_rates[-1])
    terminal_noi_gross = base_revenue * cumulative_growth_n1
    terminal_noi = terminal_noi_gross * (1 - inp.expense_ratio - inp.management_fee_pct - inp.franchise_fee_pct - inp.capex_reserve_pct)
    terminal_value = terminal_noi / inp.terminal_cap_rate
    pv_terminal = terminal_value / ((1 + inp.discount_rate) ** inp.projection_years)
    npv += pv_terminal

    stabilized_noi = cash_flows[0].noi if cash_flows else 0
    implied_cap_rate = stabilized_noi / npv if npv > 0 else 0

    return DCFResult(
        npv=round(npv, 2),
        value_per_key=round(npv / inp.total_keys, 2) if inp.total_keys else 0,
        implied_cap_rate=round(implied_cap_rate, 4),
        cash_flows=cash_flows,
        terminal_value=TerminalValue(
            terminal_noi=round(terminal_noi, 2),
            terminal_value=round(terminal_value, 2),
            pv_terminal=round(pv_terminal, 2),
        ),
        assumptions=inp,
    )
