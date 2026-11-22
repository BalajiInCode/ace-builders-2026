# GymKhata

A simple back-office app for a small gym owner (PS1: The One-Person Back Office). Built for ACE Builders Hackathon 2026 using the Codebenders IDE (Nexen).

## Problem
Small gym owners track memberships in a register and WhatsApp. They forget who is about to expire, fees come in late, and rent, electricity and trainer salary are due on time anyway. The owner never knows how much cash will be left in the next 2-3 months.

## User
Owner of a small gym with 1-5 staff and about 40-60 members. Mostly uses a phone, so the app must look fine on a mobile screen too.

## 5 Screens
1. **Members**: add and view members, with plan (monthly / 3 months / yearly), start date, end date and fee.
2. **Invoices & Expenses**: create an invoice for a member, mark it paid or pending, view an invoice. Also list the owner's expenses (rent, electricity, salary).
3. **Dashboard**: who owes how much and since when (late members first), and who expires this week.
4. **Reminders**: ready-to-copy reminder messages in Hindi (written in Roman script) and English, filled with name, amount and date. The owner copies and sends them manually.
5. **Forecast**: a 30-90 day cash forecast. A what-if control (for example, renewal rate drops from 70% to 50%) shows the new forecast and a suggested next action, such as "send reminders to these 6 members this week".

## Data
- **Member**: id, name, plan, start date, end date, fee, phone (optional, fake)
- **Invoice**: invoice number, member, amount, issue date, due date, status (paid / pending), paid date
- **Expense**: name (rent, electricity, salary), amount, due date, repeats monthly (yes / no)
- **Settings**: renewal rate (for example 70%) and opening cash balance (sample, for example Rs 50,000), both editable by the owner

Calculated on screen, not stored: days overdue, expiring this week, forecast, what-if result.

Storage is the browser's localStorage. Sample data (15-20 fake members, some late, 4-5 expiring this week, rent and salary expenses early in the month) loads automatically on first open.

## Forecast Formula
- Cash at any future date = opening cash balance + expected income - expenses due up to that date.
- Expected income = pending invoices on their due dates + (members whose plan expires in the period x renewal rate x their fee).
- Overdue invoices (due date already passed) are assumed to be collected 7 days from today.
- Renewal income is counted only for the next period after a plan ends. A member's current pending invoice is never counted as renewal income.
- Expenses = expenses on their due dates (monthly ones repeat).
- What-if changes the renewal rate (or marks some members as not renewing) and recalculates the same formula.

## Business Idea
The owner loses money when members quietly do not renew and when fees are chased late. GymKhata shows who to remind and what cash to expect. Proposed price: Rs 199-499 per month (an assumption, to be justified in the demo with a simple example: if 5 members do not renew at Rs 800 each, the owner loses Rs 4,000 per month).

## Limitations
- All data is sample / synthetic. No real member data is used.
- Payments are only tracked, not collected. There is no payment gateway.
- The renewal rate, opening balance and price are assumptions, not facts.
- Reminders come from fixed templates, not live AI.

## Out of Scope
Attendance, diet and workout tracking, Telugu or other languages, login, backend or database, live AI calls.