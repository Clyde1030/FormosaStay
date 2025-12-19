# 🏠 Taiwan Property Management System (PMS)
A comprehensive, full-stack web application designed for managing multi-building apartment complexes in the Taiwan market. This system streamlines the transition from manual tracking to an automated, cloud-based operation.

## 📌 Project Overview
Target Scale: 4 Buildings | ~60 Rooms.

Primary Goal: Centralize tenant data, automate electricity billing, and provide a real-time Profit & Loss (P&L) overview.

Tech Stack: React (Frontend), Supabase (Backend/Database/Auth), with a roadmap for AWS migration (RDS, S3, Cognito).

## 🚀 Core Functional Modules
1. Dashboard & Business Overview
- Occupancy Tracking: Real-time counters for empty, occupied, and "available soon" rooms.
- Expiry Alerts: Adjustable time window (e.g., 60 days) to track upcoming contract terminations.
- Revenue Analytics: Summary of occupancy rates and revenue trends.

2. Tenant & Contract Lifecycle
- Tenant Storage: Comprehensive profiles including Taiwan ID/ARC, motorcycle plates, and emergency contacts.
- Contract Engine: Supports Monthly, Quarterly, Semiannually, and Yearly terms with automated prepaid discount logic.
- Proration Logic: Built-in calculators for mid-cycle move-ins and early termination settlements.

3. Financial Management (Rent & Utilities)
- Payment Tracking: Status-based tracking (Unpaid, Paid, Overdue) with historical Gantt charts per room.
- Electricity Billing: * Monthly meter reading logs.
    - Support for global building rates vs. room-specific rates.
    - Automated billing for early-termination move-outs.
- Washer/Dryer Revenue: Monthly coin-op income tracking.

4. Operations & Overhead
- Expense Tracking: Log maintenance, payroll, cleaning, and taxes.
- Document Management: Attach photos/PDFs of receipts to cash flow entries.
- P&L Reports: Integrated Net Annual Operating Income (NAOI) visualization.

## 🏗️ Technical Architecture

### Database Schema (PostgreSQL)
The system uses a relational structure optimized for Taiwan’s rental laws. Key tables include:
- tenant: Personal details and ID verification.
- lease: Contractual terms and proration data.
- payment: Transaction records for rent and utilities.
- cash_flow: Comprehensive ledger for property expenses and income.

### Current Implementation (Supabase)
- Project URL: https://huodcetrwapdedipjehg.supabase.co
- Auth: Managed via Supabase Auth for roles (Admin, Manager, Engineer).
- Storage: Initial receipt storage via Supabase buckets.

### AWS Roadmap
- Compute: Deploy frontend on AWS Amplify/S3 + CloudFront.
- Database: Migrate to Amazon RDS (Postgres) for enterprise scaling.
- Auth: Transition to AWS Cognito for advanced IAM.
- Automation: AWS Lambda for monthly bill generation and Line Notify alerts.

### 🇹🇼 Taiwan Market Localization
- Measurement: Units tracked in Ping (坪).
- Identification: Validation for Taiwan ID and ARC numbers.
- Line Pay: Integrated payment interface for mobile-first tenants.
- Electricity: Support for summer/non-summer rate fluctuations and independent suite meters.

## 🛠️ Getting Started
1. Database Setup
Execute the SQL schema found in /database/schema.sql within your Supabase SQL Editor. This will initialize all tables, enums, and the enforce_room_building_match trigger.

2. Environment Variables
Create a .env file in the root directory:
```bash
VITE_SUPABASE_URL=https://huodcetrwapdedipjehg.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
```

3. Installation
```bash
npm install
npm run dev
```

## 📈 Future Enhancements
- Line Notify Integration: Auto-send rent reminders and electricity bills to tenants.
- Automated PDF Generation: One-click official Taiwan rental contract generation.
- Smart Meter Integration: API hooks for IoT electric meters to eliminate manual entry.
- Repair Ticketing: Tenant-facing interface to report maintenance issues with photo uploads.