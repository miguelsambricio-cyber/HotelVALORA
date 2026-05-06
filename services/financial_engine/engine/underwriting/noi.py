from dataclasses import dataclass


@dataclass
class NOIComponents:
    rooms_revenue: float
    fb_revenue: float
    other_revenue: float
    total_revenue: float
    rooms_expense: float
    fb_expense: float
    undistributed_expense: float
    fixed_charges: float
    management_fee: float
    franchise_fee: float
    total_expense: float
    gross_operating_profit: float
    noi: float
    noi_margin: float


def compute_noi(
    total_keys: int,
    occupancy: float,
    adr: float,
    fb_revenue_per_occupied_room: float = 0.0,
    other_revenue_pct: float = 0.05,
    rooms_expense_ratio: float = 0.30,
    fb_expense_ratio: float = 0.75,
    undistributed_expense_ratio: float = 0.20,
    fixed_charges_ratio: float = 0.08,
    management_fee_pct: float = 0.03,
    franchise_fee_pct: float = 0.05,
) -> NOIComponents:
    occupied_nights = total_keys * 365 * occupancy
    rooms_revenue = occupied_nights * adr
    fb_revenue = occupied_nights * fb_revenue_per_occupied_room
    other_revenue = rooms_revenue * other_revenue_pct
    total_revenue = rooms_revenue + fb_revenue + other_revenue

    rooms_expense = rooms_revenue * rooms_expense_ratio
    fb_expense = fb_revenue * fb_expense_ratio
    undistributed = total_revenue * undistributed_expense_ratio
    fixed_charges = total_revenue * fixed_charges_ratio
    mgmt_fee = total_revenue * management_fee_pct
    franchise_fee = rooms_revenue * franchise_fee_pct

    total_expense = rooms_expense + fb_expense + undistributed + fixed_charges + mgmt_fee + franchise_fee
    gop = total_revenue - rooms_expense - fb_expense - undistributed
    noi = total_revenue - total_expense

    return NOIComponents(
        rooms_revenue=round(rooms_revenue, 2),
        fb_revenue=round(fb_revenue, 2),
        other_revenue=round(other_revenue, 2),
        total_revenue=round(total_revenue, 2),
        rooms_expense=round(rooms_expense, 2),
        fb_expense=round(fb_expense, 2),
        undistributed_expense=round(undistributed, 2),
        fixed_charges=round(fixed_charges, 2),
        management_fee=round(mgmt_fee, 2),
        franchise_fee=round(franchise_fee, 2),
        total_expense=round(total_expense, 2),
        gross_operating_profit=round(gop, 2),
        noi=round(noi, 2),
        noi_margin=round(noi / total_revenue, 4) if total_revenue else 0.0,
    )
