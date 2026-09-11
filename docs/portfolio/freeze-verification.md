# Freeze Verification for Public Release

This is a public summary of the existing final freeze report, not a new business acceptance run or CI status.

The locally retained source record is `outputs/MedSales_AI_V1_1_FINAL_FREEZE_REPORT.md`. Local raw audit output is excluded from Git because it can contain developer paths. The frozen prototype scope is single-user, local, Mock AI and human confirmation.

| Check | Recorded freeze result |
|---|---|
| Current regression | 30/30 PASS |
| UI full flow / V1 → V2 → V3 | PASS |
| Stage 4 → 3 / contradiction | PASS |
| Historical snapshot protection / refresh | PASS |
| Multi-project / mobile / Hero | PASS |
| Console / network / favicon | PASS |
| Full historical suite | 80 items: 51 PASS, 29 FAIL |

The 29 failures were classified in Round 9 as legacy contract incompatibilities: older helpers accept raw records without reviewing structured semantic assertions; older scoring calls omit reviewed behavior evidence; some author checks expect previous attribution behavior. They remain in the repository unchanged. This is not a claim that all historical tests pass, nor evidence of production readiness.

```sh
node --test tests/round5.test.mjs tests/round9.test.mjs tests/round10.test.mjs
node --test tests/*.test.mjs
```

The second command includes the preserved incompatible tests and is expected to return a failing status. Existing browser tests need the original development-machine dependencies/paths; portable documentation capture instructions are in [SCREENSHOT_PLAN.md](SCREENSHOT_PLAN.md). No tests were changed in release packaging.

Portfolio screenshots were subsequently captured by actual UI operations; their separate [capture record](screenshots/capture-results.json) confirms the illustrated simulated path. That capture does not replace the full freeze test suite.
