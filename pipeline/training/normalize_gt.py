"""
Ground Truth name normalization.

Maps each GT entry's ActionGeo_FullName to its standard GDELT FullName
(as it appears in the filtered, monitored-country conflict-coded subset).

Tiers (in order):
  1. name_exact     — after casefold/strip/no-separators, exact match in GDELT
  2. featureid_geo  — GDELT events within radius_km of GT lat/lon; use dominant FeatureID
  3. geo_unique     — single dominant GDELT city within radius_km (≥60% of local mentions)
  4. AMBIGUOUS      — multiple candidates no clear winner → drop
  5. NOT_IN_GDELT   — no GDELT presence in radius → D tier

Outputs:
  - data/review/ground_truth_normalized/*.csv  (per-date, dropped ambiguous rows,
                                                + standard_name, match_type, confidence columns)
  - data/review/ground_truth_report.csv         (report: every GT entry's fate)

Pipeline integration:
  From now on, evaluator / tier_assigner / trainer should read the normalized GT.
"""
from pathlib import Path
import re
import numpy as np
import pandas as pd

# --- Config ---
ROOT = Path(__file__).resolve().parent.parent
GT_IN_DIR  = ROOT / "data" / "ground_truth"
GT_OUT_DIR = ROOT / "data" / "review" / "ground_truth_normalized"
REPORT_PATH = ROOT / "data" / "review" / "ground_truth_report.csv"
GDELT_PATH = ROOT / "data" / "gdelt_main_2026.parquet"

RADIUS_KM = 50.0
GEO_DOMINANCE = 0.60   # dominant city must hold ≥60% of mentions in radius

from pipeline.config import CONFIRMED_CODES, MONITORED_COUNTRIES, CITY_BLACKLIST
from pipeline.preprocess import apply_name_map


def _norm_str(s: str) -> str:
    """비교용: 소문자화, strip, 하이픈/아포스트로피/공백 제거."""
    if not isinstance(s, str):
        return ""
    s = s.lower().strip()
    s = re.sub(r"[\s\-'’]+", "", s)
    return s


def _haversine(lat1, lon1, lat2, lon2):
    p = np.pi / 180
    a = (0.5 - np.cos((lat2 - lat1) * p) / 2
         + np.cos(lat1 * p) * np.cos(lat2 * p) * (1 - np.cos((lon2 - lon1) * p)) / 2)
    return 12742 * np.arcsin(np.sqrt(a))


def load_filtered_gdelt():
    raw = pd.read_parquet(GDELT_PATH)
    raw = raw[raw["EventCode"].astype(int).isin(CONFIRMED_CODES)]
    raw = raw[raw["ActionGeo_CountryCode"].isin(MONITORED_COUNTRIES)]
    raw = raw[raw["ActionGeo_Type"] == 4]
    raw = raw.dropna(subset=["ActionGeo_FullName", "ActionGeo_Lat", "ActionGeo_Long"])
    # GeoNames 기반 name map 적용 (Bay Of Haifa → Haifa 등)
    raw = apply_name_map(raw)
    # Blacklist 도시명 제거 (Hebron, Gaza, 조직명 등)
    raw = raw[~raw["ActionGeo_FullName"].isin(CITY_BLACKLIST)]
    raw["norm"] = raw["ActionGeo_FullName"].apply(_norm_str)
    return raw


def build_indices(gdelt):
    """lookup 사전 계산:
       norm → 표준 FullName (여러 표기 시 NumMentions 최다 변형 선택)
       도시별 총 mentions (지리적 우세 판정용)
    """
    # 표준 이름: 각 norm 키에 대해 NumMentions 합이 최대인 FullName 선택
    grp = gdelt.groupby(["norm", "ActionGeo_FullName"])["NumMentions"].sum().reset_index()
    norm_to_name = (grp.sort_values("NumMentions", ascending=False)
                        .drop_duplicates("norm")
                        .set_index("norm")["ActionGeo_FullName"].to_dict())
    return norm_to_name


def match_gt_entry(gt_row, gdelt, norm_to_name):
    """dict 반환: {standard_name, match_type, confidence, candidate_info}"""
    gt_name_norm = _norm_str(gt_row["city"])
    lat, lon = gt_row["lat"], gt_row["lon"]

    # 1) Exact norm match
    if gt_name_norm and gt_name_norm in norm_to_name:
        return {
            "standard_name": norm_to_name[gt_name_norm],
            "match_type": "name_exact",
            "confidence": 1.0,
            "note": "",
        }

    # 2 & 3) Geo-based: find GDELT entries within radius
    if pd.isna(lat) or pd.isna(lon):
        return {"standard_name": None, "match_type": "no_coords", "confidence": 0.0, "note": ""}

    # 공간 pre-filter (bbox ~0.6° ≈ 적도 기준 66km, 여유 두고 0.7°)
    bb = gdelt[
        gdelt["ActionGeo_Lat"].between(lat - 0.7, lat + 0.7) &
        gdelt["ActionGeo_Long"].between(lon - 0.7, lon + 0.7)
    ].copy()
    if bb.empty:
        return {"standard_name": None, "match_type": "not_in_gdelt",
                "confidence": 0.0, "note": "no events in bbox"}
    bb["dist"] = _haversine(lat, lon, bb["ActionGeo_Lat"].values, bb["ActionGeo_Long"].values)
    near = bb[bb["dist"] <= RADIUS_KM]
    if near.empty:
        return {"standard_name": None, "match_type": "not_in_gdelt",
                "confidence": 0.0, "note": f"no events in {RADIUS_KM}km"}

    # 표준 도시별 mention 합산
    city_tot = (near.groupby("ActionGeo_FullName")["NumMentions"].sum()
                    .sort_values(ascending=False))
    total = city_tot.sum()
    top_city = city_tot.index[0]
    top_frac = city_tot.iloc[0] / total

    # 2) FeatureID / dominant city match
    if top_frac >= GEO_DOMINANCE:
        return {
            "standard_name": top_city,
            "match_type": "geo_dominant",
            "confidence": float(top_frac),
            "note": f"{len(city_tot)} cities in radius, top '{top_city}' holds {top_frac:.0%}",
        }

    # Ambiguous — drop
    return {
        "standard_name": None,
        "match_type": "ambiguous",
        "confidence": float(top_frac),
        "note": f"candidates: {city_tot.head(3).to_dict()}",
    }


def main():
    print(f"[1/4] Loading filtered GDELT from {GDELT_PATH.name}...")
    gdelt = load_filtered_gdelt()
    print(f"      {len(gdelt):,} rows, {gdelt['ActionGeo_FullName'].nunique():,} unique cities")

    print("[2/4] Building norm → standard-name index...")
    norm_to_name = build_indices(gdelt)
    print(f"      {len(norm_to_name):,} norm keys")

    print("[3/4] Processing GT files...")
    GT_OUT_DIR.mkdir(exist_ok=True)
    report = []
    kept = dropped_amb = dropped_d = 0

    for fp in sorted(GT_IN_DIR.glob("*.csv")):
        date = fp.stem
        gt = pd.read_csv(fp)
        # rename GT columns to standard form
        gt = gt.rename(columns={"ActionGeo_FullName": "city", "Lat": "lat", "Long": "lon"})
        out_rows = []
        for _, r in gt.iterrows():
            m = match_gt_entry(r, gdelt, norm_to_name)
            report.append({
                "date": date,
                "gt_city": r["city"],
                "gt_lat": r["lat"],
                "gt_lon": r["lon"],
                **m,
            })
            if m["standard_name"] is not None:
                out_rows.append({
                    **r.to_dict(),
                    "standard_name": m["standard_name"],
                    "match_type": m["match_type"],
                    "confidence": m["confidence"],
                })
                kept += 1
            elif m["match_type"] == "ambiguous":
                dropped_amb += 1
            else:
                dropped_d += 1

        if out_rows:
            out_df = pd.DataFrame(out_rows)
            # GDELT 원본 컬럼 유지, standard_name 추가
            out_df.to_csv(GT_OUT_DIR / fp.name, index=False)

    report_df = pd.DataFrame(report)
    report_df.to_csv(REPORT_PATH, index=False)

    print("\n" + "=" * 60)
    print(f"[4/4] Summary")
    print("=" * 60)
    print(f"  Total GT entries:      {len(report_df)}")
    print(f"  Kept (matched):        {kept}")
    print(f"  Dropped (ambiguous):   {dropped_amb}")
    print(f"  D tier (not in GDELT): {dropped_d}")
    print()
    print("Match type breakdown:")
    print(report_df["match_type"].value_counts().to_string())
    print()
    print(f"Normalized GT:  {GT_OUT_DIR}/")
    print(f"Report log:     {REPORT_PATH}")


if __name__ == "__main__":
    main()
