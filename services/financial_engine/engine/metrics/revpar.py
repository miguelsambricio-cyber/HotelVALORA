def revpar(adr: float, occupancy: float) -> float:
    """Revenue Per Available Room = ADR × Occupancy."""
    return round(adr * occupancy, 2)


def revpar_index(subject_revpar: float, comp_set_revpar: float) -> float:
    """RevPAR Index (MPI equivalent) = subject / comp set × 100."""
    if comp_set_revpar == 0:
        return 0.0
    return round(subject_revpar / comp_set_revpar * 100, 2)


def revpar_growth(current: float, prior: float) -> float:
    """Year-over-year RevPAR growth rate."""
    if prior == 0:
        return 0.0
    return round((current - prior) / prior, 4)


def trevpar(total_revenue: float, available_rooms: int, days: int = 365) -> float:
    """Total Revenue Per Available Room (TRevPAR)."""
    denom = available_rooms * days
    if denom == 0:
        return 0.0
    return round(total_revenue / denom, 2)
