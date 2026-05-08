# 🛰️ Global Event-Based Satellite Scheduling Dashboard

> **Automating satellite tasking decisions in conflict zones — from 5 hours to under 10 minutes.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-86%25-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square)](https://satellite-dashboard-sigma.vercel.app)

**Live Demo → [satellite-dashboard-sigma.vercel.app](https://satellite-dashboard-sigma.vercel.app)**

---

## Screenshots

![Dashboard Overview](https://github.com/user-attachments/assets/279075cc-e399-4ba8-8dfe-2f8ad84860a3)
*3-panel layout: 24h satellite timeline | conflict map | city detail with LLM summary & scheduling*

![Middle East Conflict Map](https://github.com/user-attachments/assets/6b792258-0a46-4c3b-86dc-e5165032cd88)
*Real-time risk markers across 12 monitored countries — 🔴 RED (z ≥ 5) | 🟠 ORANGE (z ≥ 2) | 🟡 YELLOW (z ≥ 0.5)*

---

## Overview

When military events occur in conflict zones, physical evidence — strike marks, equipment positions — disappears fast through concealment and debris removal. This short window is called the **golden time**. Missing it means losing critical intelligence.

Traditional satellite tasking required analysts to manually monitor OSINT feeds, check orbital passes, verify weather conditions, and issue capture orders — a process that routinely took **5+ hours**.

This system automates the entire pipeline into **under 10 minutes**.

---

## How It Works

The pipeline takes GDELT global event data and produces actionable satellite tasking candidates through 7 automated stages:

```
GDELT Events → Preprocessing → City Standardization → Conflict Index
    → Kalman Filter (Anomaly Detection) → LLM Verification
    → Satellite Scheduling → Analyst Dashboard
```

### 1. Data Preprocessing
- Ingests GDELT v1.0 daily event data (~2.1GB, ~2.7M rows per 32-day period)
- Uses **DuckDB** for memory-efficient SQL processing — reduces dataset from 2,118MB to 1,212MB
- Filters to 27 physical conflict CAMEO codes (19.1% of events) — increases Recall by 27.3pp vs. no filter

### 2. City Name Standardization
- Merges fragmented signals: "Haifa", "University of Haifa", "Bay of Haifa" → single time series
- Separates homonyms: Najaf (Iraq) ≠ Najaf (Iran) using country/admin-level suffixes
- Corrects GDELT geocoding errors >50km offset for verified cities

### 3. Kalman Filter — Anomaly Detection
- Runs a per-city 1D Kalman filter across 1,100+ cities simultaneously
- Standardized innovation z-score (`ν̃ = ν/√S`) makes cities **directly comparable** regardless of baseline activity
- Tehran (avg daily conflict index: 280) and a small border town can both trigger alerts at the same z-score threshold
- Outperforms ARIMA: **AUC 0.762 vs. 0.620** on same data/ground truth (ARIMA limited to 286 cities; Kalman covers all 1,115)

### 4. LLM Verification
- Top 20 anomalous cities per day are verified by **Gemini Flash-lite** reading actual article bodies
- Parallel scraping: ~400 pages/day processed via two-layer ThreadPoolExecutor
- **LLM Precision: 0.775 (train) / 0.765 (test)** — ~3 in 4 flagged cities confirmed as genuine conflict
- Labels: `SUCCESS` / `AMBIGUOUS` → passed to scheduling; `DATE_MISMATCH` / `DROPPED` → filtered

### 5. Satellite Scheduling
- Propagates orbital passes for **95 satellites** (SpaceEye-T, KOMPSAT-7, PlanetScope ×60, ICEYE ×26, Sentinel) using **Skyfield SGP4**
- Combines orbital data with **Open-Meteo** cloud cover + sunrise/sunset via **Astral**
- Filters passes with off-nadir angle >30° (operationally infeasible)
- Surfaces top 3 candidates per city within 7-day window; separate tracks for SpaceEye-T and PlanetScope

---

## Results (32-Day Backtest: Feb 28 – Mar 31, 2026)

| Metric | Train (22 days) | Test (10 days) |
|--------|----------------|----------------|
| Recall — A-tier cities (major conflict hubs) | **0.763** | **0.732** |
| Recall — C-tier cities (small outposts) | 0.321 | 0.267 |
| LLM Precision | 0.775 | 0.765 |
| Avg. cities surfaced per day | 13–15 | 13–15 |
| Manual workflow time | ~5 hours | → |
| Automated pipeline time | **< 10 minutes** | ← |

> Note: Theoretical Recall ceiling is ~0.87 — 12.9% of ground truth cities never appear in GDELT's English-language corpus.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Map** | Mapbox GL JS |
| **Geospatial Indexing** | H3 (Hexagonal Hierarchical) |
| **Database** | DuckDB, Supabase |
| **Event Data** | GDELT Project |
| **Orbital Propagation** | Skyfield SGP4 |
| **Weather** | Open-Meteo API |
| **LLM Verification** | Gemini Flash-lite |
| **Deployment** | Vercel |

---

## Dashboard Features

- **3-panel layout**: 24-hour satellite timeline | Global map with risk markers | City detail panel
- **30-day trend charts** per city — distinguishes one-time spikes from sustained escalation
- **Korean one-line LLM summaries** for rapid analyst review
- **Capture approval workflow** — analysts confirm scheduling directly from the dashboard
- Color-coded risk levels: 🔴 RED (z ≥ 5) | 🟠 ORANGE (z ≥ 2) | 🟡 YELLOW (z ≥ 0.5)
- SpaceEye-T and PlanetScope surfaced as separate tracks alongside top-3 SAR candidates

---

## Getting Started

```bash
npm install
# Create .env.local with your Mapbox token:
# NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
npm run dev
```

---

## Project Context

Built as the capstone project for a data science bootcamp, in collaboration with **SIA (SI Analytics)**, a Korean defense/space analytics company. The scenario modeled Iran–US conflict monitoring across 12 Middle Eastern countries, using a catalog of 95 satellites including Korea's SpaceEye-T and KOMPSAT-7 assets.

**Team GOLDEN** — 3 members | March–May 2026

---

## Key Design Decisions

- **Why Kalman filter over ARIMA?** ADF/KPSS tests confirmed non-stationarity in key city time series (Tehran, Baghdad, Beirut). ARIMA assumes stationarity and requires per-city parameter estimation — infeasible at 1,100+ cities daily. Kalman requires no stationarity assumption and scales linearly.
- **Why `log(1 + NumSources)` as the sole input?** Multivariate GLM showed multicollinearity between NumSources and NumMentions (r=0.819), AvgTone was non-significant at city-day aggregation level, GoldsteinScale has near-zero variance within CONFIRMED_CODES. Single stable predictor outperformed complex feature sets.
- **Why sum instead of mean across events?** Averaging erases scale information — a city with 100 events and one with 1 event look the same. Summation preserves the signal that larger events generate more rows in GDELT.
