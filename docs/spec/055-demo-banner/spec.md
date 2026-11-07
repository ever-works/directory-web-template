---
id: spec-055-demo-banner
title: Spec 055 — Demo account banner
sidebar_label: 055 Demo banner
---

# Feature spec — `055-demo-banner`

> **Status:** shipped · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md)

## 1. Summary

A demo deployment (`NEXT_PUBLIC_DEMO=true`, as demo.ever.works) shows a thin
strip above the header:

> You are using a demo account. Finding our software useful? **Click here to
> Sign Up and start using for free!**

The link opens the Ever Works sign-up page (`https://app.ever.works/register`).
Every other deployment, which means every customer directory, renders nothing.

## 2. Motivation

demo.gauzy.co has shown this strip for years. Visitors who like the demo get a
direct path to a real account. The owner asked (2026-11-07) for the same line
on every Ever demo platform (demo.ever.works, demo.ever.team, demo.traduora.co),
and only on the demos.

## 3. Requirements

- **R1.** The banner shows only when the deployment's **runtime** env has
  `NEXT_PUBLIC_DEMO=true`. Every Work runs the same image, built without
  per-Work env, so the bundle's `process.env.NEXT_PUBLIC_DEMO` cannot tell the
  demo apart from a customer site. The flag comes from
  `GET /api/payment/public-config` (`demo`) through `usePublicPaymentConfig()`.
- **R2.** A directory whose runtime flag is `false`, empty or unset never shows
  it, whatever the bundle was built with.
- **R3.** It sits above the header on every page that has the header (not on
  `/auth-demo/` pages), and scrolls away while the header stays sticky.
- **R4.** The text is translated in every locale (`common.DEMO_BANNER_TEXT`,
  `common.DEMO_BANNER_SIGN_UP`).

## 4. Out of scope

- A per-plugin switch for the banner: see [Q-055a](../../questions.md).
- Different copy for visitors who are not signed in: see [Q-055b](../../questions.md).
