# Pipeline

GDELT 기반 분쟁 모니터링 + 위성 촬영 스케줄링 파이프라인.
이상치 탐지(Kalman) → LLM 검증(Gemini) → 위성·기상 결합 → 일일 산출물(JSON) 까지 한 번에 실행.

## 디렉터리 구성

```
pipeline/
├── config.py              · 모든 상수 (경로, COEFS, RISK_THRESHOLDS, SCALER 등)
├── cache.py               · SQLite 캐시 (스크랩 본문 + LLM 응답)
├── text_norm.py           · 도시명 정규화 헬퍼
├── city_utils.py          · GeoNames 표준명 매핑
│
├── gdelt_fetcher.py       · GDELT 일일 zip 다운로드 → parquet
├── preprocess.py          · clean_gdelt_data + apply_standard_scaling
│
├── kalman_filter.py       · 1D Kalman → 표준화 innovation z-score → top-K 이상치
├── llm_verification.py    · Gemini로 기사 본문 기반 분쟁 사실 검증 (캐시 hit)
├── event_dedup.py         · 최근 동일 이벤트 archive 기반 중복 제거
│
├── tle_fetcher.py         · TLE 다운로드/캐시 (CelesTrak)
├── satellite_catalog.py   · 위성 카탈로그 + ROI
├── pass_predictor.py      · skyfield SGP4 통과 예측
├── weather_checker.py     · Open-Meteo 구름량 + Astral 일출/일몰
├── schedule_builder.py    · 위험도·궤도·기상 결합 스케줄링
│
├── daily_json_writer.py   · dashboard/daily_<date>.json + records/daily_<date>.json
├── run_pipeline.py        · 전체 단계 통합 실행 (entrypoint)
│
└── training/              · 일회성 학습 스크립트
    ├── fit_coefs.py            · COEFS (LR 가중치) 학습
    ├── build_name_map.py       · GeoNames 기반 표준명 매핑 테이블 생성
    ├── normalize_gt.py         · Ground Truth → standard_name 정규화
    └── update_scaler.py        · standardization scaler 갱신
```

## 처리 단계

1. **수집** — `gdelt_fetcher`로 target_date(±N일) GDELT v1.0 export 다운로드.
2. **전처리** — `preprocess`로 모니터링 국가 + ActionGeo_Type=4(도시) 필터링, FullName 도시명 추출, 표준명 매핑, scaler 적용.
3. **Kalman** — `kalman_filter.compute_conflict_index`가 도시별 시계열을 1D Kalman으로 학습하고 표준화 innovation을 산출. top-K(임계 z-score 초과)를 이상치로 추출.
4. **LLM 검증** — `llm_verification`이 이상치 도시별로 GDELT URL을 병렬 스크랩, Gemini Flash-lite에 본문을 넘겨 SUCCESS/AMBIGUOUS/DATE_MISMATCH/DROPPED/NO_MENTION 라벨을 부여.
5. **중복 제거** — `event_dedup`이 최근 며칠치 archive를 기반으로 동일 사건의 중복 등록 차단.
6. **위성 스케줄링** — `pass_predictor`(SGP4) + `weather_checker`(구름·일출/일몰) + `schedule_builder`(위험도·off-nadir·SAR/EO 정책)로 도시별 촬영 후보 산출.
7. **출력** — `daily_json_writer`가 대시보드용 `daily_<date>.json`과 기록용 `records/daily_<date>.json`을 생성.

## 환경변수

| 변수 | 용도 |
| --- | --- |
| `GEMINI_API_KEY` | Gemini API 인증 (필수) |
| `GEMINI_MODEL_OVERRIDE` | Primary 모델 override (기본: `gemini-3.1-flash-lite-preview`) |
| `GEMINI_FALLBACK_OVERRIDE` | Fallback 모델 override (기본: `gemini-2.5-flash-lite`) |
| `GEMINI_CALL_TIMEOUT` | 단일 API 호출 타임아웃(초). 기본 30 |
| `GDELT_TEST` | `1`이면 산출물 경로를 test/로 스왑 |

`.env`로 관리하고 절대 커밋하지 않는다 (`.gitignore` 처리됨).

## 실행

```bash
# 단일 일자
python -m pipeline.run_pipeline --date 20260321

# 옵션 — 위성 단계 skip / Kalman 한도 조정 등
python -m pipeline.run_pipeline --help
```

## 캐시

- `scrape_cache.sqlite` — 기사 본문 (URL 키)
- `llm_cache.sqlite` — Gemini 응답 (prompt_version + city + date + articles + model_id 키)
- `weather_cache.sqlite` — Open-Meteo 응답

캐시가 살아 있으면 재실행은 LLM 호출 0건으로 끝난다.
