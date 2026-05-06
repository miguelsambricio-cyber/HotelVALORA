def adr(rooms_revenue: float, occupied_rooms: int) -> float:
    """Average Daily Rate = rooms revenue / occupied rooms."""
    if occupied_rooms == 0:
        return 0.0
    return round(rooms_revenue / occupied_rooms, 2)


def adr_index(subject_adr: float, comp_set_adr: float) -> float:
    """ADR Index (ARI) = subject / comp set × 100."""
    if comp_set_adr == 0:
        return 0.0
    return round(subject_adr / comp_set_adr * 100, 2)


def adr_growth(current: float, prior: float) -> float:
    if prior == 0:
        return 0.0
    return round((current - prior) / prior, 4)


def occupancy_rate(occupied_rooms: int, available_rooms: int) -> float:
    """Occupancy = occupied / available."""
    if available_rooms == 0:
        return 0.0
    return round(occupied_rooms / available_rooms, 4)


def occupancy_index(subject_occ: float, comp_set_occ: float) -> float:
    """Occupancy Index (MPI) = subject / comp set × 100."""
    if comp_set_occ == 0:
        return 0.0
    return round(subject_occ / comp_set_occ * 100, 2)
