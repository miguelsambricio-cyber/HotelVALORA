// USALI structure for the P&L.
//
// Defines section/row layout independent of values. The same structure
// drives the table in any tier (FREE / PRO / PREMIUM); per-cell editability
// is computed from the line-item config + the active tier.

import type { PLSectionConfig } from "./types";

export const PL_STRUCTURE: PLSectionConfig[] = [
  {
    id: "room-statistics",
    label: "Room Statistics",
    lineItems: [
      {
        id: "rooms-count",
        label: "Rooms",
        assumptionKind: "absolute",
        editableAssumption: true,
        editableYear1: false,
        yearKind: "absolute",
      },
      {
        id: "occupancy",
        label: "Occupancy %",
        assumptionKind: "percent",
        editableAssumption: true,
        editableYear1: false,
        yearKind: "percent",
        showYearDelta: true,
      },
      {
        id: "adr",
        label: "ADR",
        assumptionKind: "currency",
        editableAssumption: true,
        editableYear1: false,
        yearKind: "currency",
        showYearDelta: true,
      },
      {
        id: "revpar",
        label: "RevPAR",
        weight: "bold",
        assumptionKind: null,
        editableAssumption: false,
        editableYear1: true,
        yearKind: "currency",
        showYearDelta: true,
      },
    ],
  },

  {
    id: "operating-revenue",
    label: "Operating Revenue",
    lineItems: [
      {
        id: "rev-rooms",
        label: "Rooms",
        assumptionKind: "percent",
        assumptionDenominator: "% total rev",
        editableAssumption: false, // derived (1 - sum of ancillaries)
        editableYear1: true,
        yearKind: "currency",
      },
      {
        id: "rev-fb",
        label: "Food & Beverage",
        assumptionKind: "percent",
        assumptionDenominator: "% total rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
      {
        id: "rev-meeting",
        label: "Meeting Rooms & Events",
        assumptionKind: "percent",
        assumptionDenominator: "% total rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
      {
        id: "rev-spa",
        label: "Spa & Wellness",
        assumptionKind: "percent",
        assumptionDenominator: "% total rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
      {
        id: "rev-parking-other",
        label: "Parking & Others",
        assumptionKind: "percent",
        assumptionDenominator: "% total rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
    ],
    result: {
      id: "total-revenue",
      label: "Total Revenue",
      variant: "total",
    },
  },

  {
    id: "departmental-expenses",
    label: "Departmental Expenses",
    lineItems: [
      {
        id: "exp-rooms",
        label: "Rooms",
        assumptionKind: "percent",
        assumptionDenominator: "% rooms rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
      {
        id: "exp-fb",
        label: "Food & Beverage",
        assumptionKind: "percent",
        assumptionDenominator: "% F&B rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
      {
        id: "exp-other-dept",
        label: "Other Departments Expenses",
        assumptionKind: "percent",
        assumptionDenominator: "% other rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
    ],
  },

  {
    id: "undistributed-expenses",
    label: "Undistributed Expenses",
    lineItems: [
      {
        id: "exp-admin",
        label: "Admin & General",
        assumptionKind: "percent",
        assumptionDenominator: "% rooms rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
      {
        id: "exp-sales-marketing",
        label: "Sales & Marketing",
        assumptionKind: "percent",
        assumptionDenominator: "% total rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
      {
        id: "exp-property-maint",
        label: "Property & Maint.",
        assumptionKind: "percent",
        assumptionDenominator: "% total rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
      {
        id: "exp-utilities",
        label: "Utilities",
        assumptionKind: "percent",
        assumptionDenominator: "% total rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
    ],
    result: {
      id: "gop",
      label: "GOP",
      variant: "gop",
    },
  },

  {
    id: "non-operating-charges",
    label: "Non Operating Charges",
    lineItems: [
      {
        id: "exp-mgmt-fee",
        label: "Management fee",
        assumptionKind: "percent",
        assumptionDenominator: "% total rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
      {
        id: "exp-property-tax",
        label: "Property tax",
        assumptionKind: "percent",
        assumptionDenominator: "% total rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
      {
        id: "exp-insurance",
        label: "Insurance",
        assumptionKind: "percent",
        assumptionDenominator: "% total rev",
        editableAssumption: true,
        editableYear1: true,
        yearKind: "currency",
      },
      {
        id: "exp-ffe-reserve",
        label: "FF&E reserve (ramp)",
        assumptionKind: "percent",
        assumptionDenominator: "% total rev",
        editableAssumption: false,
        editableYear1: false,
        yearKind: "currency",
      },
    ],
    result: {
      id: "ebitda",
      label: "EBITDA",
      variant: "ebitda",
      showMargin: true,
    },
  },
];
