from engine.dcf.models import DCFInput
from engine.dcf.projections import run_dcf


def sensitivity_table(
    base_input: DCFInput,
    discount_rates: list[float],
    exit_cap_rates: list[float],
) -> dict[str, dict[str, float]]:
    """
    Returns a 2-D grid of NPV values keyed by (discount_rate, exit_cap_rate).
    Each cell = concluded value for that assumption pair.
    """
    table: dict[str, dict[str, float]] = {}
    for dr in discount_rates:
        table[f"{dr:.2%}"] = {}
        for cr in exit_cap_rates:
            modified = base_input.model_copy(
                update={"discount_rate": dr, "terminal_cap_rate": cr}
            )
            result = run_dcf(modified)
            table[f"{dr:.2%}"][f"{cr:.2%}"] = result.npv
    return table
