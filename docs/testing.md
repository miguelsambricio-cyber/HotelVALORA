# Testing

---

## API Tests (`apps/api/`)

**Runner:** pytest  
**Config:** `apps/api/pytest.ini`

```ini
testpaths = tests
pythonpath = . ../../services/data_pipeline
asyncio_mode = auto
asyncio_default_fixture_loop_scope = function
addopts = -v --tb=short
markers =
    unit: pure unit tests — no I/O, services tested with a mock session
    integration: full HTTP stack tests — routes, schemas, error propagation
```

`pythonpath` includes `services/data_pipeline` so pipeline modules are importable in tests (but not in production API code).

**Run:**
```bash
cd apps/api
pytest                          # all tests
pytest -m unit                  # unit tests only
pytest -m integration           # integration tests only
pytest tests/services/ -v       # specific directory
```

---

## Pipeline Tests (`services/data_pipeline/`)

**Runner:** pytest  
**Config:** `services/data_pipeline/pytest.ini`

```ini
testpaths = tests
pythonpath = .
addopts = -v --tb=short
markers =
    slow: tests that take > 1 second
    integration: requires a live database connection
    benchmark: performance measurement (pip install pytest-benchmark)
```

**Run:**
```bash
cd services/data_pipeline
pytest                          # all tests (no DB needed for unit/cleaning tests)
pytest -m "not integration"     # skip DB-dependent tests
pytest tests/cleaning/ -v       # normalisation tests only
```

---

## Test Structure

### API (`apps/api/tests/`)

```
tests/
├── conftest.py          pytest fixtures (async client, test DB session)
├── services/            unit tests for service classes
│   ├── test_alias_service.py
│   ├── test_dedup_service.py
│   └── ...
└── api/                 integration tests for HTTP routes
    ├── test_auth.py
    ├── test_hotels.py
    └── ...
```

### Pipeline (`services/data_pipeline/tests/`)

```
tests/
├── conftest.py
├── test_benchmarks.py
├── cleaning/
│   ├── test_names.py
│   ├── test_geography.py
│   ├── test_text.py
│   ├── test_numeric.py
│   └── test_multilingual.py    50+ tests for normalize_for_matching()
├── etl/
│   └── test_clean_row.py
└── matching/
    └── test_confidence.py
```

---

## Key Testing Rules

- **No DB mocking** — integration tests hit a real (test) database session
- `asyncio_mode = auto` — all async test functions work without `@pytest.mark.asyncio`
- Services tested with a real `AsyncSession` (from test fixture), not mocked
- `dry_run=True` mode in ETL tests avoids DB writes for normalisation testing
- Test file mirrors module path: `tests/cleaning/test_multilingual.py` ↔ `pipeline/cleaning/multilingual.py`

---

## Fixtures (API)

Defined in `apps/api/tests/conftest.py`:

| Fixture | Scope | Purpose |
|---|---|---|
| `db` | function | Fresh `AsyncSession` per test, rolls back after |
| `client` | function | `AsyncClient` pointed at the FastAPI app |
| `test_user` | function | Pre-created user for auth tests |
| `auth_headers` | function | `{ "Authorization": "Bearer <token>" }` |

---

## Running All Tests

```bash
# From repo root (requires both test suites installed)
cd apps/api && pytest && cd ../../services/data_pipeline && pytest
```
