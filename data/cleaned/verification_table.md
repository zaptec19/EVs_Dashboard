# Verification table (printed by clean_ev_data.py)

## National totals, v2 rule (before) vs v3 rule (after)

| Measure | Before (v2) | After (v3) | Change |
|---|---:|---:|---:|
| Chargeable EVs, fuel-type file | 3,953,701 | 3,952,322 | -1,379 |
| All-fuel registrations, fuel-type file | 117,895,351 | 117,496,126 | -399,225 |
| All registrations, vehicle-category file | 117,898,190 | 117,500,577 | -397,613 |

| Rule | File | Blocks dropped | Rows dropped | % rows | % naive volume |
|---|---|---:|---:|---:|---:|
| v2 | fuel-type | 521 | 5,288 | 1.26% | 84.7% |
| v3 | fuel-type | 542 | 5,425 | 1.30% | 84.8% |
| v2 | vehicle-category | 522 | 7,698 | 1.32% | 84.4% |
| v3 | vehicle-category | 543 | 8,014 | 1.37% | 84.4% |

## Large RTOs, v2 vs v3 (whole window 2019-01 to 2024-05, fuel-type file)

| RTO | All-fuel before | All-fuel after | Chargeable EV before | Chargeable EV after |
|---|---:|---:|---:|---:|
| Pune (Maharashtra) | 1,231,321 | 1,231,321 | 82,818 | 82,818 |
| Indore Rto (Madhya Pradesh) | 817,022 | 817,022 | 32,518 | 32,518 |
| Jaipur (First) Rto (Rajasthan) | 851,090 | 851,090 | 47,925 | 47,925 |

## Top 10 states by EVs per public charger (aligned window 2019-01 to 2024-05)

| Rank | State | EVs (aligned) | Chargers | EVs per charger | Growth % (last 12m vs prior) | All flags |
|---:|---|---:|---:|---:|---:|---|
| 1 | Bihar | 233,887 | 124 | 1886.2 | 47.1% | ok |
| 2 | Assam | 159,718 | 86 | 1857.2 | 31.5% | ok |
| 3 | Uttar Pradesh | 728,857 | 582 | 1252.3 | 51.7% | ok |
| 4 | Tripura | 19,942 | 18 | 1107.9 | 62.3% | ok |
| 5 | Chandigarh | 13,213 | 12 | 1101.1 | 43.9% | ok |
| 6 | Odisha | 135,213 | 198 | 682.9 | 42.9% | ok |
| 7 | Uttarakhand | 51,566 | 76 | 678.5 | -0.5% | ok |
| 8 | Chhattisgarh | 87,297 | 149 | 585.9 | 36.9% | ok |
| 9 | Dadra and Nagar Haveli and Daman and Diu | 524 | 1 | 524.0 | 60.9% | small_base |
| 10 | Rajasthan | 249,582 | 500 | 499.2 | 5.2% | ok |
| | **All India** (32 states with both figures) | | | 338.8 | 27.5% | |

## Blocks whose decision changed, v2 -> v3 (fuel-type file: 95; vehicle-category file: 93)

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

Excluded office M-S Nandan Fitness Testing Center (Rajasthan): 53 months; EVs removed vs v2 121; EVs in all its raw months 242,942.

## FY file vs granular Vahan, complete financial years in the granular window

| FY | FY-file EV total | Vahan chargeable-EV total (granular, cleaned) | FY file / Vahan |
|---|---:|---:|---:|
| FY2020 | 33,759 | 174,228 | 0.194 |
| FY2021 | 58,343 | 146,746 | 0.398 |
| FY2022 | 315,211 | 462,694 | 0.681 |
| FY2023 | 872,029 | 1,187,021 | 0.735 |
| FY2024 | 1,223,122 | 1,684,158 | 0.726 |

## National EV split by vehicle group, two sources

| Group | FY file FY2025 | category-fuel.csv 2019-2026 |
|---|---:|---:|
| 2W | 80.76% (1,209,658) | 58.02% (5,843,570) |
| 3W | 10.90% (163,310) | 34.39% (3,463,176) |
| Cars/LMV | 7.70% (115,315) | 6.90% (694,789) |
| Commercial | 0.61% (9,137) | 0.63% (63,898) |
| Other | 0.03% (376) | 0.06% (6,326) |

