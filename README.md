# GymKhata

A simple back-office web app for a small gym owner. Built for the **ACE Builders Hackathon 2026** (Problem Statement 1: The One-Person Back Office) using the **Codebenders IDE (Nexen)**.

**Live app:** _add link after deploying_
**Demo video:** _add link after uploading_

## The problem
Small gym owners track memberships in a register and on WhatsApp. They forget who is about to expire, fees come in late, and rent, electricity and trainer salary are due on time anyway. The owner never knows how much cash will be left in the next 2-3 months.

## Who it is for
The owner of a small gym with 1-5 staff and about 40-60 members, usually working from a phone. The app is built mobile-first.

## What it does
| Screen | What the owner gets |
|---|---|
| **Members** | Members with plan (monthly / 3 months / yearly), start and end dates, fee, and an "Expiring soon" badge. |
| **Invoices & Expenses** | Create an invoice, mark it paid or pending, view it. Overdue invoices show how many days late. Owner's expenses (rent, electricity, salary). |
| **Dashboard** | Who owes how much and since when, and who expires this week. |
| **Reminders** | Ready-to-copy payment and renewal messages in Hindi (Roman script) and English. The owner copies and sends them manually. |
| **Forecast** | 30 / 60 / 90 day cash forecast with a week-by-week table and chart, the lowest cash point, and a warning if cash goes below zero. |
| **What-if** | Change the renewal rate or how late overdue payments arrive, compare against the base forecast, and get a suggested next action (for example, which members to remind this week). |

## How the forecast works
- Cash = opening cash + expected income - expenses, day by day.
- Expected income = pending invoices on their due dates + overdue invoices (assumed collected 7 days from today) + renewals (renewal rate x member fee on each plan end date).
- A member's current pending invoice is never counted again as renewal income.
- Monthly expenses repeat every month.
- Both the opening cash and the renewal rate can be edited by the owner. The what-if never changes saved data.

## Business idea
The owner loses money when members quietly do not renew and when fees are chased late. GymKhata shows who to remind and what cash to expect.
- **Customer:** small independent gym and fitness studio owners.
- **Proposed price:** Rs 199-499 per month (an assumption, not a fact).
- **Why they would pay:** for example, if 5 members do not renew at Rs 800 each, the owner loses Rs 4,000 a month. Timely reminders and a cash forecast help recover part of that.

## Run it
No install needed. Open `index.html` in a browser. Data is stored in the browser's localStorage, and sample data loads automatically on first open. Use **Reset demo data** (Invoices & Expenses tab) to start over.

## Limitations and responsible use
- All data is sample / synthetic. No real member data is used.
- Payments are only tracked, not collected. There is no payment gateway.
- The renewal rate, opening cash and price are assumptions. The forecast is an estimate, not a guarantee.
- Reminders come from fixed templates. There is no live AI and no network call in the app.
- Out of scope: attendance, diet and workout tracking, login, backend or database.

## How it was built
- **Tech:** plain HTML, CSS and JavaScript, no frameworks and no backend.
- **Code:** all code was generated with the Codebenders IDE (Nexen), one feature at a time, testing and committing after each step. The prompt log is in [`PROMPTS.md`](PROMPTS.md).
- **Planning:** the problem choice, [`SPEC.md`](SPEC.md) and the feature briefs were planned with an external chat AI (Claude) for brainstorming and planning only.
- **Testing:** each feature was opened in a browser, and the forecast numbers were checked against an independent calculation.