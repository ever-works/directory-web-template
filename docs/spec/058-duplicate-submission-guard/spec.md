---
id: spec-058-duplicate-submission-guard
title: Spec 058 — Duplicate submission guard
sidebar_label: 058 Duplicate submission guard
---

# Feature spec — `058-duplicate-submission-guard`

> **Status:** in-progress (submit route shipped; follow-up routes open) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md)

## 1. Summary

`POST /api/client/items` (the submit form) now answers **409** when a pending or
approved item already uses the submitted link, instead of adding another copy to
the review queue.

## 2. Motivation

A submission only checked that its generated *slug* was free (a clash got a `-1`,
`-2` suffix). Submitting a link the directory already lists therefore always
succeeded and landed in the moderation queue as a near-duplicate. Reviewers had to
spot and reject each copy by hand, and a submitter learned nothing about the
existing entry.

## 3. Requirements

- **R1.** Two links are the same when they differ only by scheme (`http` / `https`),
  host letter case, a leading `www.`, trailing slashes, a `#fragment`, tracking
  parameters (`utm_*`, `fbclid`, `gclid`, `msclkid`, `mc_cid`, `mc_eid`, `igshid`) or
  the order of the other query parameters.
- **R2.** Anything else keeps two links apart: another path, path letter case, another
  query parameter or value, a non-default port, another sub-domain. A deeper page on a
  known site, or the site root versus a deeper page, is never a duplicate.
- **R3.** Only `pending` and `approved` items block a submission. A `rejected`, `draft`
  or soft-deleted item does not, so a corrected resubmission is accepted.
- **R4.** On a duplicate the route answers `409` with
  `{ success: false, error: "An item with this link already exists in the directory." }`.
  `existingSlug` is added only when the existing item is `approved` (public); a pending
  item of another submitter is not revealed.
- **R5.** A link that cannot be parsed as http(s) never matches (the existing
  `source_url` validation still decides about it). Valid, non-duplicate submissions
  behave exactly as before.

## 4. Out of scope

- The same check on `PATCH /api/client/items/:id` (changing the link of an existing
  item) and on admin create / import: later slices (plan, "Follow-ups").
- A per-user submission rate limit and a cap on pending submissions.
- Fuzzy matching (same name, redirected domains, path case).
- Showing the match inside the form before submit; the form already shows the
  response `error` as a toast.
