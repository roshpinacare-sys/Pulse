# CHANGELOG

## 2.1.0 — 2026-10-12 (46f714b)
- quota-signature root-cause dedup: private-repo failing job with zero executed steps within seconds = Actions-minutes billing gate (measured), one named owner-gated condition instead of N blended reds; code-level reds keep their own list; totals.actionsQuotaGated + actionsRedActionable split in network.json

## 2.0.0 — 2026-10-12 (ee58a66)
- clock redundancy (DECISIONS #9): self-relay — every successful run sleeps to the next half-hour boundary and dispatches the next tick; schedule + manual ignition as backup clocks; fail-closed on crash, alive through degraded
- BENCHMARK.md — the org benchmark vs giant-company practice (10 dimensions, every row with an action)
- runbooks/ ×3: quota-dead, cross-wave-clobber, schedule-pending; BOOTSTRAP laws: voice, runbook, light-RFC

## 1.x — 2026-10-12
- organ born: observe (census) → act (state) → record (CI commit) → alert (fail-closed issue law)
- calibration matrix (DECISIONS #6), mirror source-ladder (#7), freshness-SLA over trigger-kind (#8)
- Issues-as-task-queue (#2), one-voice bot law (#3)
