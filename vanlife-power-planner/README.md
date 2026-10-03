# Vanlife Power Planner

A static browser app for checking a selected power system over a scheduled trip.
No build or server-side API is required. Serve the repository with a local HTTP
server and open `/vanlife-power-planner/`.

## How to use it

1. Choose a starting profile and enter operating watts, runtime, and power path.
   The wattage button is editable. Each appliance also supports quantity, start
   hour, average duty, measured Wh/day, and startup/peak watts. Add other devices
   through the custom-appliance form.
2. Enter the battery, panel, and DC-DC sizes being tested. “Input setup” uses these
   values; “Custom components” overrides them everywhere, including recharge,
   charge-controller clipping, reserve, and equipment warnings. Other component
   ratings are sized when there is no override.
3. Set starting charge, reserve, trip length, and daily solar/drive/shore schedule.
   Solar percentages are relative to the monthly/manual baseline: 15% is a
   deliberately difficult scenario, not a calibrated probability.
4. Read the hourly charge chart and daily table. “Stays above reserve” applies
   only to the entered trip and assumptions. Suggestions can be applied and
   immediately re-simulated.
5. Plans autosave locally. Export/import and share links preserve appliances,
   custom wattages, component overrides, and schedules. Export/share URLs exclude
   API keys; pinned coordinates are included. Printing produces a results report.

## Calculation boundaries

`model.js` is the pure numerical engine. The UI adapts its inputs and renders its
outputs; it does not maintain a second system for component recommendations.

- Energy is expressed in Wh at the battery bus. Measured appliance energy is at
  the appliance input; AC and USB/DC-converter losses are applied afterward.
- Appliance schedules recur daily and can span midnight. Charging events belong
  to the entered day and carry forward across midnight, never backward.
- Solar uses a normalized daylight curve, selected peak sun-hours, and a generic
  delivery-efficiency factor. MPPT output current clips hourly harvest. PVWatts
  supplies historical monthly irradiation, not a forecast or a full PV DC model.
- DC-DC watts and shore amps are output ratings. DC-DC efficiency estimates
  vehicle-side demand, rather than deducting losses from an already-rated output.
- Battery energy uses entered nominal voltage, health, and a continuous generic
  temperature curve. The reserve floor is the greater of the user's reserve and
  the chemistry's usable-depth limit. Starting charge is explicit.
- Charge acceptance is limited by battery current, remaining capacity, and a
  configurable lithium temperature cutoff. Blocked chargers contribute zero.
  Inverter standby follows the union of scheduled AC hours or explicit on-time.
- Minimum trip capacity is found by simulation; unavailable component tiers
  report the requirement instead of silently returning an undersized component.

This model averages energy within each hour. It does not reproduce sub-hourly
weather, battery voltage sag, AGM Peukert effects, battery-specific charge taper,
thermal A/C performance, fuse/wire sizing, MPPT input-voltage compatibility, or
vehicle alternator capacity. The battery-current limit is an input, not inferred
from Ah, and is held constant while suggesting a different battery size.
These are explicit limits, not installation approvals or statistical reliability
claims. A measured Wh/day override is the best way to calibrate a real device.

Historical weather failures are displayed prominently. Climate data is cached
by location/year range so switching months can reuse the response. Invalid JSON
is rejected before mutation, and version 1 settings remain importable.

## Sources

- [PVWatts API](https://developer.nlr.gov/docs/solar/pvwatts/v8/)
- [Open-Meteo historical weather](https://open-meteo.com/en/docs/historical-weather-api)
- [Victron battery operating conditions](https://www.victronenergy.com/media/pg/Lithium_Battery_Smart/en/operation.html)
- [Starlink Mini specifications](https://www.starlink.com/public-files/specification_sheet_mini.pdf)
- [Starlink Standard 4 specifications](https://starlink.com/public-files/specification_sheet_standard4.pdf)

Generic curves and appliance defaults are editable planning assumptions. Check
the actual manufacturer's ratings. Hardware sources reviewed October 2026.

## Validation

Run `npm run validate` from the repository root. Tests cover the numerical engine
and the real app adapter, including energy conservation, schedule timing,
reserve failure, charge limits, temperature lockout, manual-component consistency,
tier overflow, data validation, legacy migration, and export/import fidelity.
