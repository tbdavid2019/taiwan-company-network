# Relative capital node sizing

## Goal

Show a company's registered capital through its node size without allowing Taiwan-wide outliers to dominate the graph. Size is relative only to the companies currently visible in the relationship graph.

## Behaviour

- Each graph view collects positive numeric `資本總額` values from its visible company nodes, including the focus company.
- Values are transformed with `log10` and scaled against the 10th and 90th percentiles of that view. Values below or above those bounds are clamped.
- Company node radii fall within a compact, fixed visual range. Missing or non-company nodes retain the existing default radius.
- For a view with fewer than five valid capital values, use its log-space minimum and maximum instead of percentiles. Equal values receive the midpoint radius.
- The focus node retains its orange fill and halo; size does not replace that distinction.
- Both rendering paths use the same helper: the SVG local map (up to 80 nodes) and G6's force layout (larger views). Link endpoints and force collision calculations use each node's actual radius.
- The graph includes a concise note that node size represents relative capital in the current view. Hover details continue to show the exact registered capital amount.

## Validation

- Unit-test the scale for empty data, missing values, equal values, small samples, extreme values, bounds, and view-local behaviour.
- Run the full test suite and production build.
- Verify a representative graph in a browser, including a small local map and a larger G6 map.

## Non-goals

- No global or Taiwan-wide capital comparison.
- No change to relationship data, colours, filtering, or expansion behaviour.
