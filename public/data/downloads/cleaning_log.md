# Cleaning log -- EV Charging Site-Planning Dashboard (v2 dashboard, v3 outlier rule)

Common date window for the granular Vahan files: **2019-01 to 2024-05** (the last month in both granular extracts; re-confirmed by re-downloading the source, which was byte-identical).
Fixed comparison windows: last 12 months = 2023-06 to 2024-05; prior 12 months = 2022-06 to 2023-05.

'Chargeable EV' = ['Electric(Bov)', 'Plug-In Hybrid Ev', 'Pure Ev']. Explicitly EXCLUDES ['Strong Hybrid Ev'] everywhere, because a strong hybrid never plugs into a charger.

## Outlier rule for the two granular Vahan files (v3)

Some (state, RTO office, month) blocks in both granular files are corrupted: identical implausible values (e.g. 2,071,525) repeat across many unrelated states, offices and dates; small-town RTOs (e.g. Hindupur RTA, Sikar Vehicle Fitness Centre) show multi-million monthly counts for one vehicle type; Lower Siang, Arunachal Pradesh shows 1.86 million registrations in one month versus 830 for the state capital's RTO. The corruption inflates several columns of a block together, so the unit of exclusion is the whole block, never a single cell.

**History.** v1 dropped a block if any single cell exceeded 20,000. That removed genuine festive-season months at large urban RTOs (Pune 2019-11 and 2022-10, Indore Rto 2019-11, 2022-10 and 2023-11, Jaipur (First) Rto 2019-10, 2019-11 and 2022-10), because real large-RTO months and corrupted blocks overlap in the 20,000 to 50,000 range. v2 compared each block with 10x the office's median over its WHOLE series. That wrongly dropped real ramp-up months at offices that start mid-window (Kachchh East from 2023-08, Narsipatnam Mvi Office from 2023-09, Salumbar Dto from 2023-08), because their early near-zero months drag the whole-series median down.

**Final rule (v3).** A block is dropped if ANY of these hold:
- **(a) Absolute cap:** block total > 50,000. No single RTO month in the kept data comes close; this catches the gross corruption regardless of the office's history.
- **(b) Local spike:** block total > 10x the office's rolling median block total, taken over the office's own blocks within +/-6 months (centred, one-sided at the ends of its series, the month itself included, median floored at 50). A local baseline lets an office that ramps up mid-window be judged against its own recent months, while an isolated spike still stands out.
- **(c) Fabricated plateau:** the same non-zero block total repeats for 3+ consecutive months AND is > 3x the office's whole-series median. A run of copied inflated months raises the rolling median itself, so (b) cannot see it; real months essentially never repeat an identical all-fuel total three times in a row.
- **Excluded office:** M-S Nandan Fitness Testing Center (Rajasthan): its median block total is ~99,000 vehicles/month across all 53 months, implausible for a single fitness-testing centre; no month can be trusted, so the whole office is excluded.

### Fuel-type file (vahan-vehicle-registrations-by-fuel-type.csv)
- Source rows: 418,372
- Dropped (unparseable / negative registrations): 0
- Dropped (outside 2019-01-01 to 2024-05-01 window): 0
- (state, RTO office, month) blocks in window: 82,795

| Rule | Blocks dropped | Rows dropped | % of rows | % of naive summed volume |
|---|---:|---:|---:|---:|
| v2 (before): > 10x whole-series office median or > 50,000 | 521 | 5,288 | 1.26% | 84.7% |
| v3 (after): (a) or (b) or (c), plus excluded office | 542 | 5,425 | 1.30% | 84.8% |

- Blocks each part fired on (a block can fire more than one): (a) block total > 50,000: 381; (b) > 10x rolling +/-6-month office median: 18; (c) identical total 3+ consecutive months and > 3x office median: 98; office excluded entirely: 53.
- After v3: largest kept block total 32,237; 99th percentile of kept block totals 9,123.

- Assertions passed (vahan-vehicle-registrations-by-fuel-type.csv): dropped Unakoti Dto (22 x 4,813), Saraikela-Kharsawan (12 x 9,091), Perambalur Rto (7 x 12,521), Jangareddygudem Rta (3 x 10,324); every Kachchh East, Narsipatnam Mvi Office and Salumbar Dto month kept; Pune, Indore Rto and Jaipur (First) Rto festive months kept.
- **Excluded office: M-S Nandan Fitness Testing Center (Rajasthan)**, all 53 months: its median block total is ~99,000 vehicles/month across all 53 months, implausible for a single fitness-testing centre; no month can be trusted, so the whole office is excluded. The v2 rule had kept 3 of its months (block totals 32,990, 14,541, 24,729). Chargeable EVs removed vs v2: 121 (the kept months); chargeable EVs in all 53 months of the raw file: 242,942.

### Vehicle-category file (vahan-vehicle-registrations-by-vehicle-category.csv)
- Source rows: 584,267
- Dropped (unparseable / negative registrations): 0
- Dropped (outside 2019-01-01 to 2024-05-01 window): 0
- (state, RTO office, month) blocks in window: 82,781

| Rule | Blocks dropped | Rows dropped | % of rows | % of naive summed volume |
|---|---:|---:|---:|---:|
| v2 (before): > 10x whole-series office median or > 50,000 | 522 | 7,698 | 1.32% | 84.4% |
| v3 (after): (a) or (b) or (c), plus excluded office | 543 | 8,014 | 1.37% | 84.4% |

- Blocks each part fired on (a block can fire more than one): (a) block total > 50,000: 381; (b) > 10x rolling +/-6-month office median: 25; (c) identical total 3+ consecutive months and > 3x office median: 92; office excluded entirely: 53.
- After v3: largest kept block total 32,237; 99th percentile of kept block totals 9,123.

- Assertions passed (vahan-vehicle-registrations-by-vehicle-category.csv): dropped Unakoti Dto (22 x 4,813), Saraikela-Kharsawan (12 x 9,091), Perambalur Rto (4 x 12,521), Jangareddygudem Rta (2 x 10,324); every Kachchh East, Narsipatnam Mvi Office and Salumbar Dto month kept; Pune, Indore Rto and Jaipur (First) Rto festive months kept.
- **Excluded office: M-S Nandan Fitness Testing Center (Rajasthan)**, all 53 months: its median block total is ~99,000 vehicles/month across all 53 months, implausible for a single fitness-testing centre; no month can be trusted, so the whole office is excluded. The v2 rule had kept 3 of its months (block totals 32,990, 14,541, 24,729).

### Blocks whose keep/drop decision changed from v2 to v3

Fuel-type file (EV = chargeable EVs in the block):

| State | Office | Month | Block total | EVs | Now | Why |
|---|---|---|---:|---:|---|---|
| Andhra Pradesh | Jaggayyapet Uo | 2022-01 | 3,354 | 74 | dropped | (b) > 10x rolling +/-6-month office median |
| Andhra Pradesh | Narsipatnam Mvi Office | 2023-09 | 781 | 10 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 755 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2023-10 | 1,552 | 20 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 781 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2023-11 | 1,317 | 15 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 915 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2023-12 | 960 | 16 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 938 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2024-01 | 755 | 16 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 960 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2024-02 | 990 | 32 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 975 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2024-03 | 1,171 | 76 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 990 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2024-04 | 915 | 23 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 1,058 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2024-05 | 1,127 | 87 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 990 |
| Arunachal Pradesh | Lower Subansiri | 2019-02 | 537 | 0 | kept | kept: v2 limit was 10x whole-series median 49; rolling median 92 |
| Arunachal Pradesh | Yupia | 2019-11 | 1,239 | 0 | kept | kept: v2 limit was 10x whole-series median 112; rolling median 462 |
| Arunachal Pradesh | Yupia | 2019-12 | 3,159 | 0 | kept | kept: v2 limit was 10x whole-series median 112; rolling median 428 |
| Arunachal Pradesh | Yupia | 2020-01 | 2,666 | 0 | kept | kept: v2 limit was 10x whole-series median 112; rolling median 413 |
| Gujarat | Kachchh East | 2023-08 | 2,713 | 60 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 2,683 |
| Gujarat | Kachchh East | 2023-09 | 4,511 | 99 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 2,713 |
| Gujarat | Kachchh East | 2023-10 | 4,296 | 73 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,349 |
| Gujarat | Kachchh East | 2023-11 | 4,803 | 97 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,352 |
| Gujarat | Kachchh East | 2023-12 | 2,683 | 58 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,524 |
| Gujarat | Kachchh East | 2024-01 | 3,349 | 73 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,696 |
| Gujarat | Kachchh East | 2024-02 | 3,701 | 95 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,698 |
| Gujarat | Kachchh East | 2024-03 | 3,352 | 104 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,701 |
| Gujarat | Kachchh East | 2024-04 | 3,696 | 82 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,698 |
| Gujarat | Kachchh East | 2024-05 | 3,701 | 104 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,696 |
| Jharkhand | Sahebganj | 2019-01 | 9,091 | 24 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-02 | 9,091 | 24 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-03 | 9,091 | 24 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-04 | 9,091 | 24 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-05 | 9,091 | 24 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-06 | 9,091 | 24 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-07 | 9,091 | 24 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-08 | 9,091 | 24 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-09 | 9,091 | 24 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-10 | 9,091 | 24 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-11 | 9,091 | 24 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-12 | 9,091 | 24 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Ladakh | Leh Arto | 2022-05 | 843 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Ladakh | Leh Arto | 2022-06 | 843 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Ladakh | Leh Arto | 2022-07 | 843 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Manipur | Churachandpur | 2019-01 | 1,735 | 1 | kept | kept: v2 limit was 10x whole-series median 62; rolling median 202 |
| Punjab | Sdm Amritsar-2 | 2020-03 | 712 | 0 | kept | kept: v2 limit was 10x whole-series median 26; rolling median 151 |
| Punjab | Sdm Kalanaur | 2024-01 | 48 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Punjab | Sdm Kalanaur | 2024-02 | 48 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Punjab | Sdm Kalanaur | 2024-03 | 48 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | M-S Nandan Fitness Testing Center | 2020-04 | 32,990 | 23 | dropped | office excluded entirely |
| Rajasthan | M-S Nandan Fitness Testing Center | 2020-05 | 14,541 | 31 | dropped | office excluded entirely |
| Rajasthan | M-S Nandan Fitness Testing Center | 2021-05 | 24,729 | 67 | dropped | office excluded entirely |
| Rajasthan | Pipar City Dto | 2023-11 | 1,396 | 40 | kept | kept: v2 limit was 10x whole-series median 124; rolling median 536 |
| Rajasthan | Pokhran Dto | 2022-11 | 2,175 | 3 | kept | kept: v2 limit was 10x whole-series median 108; rolling median 391 |
| Rajasthan | Pokhran Dto | 2023-12 | 1,158 | 5 | kept | kept: v2 limit was 10x whole-series median 108; rolling median 478 |
| Rajasthan | Salumbar Dto | 2023-08 | 501 | 3 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 501 |
| Rajasthan | Salumbar Dto | 2023-09 | 502 | 4 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 502 |
| Rajasthan | Salumbar Dto | 2023-10 | 842 | 7 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 502 |
| Rajasthan | Salumbar Dto | 2023-11 | 1,258 | 6 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 506 |
| Rajasthan | Salumbar Dto | 2023-12 | 1,007 | 4 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 528 |
| Rajasthan | Salumbar Dto | 2024-01 | 651 | 2 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 551 |
| Rajasthan | Salumbar Dto | 2024-02 | 506 | 7 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 601 |
| Rajasthan | Salumbar Dto | 2024-03 | 846 | 12 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 651 |
| Rajasthan | Salumbar Dto | 2024-05 | 551 | 6 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 651 |
| Rajasthan | Sirohi Dto | 2020-01 | 7,701 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-02 | 7,701 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-03 | 7,701 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-04 | 7,701 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-05 | 7,701 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-06 | 7,701 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-07 | 7,701 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-08 | 7,701 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-09 | 7,701 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-10 | 7,701 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-11 | 7,701 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-12 | 7,701 | 0 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-01 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-02 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-03 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-04 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-05 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-06 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-07 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-08 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-09 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-10 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-11 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-12 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-01 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-02 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-03 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-04 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-05 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-06 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-07 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-08 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-09 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-10 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-11 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-12 | 7,802 | 89 | dropped | (c) identical total 3+ consecutive months and > 3x office median |

Vehicle-category file: 93 changed blocks (no fuel split, so no EV count):

| State | Office | Month | Block total | Now | Why |
|---|---|---|---:|---|---|
| Andhra Pradesh | Narsipatnam Mvi Office | 2023-09 | 781 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 755 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2023-10 | 1,552 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 781 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2023-11 | 1,317 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 915 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2023-12 | 960 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 938 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2024-01 | 755 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 960 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2024-02 | 990 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 975 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2024-03 | 1,171 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 990 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2024-04 | 915 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 1,058 |
| Andhra Pradesh | Narsipatnam Mvi Office | 2024-05 | 1,127 | kept | kept: v2 limit was 10x whole-series median 74; rolling median 990 |
| Arunachal Pradesh | Lower Subansiri | 2019-02 | 537 | kept | kept: v2 limit was 10x whole-series median 49; rolling median 92 |
| Arunachal Pradesh | Yupia | 2019-11 | 1,239 | kept | kept: v2 limit was 10x whole-series median 112; rolling median 462 |
| Arunachal Pradesh | Yupia | 2019-12 | 3,159 | kept | kept: v2 limit was 10x whole-series median 112; rolling median 428 |
| Arunachal Pradesh | Yupia | 2020-01 | 2,666 | kept | kept: v2 limit was 10x whole-series median 112; rolling median 413 |
| Gujarat | Kachchh East | 2023-08 | 2,713 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 2,683 |
| Gujarat | Kachchh East | 2023-09 | 4,511 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 2,713 |
| Gujarat | Kachchh East | 2023-10 | 4,296 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,349 |
| Gujarat | Kachchh East | 2023-11 | 4,803 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,352 |
| Gujarat | Kachchh East | 2023-12 | 2,683 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,524 |
| Gujarat | Kachchh East | 2024-01 | 3,349 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,696 |
| Gujarat | Kachchh East | 2024-02 | 3,701 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,698 |
| Gujarat | Kachchh East | 2024-03 | 3,352 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,701 |
| Gujarat | Kachchh East | 2024-04 | 3,696 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,698 |
| Gujarat | Kachchh East | 2024-05 | 3,701 | kept | kept: v2 limit was 10x whole-series median 160; rolling median 3,696 |
| Jharkhand | Sahebganj | 2019-01 | 9,091 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-02 | 9,091 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-03 | 9,091 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-04 | 9,091 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-05 | 9,091 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-06 | 9,091 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-07 | 9,091 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-08 | 9,091 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-09 | 9,091 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-10 | 9,091 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-11 | 9,091 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Jharkhand | Sahebganj | 2019-12 | 9,091 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Ladakh | Leh Arto | 2022-05 | 843 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Ladakh | Leh Arto | 2022-06 | 843 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Ladakh | Leh Arto | 2022-07 | 843 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Punjab | Sdm Amritsar-2 | 2020-03 | 712 | kept | kept: v2 limit was 10x whole-series median 26; rolling median 151 |
| Punjab | Sdm Kalanaur | 2024-01 | 48 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Punjab | Sdm Kalanaur | 2024-02 | 48 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Punjab | Sdm Kalanaur | 2024-03 | 48 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | M-S Nandan Fitness Testing Center | 2020-04 | 32,990 | dropped | office excluded entirely |
| Rajasthan | M-S Nandan Fitness Testing Center | 2020-05 | 14,541 | dropped | office excluded entirely |
| Rajasthan | M-S Nandan Fitness Testing Center | 2021-05 | 24,729 | dropped | office excluded entirely |
| Rajasthan | Pipar City Dto | 2023-11 | 1,395 | kept | kept: v2 limit was 10x whole-series median 124; rolling median 513 |
| Rajasthan | Pokhran Dto | 2022-11 | 2,169 | kept | kept: v2 limit was 10x whole-series median 108; rolling median 391 |
| Rajasthan | Pokhran Dto | 2023-12 | 1,158 | kept | kept: v2 limit was 10x whole-series median 108; rolling median 478 |
| Rajasthan | Salumbar Dto | 2023-08 | 501 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 501 |
| Rajasthan | Salumbar Dto | 2023-09 | 502 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 502 |
| Rajasthan | Salumbar Dto | 2023-10 | 842 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 502 |
| Rajasthan | Salumbar Dto | 2023-11 | 1,258 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 506 |
| Rajasthan | Salumbar Dto | 2023-12 | 1,007 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 528 |
| Rajasthan | Salumbar Dto | 2024-01 | 651 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 551 |
| Rajasthan | Salumbar Dto | 2024-02 | 506 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 601 |
| Rajasthan | Salumbar Dto | 2024-03 | 846 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 651 |
| Rajasthan | Salumbar Dto | 2024-05 | 551 | kept | kept: v2 limit was 10x whole-series median 24; rolling median 651 |
| Rajasthan | Sirohi Dto | 2020-01 | 7,701 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-02 | 7,701 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-03 | 7,701 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-04 | 7,701 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-05 | 7,701 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-06 | 7,701 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-07 | 7,701 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-08 | 7,701 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-09 | 7,701 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-10 | 7,701 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-11 | 7,701 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Rajasthan | Sirohi Dto | 2020-12 | 7,701 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-01 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-02 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-03 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-04 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-05 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-06 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-07 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-08 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-09 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-10 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-11 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haldwani Rto | 2019-12 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-01 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-02 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-03 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-04 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-05 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-06 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-07 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-08 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-09 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-10 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-11 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |
| Uttarakhand | Haridwar Arto | 2019-12 | 7,802 | dropped | (c) identical total 3+ consecutive months and > 3x office median |

### Ambiguous single-month spikes (decision and reason)

- **Cachar (Assam) 2022-01: DROPPED.** Block total 23,582, 1,932 EVs; 12.9x its rolling median of 1,834 (neighbouring months: 1,834, 1,996, 1,996, 1,901, 1,901, 2,024). Every fuel column is inflated by a similar factor in one isolated month, the same signature as the confirmed corrupted blocks, so rule (b) is applied as written.
- **Bhimavaram Rta (Andhra Pradesh) 2019-01: DROPPED.** Block total 21,779, 67 EVs; 11.9x its rolling median of 1,837 (neighbouring months: 1,837, 1,837, 1,837). Every fuel column is inflated by a similar factor in one isolated month, the same signature as the confirmed corrupted blocks, so rule (b) is applied as written.
- **Neemuch Dto (Madhya Pradesh) 2019-01: DROPPED.** Block total 19,086, 18 EVs; 10.8x its rolling median of 1,768 (neighbouring months: 2,153, 1,869, 802). Every fuel column is inflated by a similar factor in one isolated month, the same signature as the confirmed corrupted blocks, so rule (b) is applied as written.
- **Tarn Taran Sdm (Punjab) 2019-01: DROPPED.** Block total 14,882, 14 EVs; 13.6x its rolling median of 1,097 (neighbouring months: 1,144, 1,313, 1,097). Every fuel column is inflated by a similar factor in one isolated month, the same signature as the confirmed corrupted blocks, so rule (b) is applied as written.
- **Jangareddy Gudem Uo (Andhra Pradesh) 2019-01: DROPPED.** Block total 12,139, 9 EVs; 11.5x its rolling median of 1,059 (neighbouring months: 1,059, 1,053, 1,191). Every fuel column is inflated by a similar factor in one isolated month, the same signature as the confirmed corrupted blocks, so rule (b) is applied as written.
- **Vellarikundu Srto (Kerala) 2019-01: DROPPED.** Block total 3,136, 0 EVs; 11.2x its rolling median of 279 (neighbouring months: 276, 388, 142). Every fuel column is inflated by a similar factor in one isolated month, the same signature as the confirmed corrupted blocks, so rule (b) is applied as written.
- **Churachandpur (Manipur) 2019-01: KEPT.** Block total 1,735, 1 EVs; 8.6x its rolling median of 202 (neighbouring months: 193, 202, 96). Same one-month signature, but it is below the 10x threshold, so the rule keeps it; it is not special-cased.
- The Jan 2019 cases share a pattern: Jan 2019 is the first month of the extract, and a handful of offices show a one-off month about 10x their following months. The source does not say why (a posting backlog is one possibility, not confirmed). Either way the month does not represent that office's January demand.

- Kept rows after v3: fuel-type 412,947; vehicle-category 576,253.
- National all-fuel monthly totals after v3 (fuel-type file) range from 251,264 (2020-05) to 2,886,936 (2023-11).
- Arunachal Pradesh chargeable EVs, whole window: 3,013,603 with no outlier rule, 44 after v3.

### Chargeable-EV breakdown by fuel tag (fuel-type file, after v3, 2019-01 to 2024-05)

| Fuel tag | In scope | Rows | Registrations | Share of chargeable EV |
|---|---|---:|---:|---:|
| Electric(Bov) | yes | 54,782 | 3,929,982 | 99.43% |
| Pure Ev | yes | 1,456 | 22,339 | 0.57% |
| Plug-In Hybrid Ev | yes | 1 | 1 | 0.00% |
| Strong Hybrid Ev | no (excluded) | 1,463 | 8,283 | n/a |
| **Chargeable EV total** | | | **3,952,322** | 100% |

### Charging station file (OperationalPC.csv)
- 34 states/UTs, 12,146 operational public chargers nationally.
- Provenance: this file ships with no header metadata, no explicit collection date, and no source citation. Traced via the Kaggle dataset it was extracted from -- 'Detailed India EV Market Data 2001-2024' by Sai Raam (srinrealyf), Apache 2.0 license -- whose description states the charger figures were compiled by scraping the government's Vahan4 dashboard. This is a secondary/echoed source, not the primary portal, and its own vintage is '~2024' with no finer date. Treated as a same-period snapshot alongside the 2024-05-capped registration data, and labelled as such (not as a precisely-dated figure).
- The file counts public charging points only. It has no AC/DC split, no power rating, no utilisation and no RTO-level location.
- Known gap: Ladakh and Mizoram have no entry in this file (present in the Vahan registration data, absent here) -- there is no charger-count denominator for those two, shown as an explicit gap rather than a zero.

### National FY aggregate (india-vahan-registrations-by-vehicle-category-and-fuel-fy2011-fy2025.csv)
- 435 rows, national totals only (GEO=IND), FY2011 through FY2025.
- EV rows are FUEL_TYPE='EV'. The file does not say which Vahan fuel tags 'EV' contains, so it cannot be confirmed that it matches the chargeable-EV definition exactly.
- Runs past the 2024-05 cutoff used everywhere else. Used only in the clearly labelled national context view and as a national reference split, never blended into any state/RTO figure.
- MODE -> vehicle group mapping used for the national context view: 2W -> 2W; 3W Goods -> 3W; 3W Passenger -> 3W; Bus -> Commercial; Cars -> Cars/LMV; HGV (>12 tonnes) -> Commercial; LGV (up to 7/5 tonnes) -> Commercial; MGV (7.5-12 tonnes) -> Commercial; Others -> Other.

### fuel-state.csv (TDC aggregate, fuel x state)
- Title row: "Fuel and State Wise Data for All State (2019-2026)". Parsed after replacing the literal '\n' in the title row.
- Cumulative totals with no monthly breakdown. End month: end month not stated in source.
- 36 states/UTs. Chargeable EV per state = ELECTRIC(BOV) + PURE EV + PLUG-IN HYBRID EV; STRONG HYBRID EV excluded. National sum: 10,071,759.
- Used as the '2019 to 2026' demand option in the gap ranking, and as the only demand figure for Telangana and Lakshadweep.

### category-fuel.csv (TDC aggregate, vehicle category x fuel)
- Title row: "Vehicle Category and Fuel Data for All State (2019-2026)". National totals only, cumulative, no monthly breakdown. End month: end month not stated in source.
- Used only as the second national EV-by-vehicle-type split (chargeable-EV tags, grouped with the same class mapping as the state fleet mix).
- Chargeable EV by Vahan class: TWO WHEELER(NT)=5,794,080; THREE WHEELER(T)=3,460,315; LIGHT MOTOR VEHICLE=652,059; TWO WHEELER(T)=48,847; LIGHT PASSENGER VEHICLE=42,469; LIGHT GOODS VEHICLE=40,297; HEAVY PASSENGER VEHICLE=19,777; OTHER THAN MENTIONED ABOVE=6,326; HEAVY GOODS VEHICLE=2,864; THREE WHEELER(NT)=2,859; MEDIUM PASSENGER VEHICLE=911; TWO WHEELER (Invalid Carriage)=643; FOUR WHEELER (Invalid Carriage)=261; MEDIUM MOTOR VEHICLE=27; HEAVY MOTOR VEHICLE=16; MEDIUM GOODS VEHICLE=6; THREE WHEELER (Invalid Carriage)=2.

### fuel-rto.csv -- excluded from the dashboard
- After fixing the same literal-\n title-row issue, this file's header collapses to just 'Fuel,Total' -- the RTO name columns are missing from the header, even though each data row has dozens of extra unlabelled values after 'Total'. Those numbers cannot be attributed to an RTO, so the file is not used. RTO-level demand comes from the office_name/office_code columns of the granular fuel-type file.

### Vehicle-category grouping (state fleet mix, all fuels)
- Mapping applied (case-insensitive): Four Wheeler (Invalid Carriage) -> Cars/LMV; Heavy Goods Vehicle -> Commercial; Heavy Motor Vehicle -> Commercial; Heavy Passenger Vehicle -> Commercial; Light Goods Vehicle -> Commercial; Light Motor Vehicle -> Cars/LMV; Light Passenger Vehicle -> Cars/LMV; Medium Goods Vehicle -> Commercial; Medium Motor Vehicle -> Commercial; Medium Passenger Vehicle -> Commercial; Other Than Mentioned Above -> Other; Three Wheeler(Nt) -> 3W; Three Wheeler(T) -> 3W; Two Wheeler (Invalid Carriage) -> 2W; Two Wheeler(Nt) -> 2W; Two Wheeler(T) -> 2W.
- 'Three Wheeler (Invalid Carriage)' does not occur in the granular file; it occurs only in category-fuel.csv and is grouped with 3W there (assumption, by analogy with the 2W and 4W invalid-carriage classes).
- The state mix is the WHOLE registered fleet (all fuels), because the granular vehicle-category file has no fuel split. It is not an EV-only mix.

### Two national EV-by-vehicle-type splits (kept side by side; they disagree)

| Group | FY file, FY2025 | Share | category-fuel.csv, 2019-2026 cumulative | Share |
|---|---:|---:|---:|---:|
| 2W | 1,209,658 | 80.8% | 5,843,570 | 58.0% |
| 3W | 163,310 | 10.9% | 3,463,176 | 34.4% |
| Cars/LMV | 115,315 | 7.7% | 694,789 | 6.9% |
| Commercial | 9,137 | 0.6% | 63,898 | 0.6% |
| Other | 376 | 0.0% | 6,326 | 0.1% |
| Total | 1,497,796 | | 10,071,759 | |

- Different windows (one year vs a multi-year cumulative), different EV definitions (the FY file's 'EV' is not documented; category-fuel uses the three chargeable tags) and different class groupings mean neither can be reconciled with the other from these files. Both are shown; neither is treated as correct.

### state_summary.csv
- One row per state/UT appearing in any source: 36 rows.
- ev_cum_aligned: chargeable EVs 2019-01 to 2024-05 from the granular fuel-type file. ev_cum_2019_2026: ELECTRIC(BOV) + PURE EV + PLUG-IN HYBRID EV from fuel-state.csv.
- growth_pct = (last 12m - prior 12m) / prior 12m. data_flag is the first that applies of: no_granular_demand, no_charger_data, small_base (prior 12m < 500), ok. data_flags lists EVERY flag that applies, separated by '|'.
- Values that cannot be computed are left blank, never 0.
- primary no_charger_data: 2 (Ladakh, Mizoram)
- primary no_granular_demand: 2 (Lakshadweep, Telangana)
- primary ok: 26 (Andhra Pradesh, Assam, Bihar, Chandigarh, Chhattisgarh, Delhi, Goa, Gujarat, Haryana, Himachal Pradesh, Jammu and Kashmir, Jharkhand, Karnataka, Kerala, Madhya Pradesh, Maharashtra, Manipur, Odisha, Puducherry, Punjab, Rajasthan, Tamil Nadu, Tripura, Uttar Pradesh, Uttarakhand, West Bengal)
- primary small_base: 6 (Andaman & Nicobar Islands, Arunachal Pradesh, Dadra and Nagar Haveli and Daman and Diu, Meghalaya, Nagaland, Sikkim)
- States with more than one flag: Ladakh (no_charger_data + small_base), Mizoram (no_charger_data + small_base)
- All-India EVs per charger is computed only over states with both a demand figure and a charger count (aligned window: 32 states; excludes Ladakh; Lakshadweep; Mizoram; Telangana).

### Known coverage gaps (carried into the dashboard, not hidden)
- **Telangana**: zero rows in either granular Vahan file for the entire window -- a reporting gap, not zero demand. Present in fuel-state.csv (352,175 chargeable EVs, 2019-2026) and in the charging-station file (481 chargers).
- **Lakshadweep**: same demand-side gap; present in fuel-state.csv (144) and the charging-station file (1 charger).
- **Ladakh, Mizoram**: present in demand data, absent from the charging-station file -- no denominator for EVs per charger.
- Registrations are recorded at the owner's RTO, not where the vehicle charges.

### FY file vs granular Vahan (complete financial years in the granular window)

| FY | FY-file EV total | Vahan chargeable EVs (granular, cleaned) | FY file / Vahan |
|---|---:|---:|---:|
| FY2020 | 33,759 | 174,228 | 0.194 |
| FY2021 | 58,343 | 146,746 | 0.398 |
| FY2022 | 315,211 | 462,694 | 0.681 |
| FY2023 | 872,029 | 1,187,021 | 0.735 |
| FY2024 | 1,223,122 | 1,684,158 | 0.726 |

- The FY file counts fewer EVs than the cleaned Vahan registrations in every complete year, and it does not state which fuel tags it counts as EV. It is used for the long-run shape and the mode split only; the headline FY2020 to FY2024 growth on the page is computed from Vahan.

