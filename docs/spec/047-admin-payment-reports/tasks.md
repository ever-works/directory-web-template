---
id: tasks-047-admin-payment-reports
title: Tasks 047 — Admin payment reports and export
sidebar_label: 047 Tasks
---

# Tasks — `047-admin-payment-reports`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)

| # | Task | Verification | Status |
| --- | --- | --- | --- |
| T-1 | Add `payment-report.queries.ts` (paginated list, export list, roll-ups) and export it from the queries barrel | `pnpm tsc --noEmit` in `apps/web`; every read is tenant-scoped | done |
| T-2 | Add `payment-report-filters.ts` as the one validator both routes import | Type-check; the API spec asserts list and export reject the same bad range | done |
| T-3 | Add `payment-report-export.service.ts` (CSV via papaparse, XLSX via exceljs, shared column order, summary sheet) | API spec asserts the CSV header row and the XLSX ZIP magic bytes | done |
| T-4 | Add `GET /api/admin/payment-reports` with swagger JSDoc and the admin guard | `apps/web-e2e/tests/api/admin-payment-reports-query.spec.ts` | done |
| T-5 | Add `GET /api/admin/payment-reports/export`, requiring a resolved session so the download is logged | Same spec: no attachment ever reaches an anonymous caller | done |
| T-6 | Add `use-admin-payment-reports.ts` (React Query + blob download that honours the server filename) | Type-check | done |
| T-7 | Add `/admin/payment-reports` with the five filter controls, summary cards, table and breakdowns | `apps/web-e2e/tests/admin/payment-reports.spec.ts` | done |
| T-8 | Add the dashboard-grid card and the profile-menu entry | Admin route coverage matrix | done |
| T-9 | Add `admin.ADMIN_PAYMENT_REPORTS_PAGE` to all 21 locale files | `pnpm run lint`; every locale parses | done |
| T-10 | Add both Playwright specs and register the routes in both coverage matrices | Specs run under `@ever-works/web-e2e` | done |
| T-11 | Record the PDF decision as Q-047-1 with a chosen default | `docs/questions.md` | done |
| T-12 | Spec, plan, tasks, `docs/spec/README.md` row, `docs/log.md` line | Definition of Done checklist in `AGENTS.md` §2 | done |
