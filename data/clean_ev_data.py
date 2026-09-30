"""
clean_ev_data.py  (v2)
DESG 317 Assignment 3 -- EV Charging Site-Planning Dashboard
Data preparation script.

Question the dashboard answers: "Where is EV demand outrunning public
charging in India, and what kind of charging does that demand need?"

Run:  python3 clean_ev_data.py
Reads every raw source file from "original/" next to this script and writes
cleaned outputs plus cleaning_log.md into "cleaned/":

  state_month_ev_demand.csv        state x month chargeable-EV + all-fuel registrations
  rto_ev_demand_cumulative.csv     RTO chargeable-EV totals (full window + last 12m)
  state_vehicle_category_mix.csv   state x Vahan vehicle class, all fuels
  state_fleet_mix.csv              state x vehicle group (2W/3W/Cars-LMV/Commercial/Other)
  charging_stations_by_state.csv   public charger snapshot (~2024, undated)
  national_fy_ev_context.csv       national FY2011-FY2025 file, as parsed
  national_fy_ev_by_group.csv      national EV registrations per FY by vehicle group
  national_ev_split.csv            two national EV-by-vehicle-group splits, side by side
  state_summary.csv                one row per state/UT in ANY source
  national_summary.csv             the All-India row for the KPI strip
  verification_table.md            the before/after verification printout
  cleaning_log.md

Every drop, gap and definitional choice is written to cleaning_log.md.
"""

import csv
import io
import os
import re
import statistics
from collections import defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "original")
OUT = os.path.join(BASE, "cleaned")
os.makedirs(OUT, exist_ok=True)

LOG = []
VERIFY = []


def log(msg=""):
    LOG.append(msg)
    print(msg)


def verify(msg=""):
    VERIFY.append(msg)
    print(msg)


def fmt(n):
    return "" if n is None else f"{n:,.0f}"


# ---------------------------------------------------------------------------
# 1. Canonical state / UT names
# ---------------------------------------------------------------------------
# Canonical names are the ones used in the dashboard's India GeoJSON
# (DataMeet States/Admin2, with two renames recorded in public/geo/SOURCE.md).
STATE_MAP = {
    "Andaman And Nicobar Islands": "Andaman & Nicobar Islands",
    "Andaman & Nicobar Island": "Andaman & Nicobar Islands",
    "Andaman & Nicobar": "Andaman & Nicobar Islands",
    "Andaman & Nicobar Islands": "Andaman & Nicobar Islands",
    "Jammu And Kashmir": "Jammu and Kashmir",
    "Jammu and Kashmir": "Jammu and Kashmir",
    "The Dadra And Nagar Haveli And Daman And Diu": "Dadra and Nagar Haveli and Daman and Diu",
    "UT of DNH and DD": "Dadra and Nagar Haveli and Daman and Diu",
    "D&D and DNH": "Dadra and Nagar Haveli and Daman and Diu",
    "Pondicherry": "Puducherry",
    "Puducherry": "Puducherry",
}


def canon_state(name):
    name = (name or "").strip().rstrip("\r")
    return STATE_MAP.get(name, name)


# ---------------------------------------------------------------------------
# 2. Definitions
# ---------------------------------------------------------------------------
# Chargeable EV = plug-in vehicles a public charger can serve. Strong hybrids
# never plug in and are excluded everywhere.
CHARGEABLE_EV_FUELS = {"Pure Ev", "Plug-In Hybrid Ev", "Electric(Bov)"}
EXCLUDED_EV_LIKE_FUELS = {"Strong Hybrid Ev"}
# The TDC aggregate files spell the same tags in capitals.
CHARGEABLE_EV_FUELS_UPPER = {"ELECTRIC(BOV)", "PURE EV", "PLUG-IN HYBRID EV"}

DATE_FLOOR = "2019-01-01"
DATE_CEIL = "2024-05-01"
LAST12_FROM, LAST12_TO = "2023-06-01", "2024-05-01"
PRIOR12_FROM, PRIOR12_TO = "2022-06-01", "2023-05-01"
SMALL_BASE_THRESHOLD = 500  # prior-12m chargeable EVs below this -> growth % is unstable

# Outlier rule (v3). Unit of exclusion is the whole (state, RTO office, month)
# block, because the corruption inflates several columns of a block together.
# A block is dropped if ANY of:
#   (a) its total > 50,000 (no single RTO month in this data is plausibly larger);
#   (b) its total > 10x the office's ROLLING median block total over the office's own
#       blocks within +/-6 months (centred; one-sided at the ends of the series; the month
#       itself included; median floored at 50) -- a local baseline, so offices that start
#       mid-window are judged against their own recent months, not their near-zero start;
#   (c) the same non-zero block total repeats for 3+ consecutive months AND is > 3x the
#       office's whole-series median -- a fabricated plateau raises the rolling median
#       itself, so (b) cannot see it.
# Plus one office is excluded outright (see EXCLUDED_OFFICES).
OUTLIER_ABS_CAP = 50000
ROLLING_MULTIPLE = 10
ROLLING_HALF_WINDOW = 6
MEDIAN_FLOOR = 50
PLATEAU_MIN_RUN = 3
PLATEAU_MULTIPLE = 3
EXCLUDED_OFFICES = {
    ("Rajasthan", "M-S Nandan Fitness Testing Center"):
        "its median block total is ~99,000 vehicles/month across all 53 months, implausible for a "
        "single fitness-testing centre; no month can be trusted, so the whole office is excluded",
}
# The v2 rule this replaces (10x the office's WHOLE-series median, floored at 50, or > 50,000),
# kept only so the changed decisions can be printed.
V2_MULTIPLE = 10

RULE_NAMES = {
    "a": f"(a) block total > {OUTLIER_ABS_CAP:,}",
    "b": f"(b) > {ROLLING_MULTIPLE}x rolling +/-{ROLLING_HALF_WINDOW}-month office median",
    "c": f"(c) identical total {PLATEAU_MIN_RUN}+ consecutive months and > {PLATEAU_MULTIPLE}x office median",
    "x": "office excluded entirely",
}

# Vahan vehicle class -> dashboard vehicle group. Matched case-insensitively
# with whitespace collapsed, because the granular file writes "Two Wheeler(Nt)"
# and the TDC aggregate writes "TWO WHEELER(NT)".
VEHICLE_GROUP_ORDER = ["2W", "3W", "Cars/LMV", "Commercial", "Other"]
VEHICLE_GROUP = {
    "two wheeler(nt)": "2W",
    "two wheeler(t)": "2W",
    "two wheeler (invalid carriage)": "2W",
    "three wheeler(t)": "3W",
    "three wheeler(nt)": "3W",
    # Not in the brief's list; appears only in category-fuel.csv. Grouped
    # with 3W by analogy with the 2W/4W invalid-carriage classes (see log).
    "three wheeler (invalid carriage)": "3W",
    "light motor vehicle": "Cars/LMV",
    "light passenger vehicle": "Cars/LMV",
    "four wheeler (invalid carriage)": "Cars/LMV",
    "light goods vehicle": "Commercial",
    "medium goods vehicle": "Commercial",
    "heavy goods vehicle": "Commercial",
    "medium motor vehicle": "Commercial",
    "heavy motor vehicle": "Commercial",
    "medium passenger vehicle": "Commercial",
    "heavy passenger vehicle": "Commercial",
    "other than mentioned above": "Other",
}
# National FY file MODE -> the same groups.
FY_MODE_GROUP = {
    "2W": "2W",
    "3W Passenger": "3W",
    "3W Goods": "3W",
    "Cars": "Cars/LMV",
    "Bus": "Commercial",
    "LGV (up to 7/5 tonnes)": "Commercial",
    "MGV (7.5-12 tonnes)": "Commercial",
    "HGV (>12 tonnes)": "Commercial",
    "Others": "Other",
}


def vehicle_group(vclass):
    key = re.sub(r"\s+", " ", vclass.strip().lower())
    if key not in VEHICLE_GROUP:
        raise SystemExit(f"Unmapped vehicle class: {vclass!r} -- add it to VEHICLE_GROUP")
    return VEHICLE_GROUP[key]


def in_window(d, lo, hi):
    return lo <= d <= hi


# ---------------------------------------------------------------------------
# Helper: parser for the malformed TDC aggregate exports
# ---------------------------------------------------------------------------
def load_weird_csv(path):
    """fuel-state.csv / category-fuel.csv ship with a title row that contains
    literal backslash-n text instead of a real line break. Turn the literal
    \\n into a real newline, drop the title and the blank line, parse the rest.
    Returns (title, rows)."""
    with open(path, encoding="utf-8-sig") as f:
        raw = f.read()
    fixed = raw.replace("\\n", "\n")
    lines = fixed.split("\n")
    title = lines[0].strip().strip('"')
    body = "\n".join(lines[2:])
    return title, list(csv.DictReader(io.StringIO(body)))


MONTHS = ("jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|"
          "june|july|august|september|october|november|december")


def stated_end_month(title):
    """Return an end month only if the source title states one explicitly."""
    m = re.search(rf"\b({MONTHS})[a-z]*[\s\-/,]*(\d{{4}})\s*\)?\s*$", title, re.I)
    if m:
        return f"{m.group(1).title()} {m.group(2)}"
    m = re.search(r"(\d{4})-(\d{2})(?:-\d{2})?\s*\)?\s*$", title)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    return None


# ---------------------------------------------------------------------------
# 3. Granular Vahan files: block-level outlier rule
# ---------------------------------------------------------------------------
def month_index(d):
    return int(d[:4]) * 12 + int(d[5:7]) - 1


def load_granular(filename, class_col):
    path = os.path.join(SRC, filename)
    total = dropped_bad = dropped_range = 0
    blocks = defaultdict(list)
    for row in csv.DictReader(open(path, encoding="utf-8-sig")):
        total += 1
        try:
            reg = float(row["registrations"])
        except (ValueError, TypeError):
            dropped_bad += 1
            continue
        if reg < 0:
            dropped_bad += 1
            continue
        if not in_window(row["date"], DATE_FLOOR, DATE_CEIL):
            dropped_range += 1
            continue
        row["registrations"] = reg
        row["state_name"] = canon_state(row["state_name"])
        row[class_col] = row[class_col].strip()
        blocks[(row["state_name"], row["office_name"], row["date"])].append(row)

    block_total = {k: sum(r["registrations"] for r in v) for k, v in blocks.items()}
    by_office = defaultdict(dict)  # (state, office) -> {month index: block total}
    for (state, office, date), t in block_total.items():
        by_office[(state, office)][month_index(date)] = t
    office_median = {k: statistics.median(v.values()) for k, v in by_office.items()}

    # v3 decision with the reason(s) that fired
    reasons = {}
    rolling = {}
    for office, series in by_office.items():
        months = sorted(series)
        for m in months:
            key = (office[0], office[1], f"{m // 12}-{m % 12 + 1:02d}-01")
            if office in EXCLUDED_OFFICES:
                reasons[key] = "x"
                continue
            t = series[m]
            window = [series[x] for x in months if abs(x - m) <= ROLLING_HALF_WINDOW]
            rmed = max(MEDIAN_FLOOR, statistics.median(window))
            rolling[key] = rmed
            run = 1
            x = m - 1
            while x in series and series[x] == t:
                run, x = run + 1, x - 1
            x = m + 1
            while x in series and series[x] == t:
                run, x = run + 1, x + 1
            why = ""
            if t > OUTLIER_ABS_CAP:
                why += "a"
            if t > ROLLING_MULTIPLE * rmed:
                why += "b"
            if t > 0 and run >= PLATEAU_MIN_RUN and t > PLATEAU_MULTIPLE * office_median[office]:
                why += "c"
            if why:
                reasons[key] = why
    new_bad = set(reasons)
    old_bad = {k for k, t in block_total.items()
               if t > OUTLIER_ABS_CAP
               or t > V2_MULTIPLE * max(MEDIAN_FLOOR, office_median[(k[0], k[1])])}
    return {
        "file": filename, "class_col": class_col, "total_rows": total,
        "dropped_bad": dropped_bad, "dropped_range": dropped_range,
        "blocks": blocks, "block_total": block_total, "office_median": office_median,
        "by_office": by_office, "new_bad": new_bad, "old_bad": old_bad, "reasons": reasons,
        "rolling": rolling,
    }


def rule_stats(g, bad):
    naive = sum(g["block_total"].values())
    rows = sum(len(g["blocks"][k]) for k in bad)
    vol = sum(g["block_total"][k] for k in bad)
    return {"blocks": len(bad), "rows": rows,
            "pct_rows": rows / g["total_rows"] * 100, "pct_vol": vol / naive * 100}


def kept_rows(g, bad):
    out = []
    for k, rows in g["blocks"].items():
        if k in bad:
            continue
        for r in rows:
            r2 = dict(r)
            r2["registrations"] = int(r["registrations"])
            out.append(r2)
    return out


def block_ev(g, k):
    if g["class_col"] != "fuel_type":
        return None
    return int(sum(r["registrations"] for r in g["blocks"][k] if r["fuel_type"] in CHARGEABLE_EV_FUELS))


def reason_text(g, k):
    return "; ".join(RULE_NAMES[c] for c in g["reasons"].get(k, ""))


def log_granular(g, label):
    old, new = rule_stats(g, g["old_bad"]), rule_stats(g, g["new_bad"])
    by_reason = defaultdict(int)
    for k, why in g["reasons"].items():
        for c in why:
            by_reason[c] += 1
    log(f"### {label} ({g['file']})")
    log(f"- Source rows: {g['total_rows']:,}")
    log(f"- Dropped (unparseable / negative registrations): {g['dropped_bad']:,}")
    log(f"- Dropped (outside {DATE_FLOOR} to {DATE_CEIL} window): {g['dropped_range']:,}")
    log(f"- (state, RTO office, month) blocks in window: {len(g['blocks']):,}")
    log("")
    log("| Rule | Blocks dropped | Rows dropped | % of rows | % of naive summed volume |")
    log("|---|---:|---:|---:|---:|")
    log(f"| v2 (before): > {V2_MULTIPLE}x whole-series office median or > {OUTLIER_ABS_CAP:,} | "
        f"{old['blocks']:,} | {old['rows']:,} | {old['pct_rows']:.2f}% | {old['pct_vol']:.1f}% |")
    log(f"| v3 (after): (a) or (b) or (c), plus excluded office | {new['blocks']:,} | {new['rows']:,} | "
        f"{new['pct_rows']:.2f}% | {new['pct_vol']:.1f}% |")
    log("")
    log("- Blocks each part fired on (a block can fire more than one): " +
        "; ".join(f"{RULE_NAMES[c]}: {by_reason[c]:,}" for c in "abcx") + ".")
    kept_totals = sorted(t for k, t in g["block_total"].items() if k not in g["new_bad"])
    p99 = kept_totals[int(len(kept_totals) * 0.99) - 1]
    log(f"- After v3: largest kept block total {kept_totals[-1]:,.0f}; 99th percentile of kept "
        f"block totals {p99:,.0f}.")
    log("")
    return old, new


def changed_blocks(g):
    """Every block whose keep/drop decision differs between v2 and v3."""
    out = []
    for k in sorted(g["old_bad"] ^ g["new_bad"], key=lambda k: (k[0], k[1], k[2])):
        now = "dropped" if k in g["new_bad"] else "kept"
        if now == "dropped":
            why = reason_text(g, k)
        else:
            rm = g["rolling"].get(k)
            why = (f"kept: v2 limit was {V2_MULTIPLE}x whole-series median "
                   f"{g['office_median'][(k[0], k[1])]:,.0f}; rolling median {rm:,.0f}")
        out.append((k[0], k[1], k[2][:7], int(g["block_total"][k]), block_ev(g, k), now, why))
    return out


EXPECT_DROPPED = [  # (state, office, number of identical months, value)
    ("Tripura", "Unakoti Dto", 22, 4813),
    ("Jharkhand", "Saraikela-Kharsawan", 12, 9091),
    ("Tamil Nadu", "Perambalur Rto", 7, 12521),
    ("Andhra Pradesh", "Jangareddygudem Rta", 3, 10324),
]
EXPECT_KEPT_OFFICES = [("Gujarat", "Kachchh East"), ("Andhra Pradesh", "Narsipatnam Mvi Office"),
                       ("Rajasthan", "Salumbar Dto")]
EXPECT_KEPT_BLOCKS = [("Maharashtra", "Pune", "2019-11-01"), ("Maharashtra", "Pune", "2022-10-01"),
                      ("Maharashtra", "Pune", "2023-11-01"),
                      ("Madhya Pradesh", "Indore Rto", "2019-11-01"), ("Madhya Pradesh", "Indore Rto", "2022-10-01"),
                      ("Madhya Pradesh", "Indore Rto", "2023-11-01"),
                      ("Rajasthan", "Jaipur (First) Rto", "2019-10-01"), ("Rajasthan", "Jaipur (First) Rto", "2019-11-01"),
                      ("Rajasthan", "Jaipur (First) Rto", "2022-10-01")]


def check_expectations(g):
    for state, office, n, value in EXPECT_DROPPED:
        at_value = [k for k in g["blocks"] if k[0] == state and k[1] == office and g["block_total"][k] == value]
        hit = [k for k in at_value if k in g["new_bad"]]
        # every block at the plateau value is dropped; the exact month counts are the fuel-type file's
        # (the vehicle-category file does not carry every one of those months)
        assert at_value and len(hit) == len(at_value), f"{office}: {len(hit)} of {len(at_value)} plateau blocks dropped in {g['file']}"
        if g["class_col"] == "fuel_type":
            assert len(hit) == n, f"{office}: expected {n} dropped blocks at {value}, got {len(hit)}"
    for office in EXPECT_KEPT_OFFICES:
        dropped = [k for k in g["new_bad"] if (k[0], k[1]) == office]
        assert not dropped, f"{office[1]} ramp-up months wrongly dropped in {g['file']}: {dropped}"
    for k in EXPECT_KEPT_BLOCKS:
        assert k in g["blocks"] and k not in g["new_bad"], f"festive month {k} wrongly dropped in {g['file']}"
    counts = ", ".join(
        f"{o} ({sum(1 for k in g['new_bad'] if k[0] == st and k[1] == o and g['block_total'][k] == v)} x {v:,})"
        for st, o, _n, v in EXPECT_DROPPED)
    log(f"- Assertions passed ({g['file']}): dropped {counts}; every Kachchh East, "
        f"Narsipatnam Mvi Office and Salumbar Dto month kept; Pune, Indore Rto and Jaipur (First) Rto "
        f"festive months kept.")


def report_excluded(g):
    out = {}
    for office, reason in EXCLUDED_OFFICES.items():
        keys = [k for k in g["blocks"] if (k[0], k[1]) == office]
        prev_kept = [k for k in keys if k not in g["old_bad"]]
        ev_all = sum(block_ev(g, k) or 0 for k in keys) if g["class_col"] == "fuel_type" else None
        ev_prev = sum(block_ev(g, k) or 0 for k in prev_kept) if g["class_col"] == "fuel_type" else None
        kept_totals = ", ".join(f"{g['block_total'][k]:,.0f}" for k in sorted(prev_kept))
        msg = (f"- **Excluded office: {office[1]} ({office[0]})**, all {len(keys)} months: {reason}. "
               f"The v2 rule had kept {len(prev_kept)} of its months (block totals {kept_totals}).")
        if ev_all is not None:
            msg += (f" Chargeable EVs removed vs v2: {ev_prev:,} (the kept months); chargeable EVs in all "
                    f"{len(keys)} months of the raw file: {ev_all:,}.")
        log(msg)
        out[office] = {"months": len(keys), "prev_kept": len(prev_kept), "ev_removed": ev_prev, "ev_all": ev_all}
    return out


# ---------------------------------------------------------------------------
# 4. Other sources
# ---------------------------------------------------------------------------
def load_charging_stations():
    path = os.path.join(SRC, "OperationalPC.csv")
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            vals = list(row.values())
            state = canon_state(vals[0])
            try:
                count = int(vals[1].strip().rstrip("\r"))
            except ValueError:
                continue
            rows.append({"state_name": state, "operational_public_chargers": count})
    total = sum(r["operational_public_chargers"] for r in rows)
    log("### Charging station file (OperationalPC.csv)")
    log(f"- {len(rows)} states/UTs, {total:,} operational public chargers nationally.")
    log("- Provenance: this file ships with no header metadata, no explicit collection date, "
        "and no source citation. Traced via the Kaggle dataset it was extracted from -- "
        "'Detailed India EV Market Data 2001-2024' by Sai Raam (srinrealyf), Apache 2.0 "
        "license -- whose description states the charger figures were compiled by scraping "
        "the government's Vahan4 dashboard. This is a secondary/echoed source, not the "
        "primary portal, and its own vintage is '~2024' with no finer date. Treated as a "
        "same-period snapshot alongside the 2024-05-capped registration data, and labelled "
        "as such (not as a precisely-dated figure).")
    log("- The file counts public charging points only. It has no AC/DC split, no power "
        "rating, no utilisation and no RTO-level location.")
    log("- Known gap: Ladakh and Mizoram have no entry in this file (present in the Vahan "
        "registration data, absent here) -- there is no charger-count denominator for those "
        "two, shown as an explicit gap rather than a zero.")
    log("")
    return rows


def load_national_fy():
    path = os.path.join(SRC, "india-vahan-registrations-by-vehicle-category-and-fuel-fy2011-fy2025.csv")
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            try:
                row["OBS_VALUE"] = int(float(row["OBS_VALUE"]))
            except (ValueError, TypeError):
                continue
            rows.append(row)
    modes = sorted(set(r["MODE"] for r in rows))
    unmapped = [m for m in modes if m not in FY_MODE_GROUP]
    if unmapped:
        raise SystemExit(f"Unmapped FY modes: {unmapped}")
    log("### National FY aggregate (india-vahan-registrations-by-vehicle-category-and-fuel-fy2011-fy2025.csv)")
    log(f"- {len(rows)} rows, national totals only (GEO=IND), "
        f"{min(r['TIME_PERIOD'] for r in rows)} through {max(r['TIME_PERIOD'] for r in rows)}.")
    log(f"- EV rows are FUEL_TYPE='EV'. The file does not say which Vahan fuel tags 'EV' "
        f"contains, so it cannot be confirmed that it matches the chargeable-EV definition "
        f"exactly.")
    log("- Runs past the 2024-05 cutoff used everywhere else. Used only in the clearly "
        "labelled national context view and as a national reference split, never blended "
        "into any state/RTO figure.")
    log("- MODE -> vehicle group mapping used for the national context view: " +
        "; ".join(f"{m} -> {FY_MODE_GROUP[m]}" for m in modes) + ".")
    log("")
    return rows


def load_fuel_state():
    title, rows = load_weird_csv(os.path.join(SRC, "fuel-state.csv"))
    ev = defaultdict(int)
    for row in rows:
        fuel = (row.get("Fuel") or "").strip()
        if fuel not in CHARGEABLE_EV_FUELS_UPPER:
            continue
        for col, val in row.items():
            if col in ("Fuel", "Total") or col is None:
                continue
            ev[canon_state(col)] += int(float(val))
    end = stated_end_month(title)
    log("### fuel-state.csv (TDC aggregate, fuel x state)")
    log(f"- Title row: \"{title}\". Parsed after replacing the literal '\\n' in the title row.")
    log(f"- Cumulative totals with no monthly breakdown. End month: "
        f"{end if end else 'end month not stated in source'}.")
    log(f"- {len(ev)} states/UTs. Chargeable EV per state = ELECTRIC(BOV) + PURE EV + "
        f"PLUG-IN HYBRID EV; STRONG HYBRID EV excluded. National sum: {sum(ev.values()):,}.")
    log("- Used as the '2019 to 2026' demand option in the gap ranking, and as the only "
        "demand figure for Telangana and Lakshadweep.")
    log("")
    return title, end, ev


def load_category_fuel():
    title, rows = load_weird_csv(os.path.join(SRC, "category-fuel.csv"))
    by_class = {}
    for row in rows:
        vc = (row.get("Vehicle Category") or "").strip()
        if not vc or vc.lower() == "total":
            continue
        by_class[vc] = sum(int(float(row[f])) for f in CHARGEABLE_EV_FUELS_UPPER)
    end = stated_end_month(title)
    groups = defaultdict(int)
    for vc, n in by_class.items():
        groups[vehicle_group(vc)] += n
    log("### category-fuel.csv (TDC aggregate, vehicle category x fuel)")
    log(f"- Title row: \"{title}\". National totals only, cumulative, no monthly breakdown. "
        f"End month: {end if end else 'end month not stated in source'}.")
    log("- Used only as the second national EV-by-vehicle-type split (chargeable-EV tags, "
        "grouped with the same class mapping as the state fleet mix).")
    log("- Chargeable EV by Vahan class: " +
        "; ".join(f"{k}={v:,}" for k, v in sorted(by_class.items(), key=lambda x: -x[1])) + ".")
    log("")
    return title, end, by_class, groups


# ---------------------------------------------------------------------------
# 5. Main
# ---------------------------------------------------------------------------
def write_csv(name, header, rows):
    path = os.path.join(OUT, name)
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"Wrote cleaned/{name} ({len(rows):,} rows)")


def blank(x, nd=4):
    # 4 decimals so the page can round once (to 1 dp) without double-rounding errors
    if x is None:
        return ""
    if isinstance(x, float):
        return f"{x:.{nd}f}"
    return x


def main():
    log("# Cleaning log -- EV Charging Site-Planning Dashboard (v2 dashboard, v3 outlier rule)")
    log("")
    log(f"Common date window for the granular Vahan files: **{DATE_FLOOR[:7]} to {DATE_CEIL[:7]}** "
        f"(the last month in both granular extracts; re-confirmed by re-downloading the "
        f"source, which was byte-identical).")
    log(f"Fixed comparison windows: last 12 months = {LAST12_FROM[:7]} to {LAST12_TO[:7]}; "
        f"prior 12 months = {PRIOR12_FROM[:7]} to {PRIOR12_TO[:7]}.")
    log("")
    log(f"'Chargeable EV' = {sorted(CHARGEABLE_EV_FUELS)}. Explicitly EXCLUDES "
        f"{sorted(EXCLUDED_EV_LIKE_FUELS)} everywhere, because a strong hybrid never plugs "
        f"into a charger.")
    log("")

    # --- granular files ---------------------------------------------------
    fuel = load_granular("vahan-vehicle-registrations-by-fuel-type.csv", "fuel_type")
    cat = load_granular("vahan-vehicle-registrations-by-vehicle-category.csv", "vehicle_type")

    log("## Outlier rule for the two granular Vahan files (v3)")
    log("")
    log("Some (state, RTO office, month) blocks in both granular files are corrupted: identical "
        "implausible values (e.g. 2,071,525) repeat across many unrelated states, offices and dates; "
        "small-town RTOs (e.g. Hindupur RTA, Sikar Vehicle Fitness Centre) show multi-million monthly "
        "counts for one vehicle type; Lower Siang, Arunachal Pradesh shows 1.86 million registrations "
        "in one month versus 830 for the state capital's RTO. The corruption inflates several columns "
        "of a block together, so the unit of exclusion is the whole block, never a single cell.")
    log("")
    log("**History.** v1 dropped a block if any single cell exceeded 20,000. That removed genuine "
        "festive-season months at large urban RTOs (Pune 2019-11 and 2022-10, Indore Rto 2019-11, "
        "2022-10 and 2023-11, Jaipur (First) Rto 2019-10, 2019-11 and 2022-10), because real "
        "large-RTO months and corrupted blocks overlap in the 20,000 to 50,000 range. v2 compared each "
        "block with 10x the office's median over its WHOLE series. That wrongly dropped real ramp-up "
        "months at offices that start mid-window (Kachchh East from 2023-08, Narsipatnam Mvi Office "
        "from 2023-09, Salumbar Dto from 2023-08), because their early near-zero months drag the "
        "whole-series median down.")
    log("")
    log("**Final rule (v3).** A block is dropped if ANY of these hold:")
    log(f"- **(a) Absolute cap:** block total > {OUTLIER_ABS_CAP:,}. No single RTO month in the kept "
        f"data comes close; this catches the gross corruption regardless of the office's history.")
    log(f"- **(b) Local spike:** block total > {ROLLING_MULTIPLE}x the office's rolling median block "
        f"total, taken over the office's own blocks within +/-{ROLLING_HALF_WINDOW} months (centred, "
        f"one-sided at the ends of its series, the month itself included, median floored at "
        f"{MEDIAN_FLOOR}). A local baseline lets an office that ramps up mid-window be judged against "
        f"its own recent months, while an isolated spike still stands out.")
    log(f"- **(c) Fabricated plateau:** the same non-zero block total repeats for {PLATEAU_MIN_RUN}+ "
        f"consecutive months AND is > {PLATEAU_MULTIPLE}x the office's whole-series median. A run of "
        f"copied inflated months raises the rolling median itself, so (b) cannot see it; real months "
        f"essentially never repeat an identical all-fuel total three times in a row.")
    log("- **Excluded office:** " + "; ".join(f"{o[1]} ({o[0]}): {r}" for o, r in EXCLUDED_OFFICES.items()) + ".")
    log("")
    fuel_old, fuel_new = log_granular(fuel, "Fuel-type file")
    check_expectations(fuel)
    excluded = report_excluded(fuel)
    log("")
    cat_old, cat_new = log_granular(cat, "Vehicle-category file")
    check_expectations(cat)
    report_excluded(cat)
    log("")

    # every block whose decision changed v2 -> v3
    changed_fuel = changed_blocks(fuel)
    changed_cat = changed_blocks(cat)
    log("### Blocks whose keep/drop decision changed from v2 to v3")
    log("")
    log("Fuel-type file (EV = chargeable EVs in the block):")
    log("")
    log("| State | Office | Month | Block total | EVs | Now | Why |")
    log("|---|---|---|---:|---:|---|---|")
    for r in changed_fuel:
        log(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]:,} | {r[4]:,} | {r[5]} | {r[6]} |")
    log("")
    log(f"Vehicle-category file: {len(changed_cat)} changed blocks (no fuel split, so no EV count):")
    log("")
    log("| State | Office | Month | Block total | Now | Why |")
    log("|---|---|---|---:|---|---|")
    for r in changed_cat:
        log(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]:,} | {r[5]} | {r[6]} |")
    log("")

    # ambiguous single-month spikes: decision and reason, from the computed values
    log("### Ambiguous single-month spikes (decision and reason)")
    log("")
    def neighbours(g, state, office, month):
        ser = g["by_office"][(state, office)]
        m = month_index(month + "-01")
        return [int(ser[x]) for x in sorted(ser) if 0 < abs(x - m) <= 3]
    for state, office, month in [("Assam", "Cachar", "2022-01"), ("Andhra Pradesh", "Bhimavaram Rta", "2019-01"),
                                 ("Madhya Pradesh", "Neemuch Dto", "2019-01"), ("Punjab", "Tarn Taran Sdm", "2019-01"),
                                 ("Andhra Pradesh", "Jangareddy Gudem Uo", "2019-01"), ("Kerala", "Vellarikundu Srto", "2019-01"),
                                 ("Manipur", "Churachandpur", "2019-01")]:
        k = (state, office, month + "-01")
        t = fuel["block_total"][k]
        rm = fuel["rolling"][k]
        decision = "DROPPED" if k in fuel["new_bad"] else "KEPT"
        log(f"- **{office} ({state}) {month}: {decision}.** Block total {t:,.0f}, {block_ev(fuel, k):,} EVs; "
            f"{t / rm:.1f}x its rolling median of {rm:,.0f} (neighbouring months: "
            f"{', '.join(f'{v:,}' for v in neighbours(fuel, state, office, month))}). "
            + ("Every fuel column is inflated by a similar factor in one isolated month, the same "
               "signature as the confirmed corrupted blocks, so rule (b) is applied as written." if decision == "DROPPED" else
               f"Same one-month signature, but it is below the {ROLLING_MULTIPLE}x threshold, so the rule "
               f"keeps it; it is not special-cased."))
    log("- The Jan 2019 cases share a pattern: Jan 2019 is the first month of the extract, and a handful "
        "of offices show a one-off month about 10x their following months. The source does not say why "
        "(a posting backlog is one possibility, not confirmed). Either way the month does not represent "
        "that office's January demand.")
    log("")

    fuel_rows = kept_rows(fuel, fuel["new_bad"])
    fuel_rows_old = kept_rows(fuel, fuel["old_bad"])
    cat_rows = kept_rows(cat, cat["new_bad"])
    cat_rows_old = kept_rows(cat, cat["old_bad"])
    log(f"- Kept rows after v3: fuel-type {len(fuel_rows):,}; vehicle-category {len(cat_rows):,}.")

    # national monthly totals after v3 (computed, not asserted)
    nat_month = defaultdict(int)
    for r in fuel_rows:
        nat_month[r["date"]] += r["registrations"]
    lo_m = min(nat_month, key=nat_month.get)
    hi_m = max(nat_month, key=nat_month.get)
    log(f"- National all-fuel monthly totals after v3 (fuel-type file) range from "
        f"{nat_month[lo_m]:,} ({lo_m[:7]}) to {nat_month[hi_m]:,} ({hi_m[:7]}).")
    arun = sum(r["registrations"] for r in fuel_rows
               if r["state_name"] == "Arunachal Pradesh" and r["fuel_type"] in CHARGEABLE_EV_FUELS)
    arun_raw = sum(r["registrations"] for rows in fuel["blocks"].values() for r in rows
                   if r["state_name"] == "Arunachal Pradesh" and r["fuel_type"] in CHARGEABLE_EV_FUELS)
    log(f"- Arunachal Pradesh chargeable EVs, whole window: {arun_raw:,.0f} with no outlier "
        f"rule, {arun:,} after v3.")
    log("")

    # --- 1b fuel tag breakdown -------------------------------------------
    tag = defaultdict(int)
    tag_rows = defaultdict(int)
    for r in fuel_rows:
        if r["fuel_type"] in CHARGEABLE_EV_FUELS | EXCLUDED_EV_LIKE_FUELS:
            tag[r["fuel_type"]] += r["registrations"]
            tag_rows[r["fuel_type"]] += 1
    ev_total = sum(tag[t] for t in CHARGEABLE_EV_FUELS)
    log("### Chargeable-EV breakdown by fuel tag (fuel-type file, after v3, 2019-01 to 2024-05)")
    log("")
    log("| Fuel tag | In scope | Rows | Registrations | Share of chargeable EV |")
    log("|---|---|---:|---:|---:|")
    for t in sorted(CHARGEABLE_EV_FUELS, key=lambda t: -tag[t]):
        log(f"| {t} | yes | {tag_rows[t]:,} | {tag[t]:,} | {tag[t] / ev_total * 100:.2f}% |")
    for t in sorted(EXCLUDED_EV_LIKE_FUELS):
        log(f"| {t} | no (excluded) | {tag_rows[t]:,} | {tag[t]:,} | n/a |")
    log(f"| **Chargeable EV total** | | | **{ev_total:,}** | 100% |")
    log("")

    stations = load_charging_stations()
    fy_rows = load_national_fy()
    fs_title, fs_end, fs_ev = load_fuel_state()
    cf_title, cf_end, cf_by_class, cf_groups = load_category_fuel()

    log("### fuel-rto.csv -- excluded from the dashboard")
    log("- After fixing the same literal-\\n title-row issue, this file's header collapses to "
        "just 'Fuel,Total' -- the RTO name columns are missing from the header, even though "
        "each data row has dozens of extra unlabelled values after 'Total'. Those numbers "
        "cannot be attributed to an RTO, so the file is not used. RTO-level demand comes from "
        "the office_name/office_code columns of the granular fuel-type file.")
    log("")

    # --- 1e vehicle-category grouping ------------------------------------
    log("### Vehicle-category grouping (state fleet mix, all fuels)")
    seen_classes = sorted(set(r["vehicle_type"] for r in cat_rows))
    log("- Mapping applied (case-insensitive): " +
        "; ".join(f"{c} -> {vehicle_group(c)}" for c in seen_classes) + ".")
    log("- 'Three Wheeler (Invalid Carriage)' does not occur in the granular file; it occurs "
        "only in category-fuel.csv and is grouped with 3W there (assumption, by analogy with "
        "the 2W and 4W invalid-carriage classes).")
    log("- The state mix is the WHOLE registered fleet (all fuels), because the granular "
        "vehicle-category file has no fuel split. It is not an EV-only mix.")
    log("")

    # --- aggregate: state x month ----------------------------------------
    ev_sm = defaultdict(int)
    tot_sm = defaultdict(int)
    for r in fuel_rows:
        k = (r["state_name"], r["date"])
        tot_sm[k] += r["registrations"]
        if r["fuel_type"] in CHARGEABLE_EV_FUELS:
            ev_sm[k] += r["registrations"]
    write_csv("state_month_ev_demand.csv",
              ["state_name", "date", "chargeable_ev_registrations", "total_registrations", "ev_share_pct"],
              [[s, d, ev_sm.get((s, d), 0), tot_sm[(s, d)],
                f"{ev_sm.get((s, d), 0) / tot_sm[(s, d)] * 100:.3f}" if tot_sm[(s, d)] else ""]
               for (s, d) in sorted(tot_sm)])

    # --- RTO ------------------------------------------------------------
    cum = defaultdict(int)
    l12 = defaultdict(int)
    rto_keys = set()
    for r in fuel_rows:
        if r["fuel_type"] not in CHARGEABLE_EV_FUELS:
            continue
        k = (r["state_name"], r["office_name"], r["office_code"])
        rto_keys.add(k)
        cum[k] += r["registrations"]
        if in_window(r["date"], LAST12_FROM, LAST12_TO):
            l12[k] += r["registrations"]
    write_csv("rto_ev_demand_cumulative.csv",
              ["state_name", "office_name", "office_code",
               "chargeable_ev_registrations_total", "chargeable_ev_registrations_last12m"],
              [[k[0], k[1], k[2], cum[k], l12.get(k, 0)] for k in sorted(rto_keys)])

    # --- vehicle category mix -------------------------------------------
    vc_tot = defaultdict(int)
    grp_tot = defaultdict(int)
    for r in cat_rows:
        vc_tot[(r["state_name"], r["vehicle_type"])] += r["registrations"]
        grp_tot[(r["state_name"], vehicle_group(r["vehicle_type"]))] += r["registrations"]
    write_csv("state_vehicle_category_mix.csv", ["state_name", "vehicle_type", "registrations"],
              [[k[0], k[1], vc_tot[k]] for k in sorted(vc_tot)])
    mix_states = sorted(set(k[0] for k in grp_tot))
    nat_grp = defaultdict(int)
    for (s, g), n in grp_tot.items():
        nat_grp[g] += n
    mix_rows = []
    for s in mix_states + ["All India"]:
        src = nat_grp if s == "All India" else {g: grp_tot.get((s, g), 0) for g in VEHICLE_GROUP_ORDER}
        t = sum(src.values())
        for g in VEHICLE_GROUP_ORDER:
            n = src.get(g, 0)
            mix_rows.append([s, g, n, f"{n / t * 100:.3f}" if t else ""])
    write_csv("state_fleet_mix.csv", ["state_name", "group", "registrations", "share_pct"], mix_rows)

    # --- chargers ---------------------------------------------------------
    write_csv("charging_stations_by_state.csv",
              ["state_name", "operational_public_chargers", "data_vintage_note"],
              [[r["state_name"], r["operational_public_chargers"],
                "undated, ~2024 vintage (secondary/echoed source, see cleaning log)"] for r in stations])
    chargers = {r["state_name"]: r["operational_public_chargers"] for r in stations}

    # --- national FY ------------------------------------------------------
    write_csv("national_fy_ev_context.csv", ["TIME_PERIOD", "MODE", "FUEL_TYPE", "OBS_VALUE", "UNIT_MEASURE"],
              [[r["TIME_PERIOD"], r["MODE"], r["FUEL_TYPE"], r["OBS_VALUE"], r["UNIT_MEASURE"]] for r in fy_rows])
    fy_grp = defaultdict(int)
    fy_list = sorted(set(r["TIME_PERIOD"] for r in fy_rows))
    for r in fy_rows:
        if r["FUEL_TYPE"] == "EV":
            fy_grp[(r["TIME_PERIOD"], FY_MODE_GROUP[r["MODE"]])] += r["OBS_VALUE"]
    write_csv("national_fy_ev_by_group.csv", ["fy", "group", "ev_registrations"],
              [[fy, g, fy_grp.get((fy, g), 0)] for fy in fy_list for g in VEHICLE_GROUP_ORDER])

    # --- 1f two national splits ------------------------------------------
    last_fy = fy_list[-1]
    fy_last = {g: fy_grp.get((last_fy, g), 0) for g in VEHICLE_GROUP_ORDER}
    fy_last_t = sum(fy_last.values())
    cf_t = sum(cf_groups.values())
    split_rows = []
    for g in VEHICLE_GROUP_ORDER:
        split_rows.append(["fy_file", f"{last_fy} (single financial year)", g, fy_last[g],
                           f"{fy_last[g] / fy_last_t * 100:.3f}"])
    for g in VEHICLE_GROUP_ORDER:
        split_rows.append(["category_fuel", "2019 to 2026 cumulative (end month not stated)", g,
                           cf_groups.get(g, 0), f"{cf_groups.get(g, 0) / cf_t * 100:.3f}"])
    write_csv("national_ev_split.csv", ["source", "window", "group", "ev_registrations", "share_pct"],
              split_rows)
    log("### Two national EV-by-vehicle-type splits (kept side by side; they disagree)")
    log("")
    log(f"| Group | FY file, {last_fy} | Share | category-fuel.csv, 2019-2026 cumulative | Share |")
    log("|---|---:|---:|---:|---:|")
    for g in VEHICLE_GROUP_ORDER:
        log(f"| {g} | {fy_last[g]:,} | {fy_last[g] / fy_last_t * 100:.1f}% | "
            f"{cf_groups.get(g, 0):,} | {cf_groups.get(g, 0) / cf_t * 100:.1f}% |")
    log(f"| Total | {fy_last_t:,} | | {cf_t:,} | |")
    log("")
    log("- Different windows (one year vs a multi-year cumulative), different EV definitions "
        "(the FY file's 'EV' is not documented; category-fuel uses the three chargeable tags) "
        "and different class groupings mean neither can be reconciled with the other from "
        "these files. Both are shown; neither is treated as correct.")
    log("")

    # --- 1d state summary --------------------------------------------------
    ev_cum = defaultdict(int)
    ev_l12 = defaultdict(int)
    ev_p12 = defaultdict(int)
    tot_l12 = defaultdict(int)
    granular_states = set()
    for (s, d), n in tot_sm.items():
        granular_states.add(s)
        e = ev_sm.get((s, d), 0)
        ev_cum[s] += e
        if in_window(d, LAST12_FROM, LAST12_TO):
            ev_l12[s] += e
            tot_l12[s] += n
        if in_window(d, PRIOR12_FROM, PRIOR12_TO):
            ev_p12[s] += e
    all_states = sorted(granular_states | set(fs_ev) | set(chargers) | set(mix_states))

    summary = []
    for s in all_states:
        has_g = s in granular_states
        pc = chargers.get(s)
        cum_a = ev_cum[s] if has_g else None
        cum_26 = fs_ev.get(s)
        l12v = ev_l12[s] if has_g else None
        p12v = ev_p12[s] if has_g else None
        growth = (l12v - p12v) / p12v * 100 if has_g and p12v else None
        share = l12v / tot_l12[s] * 100 if has_g and tot_l12[s] else None
        epc_a = cum_a / pc if cum_a is not None and pc else None
        epc_26 = cum_26 / pc if cum_26 is not None and pc else None
        if not has_g:
            flag = "no_granular_demand"
        elif pc is None:
            flag = "no_charger_data"
        elif p12v < SMALL_BASE_THRESHOLD:
            flag = "small_base"
        else:
            flag = "ok"
        # every applicable caveat, not just the primary one used for colouring
        all_flags = [f for f, on in [("no_granular_demand", not has_g), ("no_charger_data", pc is None),
                                     ("small_base", has_g and p12v < SMALL_BASE_THRESHOLD)] if on]
        summary.append(dict(data_flags="|".join(all_flags) or "ok",state_name=s, ev_cum_aligned=cum_a, ev_cum_2019_2026=cum_26,
                            ev_last12m=l12v, ev_prior12m=p12v, growth_pct=growth,
                            ev_share_last12m_pct=share, public_chargers=pc,
                            ev_per_charger_aligned=epc_a, ev_per_charger_2019_2026=epc_26,
                            data_flag=flag))
    ranked = sorted([r for r in summary if r["ev_per_charger_aligned"] is not None],
                    key=lambda r: -r["ev_per_charger_aligned"])
    for i, r in enumerate(ranked, 1):
        r["rank_aligned"] = i
    ranked26 = sorted([r for r in summary if r["ev_per_charger_2019_2026"] is not None],
                      key=lambda r: -r["ev_per_charger_2019_2026"])
    for i, r in enumerate(ranked26, 1):
        r["rank_2019_2026"] = i
    cols = ["state_name", "ev_cum_aligned", "ev_cum_2019_2026", "ev_last12m", "ev_prior12m",
            "growth_pct", "ev_share_last12m_pct", "public_chargers", "ev_per_charger_aligned",
            "ev_per_charger_2019_2026", "rank_aligned", "rank_2019_2026", "data_flag", "data_flags"]
    write_csv("state_summary.csv", cols, [[blank(r.get(c)) for c in cols] for r in summary])

    # national row: EV/charger computed only over states that have BOTH numerator and denominator
    both_a = [r for r in summary if r["ev_per_charger_aligned"] is not None]
    both_26 = [r for r in summary if r["ev_per_charger_2019_2026"] is not None]
    n_l12 = sum(ev_l12.values())
    n_p12 = sum(ev_p12.values())
    n_tot12 = sum(tot_l12.values())
    nat = dict(
        state_name="All India",
        ev_cum_aligned=sum(ev_cum.values()),
        ev_cum_2019_2026=sum(fs_ev.values()),
        ev_last12m=n_l12, ev_prior12m=n_p12,
        growth_pct=(n_l12 - n_p12) / n_p12 * 100,
        ev_share_last12m_pct=n_l12 / n_tot12 * 100,
        public_chargers=sum(chargers.values()),
        ev_per_charger_aligned=sum(r["ev_cum_aligned"] for r in both_a) / sum(r["public_chargers"] for r in both_a),
        ev_per_charger_2019_2026=sum(r["ev_cum_2019_2026"] for r in both_26) / sum(r["public_chargers"] for r in both_26),
        states_in_epc_aligned=len(both_a),
        states_in_epc_2019_2026=len(both_26),
        epc_aligned_excludes="; ".join(r["state_name"] for r in summary if r["ev_per_charger_aligned"] is None),
        epc_2019_2026_excludes="; ".join(r["state_name"] for r in summary if r["ev_per_charger_2019_2026"] is None),
        states_ranked=len(ranked),
    )
    ncols = list(nat.keys())
    write_csv("national_summary.csv", ncols, [[blank(nat[c]) for c in ncols]])

    log("### state_summary.csv")
    log(f"- One row per state/UT appearing in any source: {len(summary)} rows.")
    log("- ev_cum_aligned: chargeable EVs 2019-01 to 2024-05 from the granular fuel-type file. "
        "ev_cum_2019_2026: ELECTRIC(BOV) + PURE EV + PLUG-IN HYBRID EV from fuel-state.csv.")
    log(f"- growth_pct = (last 12m - prior 12m) / prior 12m. data_flag is the first that "
        f"applies of: no_granular_demand, no_charger_data, small_base (prior 12m < "
        f"{SMALL_BASE_THRESHOLD}), ok. data_flags lists EVERY flag that applies, separated by '|'.")
    log("- Values that cannot be computed are left blank, never 0.")
    flags = defaultdict(list)
    for r in summary:
        flags[r["data_flag"]].append(r["state_name"])
    for f_, ss in sorted(flags.items()):
        log(f"- primary {f_}: {len(ss)} ({', '.join(ss)})")
    multi = [f"{r['state_name']} ({r['data_flags'].replace('|', ' + ')})" for r in summary if "|" in r["data_flags"]]
    log(f"- States with more than one flag: {', '.join(multi) if multi else 'none'}")
    log(f"- All-India EVs per charger is computed only over states with both a demand figure "
        f"and a charger count (aligned window: {len(both_a)} states; excludes "
        f"{nat['epc_aligned_excludes']}).")
    log("")

    # --- coverage gaps ----------------------------------------------------
    log("### Known coverage gaps (carried into the dashboard, not hidden)")
    log("- **Telangana**: zero rows in either granular Vahan file for the entire window -- a "
        "reporting gap, not zero demand. Present in fuel-state.csv "
        f"({fmt(fs_ev.get('Telangana'))} chargeable EVs, 2019-2026) and in the charging-station "
        f"file ({fmt(chargers.get('Telangana'))} chargers).")
    log("- **Lakshadweep**: same demand-side gap; present in fuel-state.csv "
        f"({fmt(fs_ev.get('Lakshadweep'))}) and the charging-station file "
        f"({fmt(chargers.get('Lakshadweep'))} charger).")
    log("- **Ladakh, Mizoram**: present in demand data, absent from the charging-station file -- "
        "no denominator for EVs per charger.")
    log("- Registrations are recorded at the owner's RTO, not where the vehicle charges.")
    log("")

    # --- FY file vs granular Vahan, complete FYs inside the granular window --
    ev_nat_month = defaultdict(int)
    for (st, d), n in ev_sm.items():
        ev_nat_month[d[:7]] += n
    fy_cmp = []
    for fy in fy_list:
        y = int(fy[2:])
        lo, hi = f"{y - 1}-04", f"{y}-03"
        if lo < DATE_FLOOR[:7] or hi > DATE_CEIL[:7]:
            continue  # not a complete year inside the granular window
        fy_ev = sum(fy_grp.get((fy, g), 0) for g in VEHICLE_GROUP_ORDER)
        vahan = sum(n for m, n in ev_nat_month.items() if lo <= m <= hi)
        fy_cmp.append((fy, fy_ev, vahan, fy_ev / vahan))
    write_csv("fy_file_vs_vahan.csv", ["fy", "fy_file_ev", "vahan_chargeable_ev", "ratio_fy_file_to_vahan"],
              [[a, b, c, f"{d:.4f}"] for a, b, c, d in fy_cmp])
    log("### FY file vs granular Vahan (complete financial years in the granular window)")
    log("")
    log("| FY | FY-file EV total | Vahan chargeable EVs (granular, cleaned) | FY file / Vahan |")
    log("|---|---:|---:|---:|")
    for r in fy_cmp:
        log(f"| {r[0]} | {r[1]:,} | {r[2]:,} | {r[3]:.3f} |")
    log("")
    log("- The FY file counts fewer EVs than the cleaned Vahan registrations in every complete year, and "
        "it does not state which fuel tags it counts as EV. It is used for the long-run shape and the "
        "mode split only; the headline FY2020 to FY2024 growth on the page is computed from Vahan.")
    log("")

    # --- 1h verification table -------------------------------------------
    def ev_sum(rows, pred=lambda r: True):
        return sum(r["registrations"] for r in rows if r["fuel_type"] in CHARGEABLE_EV_FUELS and pred(r))

    def all_sum(rows, pred=lambda r: True):
        return sum(r["registrations"] for r in rows if pred(r))

    verify("# Verification table (printed by clean_ev_data.py)")
    verify("")
    verify("## National totals, v2 rule (before) vs v3 rule (after)")
    verify("")
    verify("| Measure | Before (v2) | After (v3) | Change |")
    verify("|---|---:|---:|---:|")
    for label, b, a in [
        ("Chargeable EVs, fuel-type file", ev_sum(fuel_rows_old), ev_sum(fuel_rows)),
        ("All-fuel registrations, fuel-type file", all_sum(fuel_rows_old), all_sum(fuel_rows)),
        ("All registrations, vehicle-category file", all_sum(cat_rows_old), all_sum(cat_rows)),
    ]:
        verify(f"| {label} | {b:,} | {a:,} | {a - b:+,} |")
    verify("")
    verify("| Rule | File | Blocks dropped | Rows dropped | % rows | % naive volume |")
    verify("|---|---|---:|---:|---:|---:|")
    for lbl, st, fn in [("v2", fuel_old, "fuel-type"), ("v3", fuel_new, "fuel-type"),
                        ("v2", cat_old, "vehicle-category"), ("v3", cat_new, "vehicle-category")]:
        verify(f"| {lbl} | {fn} | {st['blocks']:,} | {st['rows']:,} | {st['pct_rows']:.2f}% | {st['pct_vol']:.1f}% |")
    verify("")
    verify("## Large RTOs, v2 vs v3 (whole window 2019-01 to 2024-05, fuel-type file)")
    verify("")
    verify("| RTO | All-fuel before | All-fuel after | Chargeable EV before | Chargeable EV after |")
    verify("|---|---:|---:|---:|---:|")
    for st, off in [("Maharashtra", "Pune"), ("Madhya Pradesh", "Indore Rto"), ("Rajasthan", "Jaipur (First) Rto")]:
        p = (lambda r, st=st, off=off: r["state_name"] == st and r["office_name"] == off)
        verify(f"| {off} ({st}) | {all_sum(fuel_rows_old, p):,} | {all_sum(fuel_rows, p):,} | "
               f"{ev_sum(fuel_rows_old, p):,} | {ev_sum(fuel_rows, p):,} |")
    verify("")
    verify("## Top 10 states by EVs per public charger (aligned window 2019-01 to 2024-05)")
    verify("")
    verify("| Rank | State | EVs (aligned) | Chargers | EVs per charger | Growth % (last 12m vs prior) | All flags |")
    verify("|---:|---|---:|---:|---:|---:|---|")
    for r in ranked[:10]:
        g = f"{r['growth_pct']:.1f}%" if r["growth_pct"] is not None else "--"
        verify(f"| {r['rank_aligned']} | {r['state_name']} | {r['ev_cum_aligned']:,} | {r['public_chargers']:,} | "
               f"{r['ev_per_charger_aligned']:.1f} | {g} | {r['data_flags'].replace('|', ', ')} |")
    verify(f"| | **All India** ({len(both_a)} states with both figures) | | | {nat['ev_per_charger_aligned']:.1f} | "
           f"{nat['growth_pct']:.1f}% | |")
    verify("")
    verify(f"## Blocks whose decision changed, v2 -> v3 (fuel-type file: {len(changed_fuel)}; vehicle-category file: {len(changed_cat)})")
    verify("")
    verify("| State | Office | Month | Block total | EVs | Now | Why |")
    verify("|---|---|---|---:|---:|---|---|")
    for r in changed_fuel:
        verify(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]:,} | {r[4]:,} | {r[5]} | {r[6]} |")
    verify("")
    for office, x in excluded.items():
        verify(f"Excluded office {office[1]} ({office[0]}): {x['months']} months; EVs removed vs v2 "
               f"{x['ev_removed']:,}; EVs in all its raw months {x['ev_all']:,}.")
    verify("")
    verify("## FY file vs granular Vahan, complete financial years in the granular window")
    verify("")
    verify("| FY | FY-file EV total | Vahan chargeable-EV total (granular, cleaned) | FY file / Vahan |")
    verify("|---|---:|---:|---:|")
    for r in fy_cmp:
        verify(f"| {r[0]} | {r[1]:,} | {r[2]:,} | {r[3]:.3f} |")
    verify("")
    verify("## National EV split by vehicle group, two sources")
    verify("")
    verify(f"| Group | FY file {last_fy} | category-fuel.csv 2019-2026 |")
    verify("|---|---:|---:|")
    for g in VEHICLE_GROUP_ORDER:
        verify(f"| {g} | {fy_last[g] / fy_last_t * 100:.2f}% ({fy_last[g]:,}) | "
               f"{cf_groups.get(g, 0) / cf_t * 100:.2f}% ({cf_groups.get(g, 0):,}) |")
    verify("")

    # --- metadata the dashboard copy needs (all computed above) --------------
    write_csv("cleaning_stats.csv",
              ["file", "rule", "blocks_dropped", "rows_dropped", "pct_rows", "pct_naive_volume",
               "source_rows", "kept_rows"],
              [["vahan-vehicle-registrations-by-fuel-type.csv", "v3", fuel_new["blocks"], fuel_new["rows"],
                f"{fuel_new['pct_rows']:.2f}", f"{fuel_new['pct_vol']:.1f}", fuel["total_rows"], len(fuel_rows)],
               ["vahan-vehicle-registrations-by-vehicle-category.csv", "v3", cat_new["blocks"], cat_new["rows"],
                f"{cat_new['pct_rows']:.2f}", f"{cat_new['pct_vol']:.1f}", cat["total_rows"], len(cat_rows)],
               ["vahan-vehicle-registrations-by-fuel-type.csv", "v2", fuel_old["blocks"], fuel_old["rows"],
                f"{fuel_old['pct_rows']:.2f}", f"{fuel_old['pct_vol']:.1f}", fuel["total_rows"], len(fuel_rows_old)],
               ["vahan-vehicle-registrations-by-vehicle-category.csv", "v2", cat_old["blocks"], cat_old["rows"],
                f"{cat_old['pct_rows']:.2f}", f"{cat_old['pct_vol']:.1f}", cat["total_rows"], len(cat_rows_old)]])
    write_csv("source_meta.csv", ["key", "value"], [
        ["granular_from", DATE_FLOOR[:7]], ["granular_to", DATE_CEIL[:7]],
        ["last12_from", LAST12_FROM[:7]], ["last12_to", LAST12_TO[:7]],
        ["prior12_from", PRIOR12_FROM[:7]], ["prior12_to", PRIOR12_TO[:7]],
        ["small_base_threshold", SMALL_BASE_THRESHOLD],
        ["fuel_state_title", fs_title], ["fuel_state_end_month", fs_end or "end month not stated in source"],
        ["category_fuel_title", cf_title], ["category_fuel_end_month", cf_end or "end month not stated in source"],
        ["fy_first", fy_list[0]], ["fy_last", last_fy],
        ["excluded_office", "; ".join(f"{o[1]} ({o[0]})" for o in excluded)],
        ["excluded_office_months", sum(v["months"] for v in excluded.values())],
        ["excluded_office_ev_removed", sum(v["ev_removed"] for v in excluded.values())],
        ["excluded_office_ev_all", sum(v["ev_all"] for v in excluded.values())],
    ])

    with open(os.path.join(OUT, "verification_table.md"), "w") as f:
        f.write("\n".join(VERIFY) + "\n")
    with open(os.path.join(OUT, "cleaning_log.md"), "w") as f:
        f.write("\n".join(LOG) + "\n")
    print("\nWrote cleaned/cleaning_log.md and cleaned/verification_table.md")


if __name__ == "__main__":
    main()
