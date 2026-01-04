# 🏠 Taiwan Property Management System (PMS)
A comprehensive, full-stack web application designed for managing multi-building apartment complexes in the Taiwan market. This system streamlines the transition from manual tracking to an automated, cloud-based operation.

## 📌 Project Overview
Target Scale: 4 Buildings | ~60 Rooms.

Primary Goal: Centralize tenant data, automate electricity billing, and provide a real-time Profit & Loss (P&L) overview.

Tech Stack: React (Frontend), Dockerized Postgres Database(Backend/Database/Auth), with a roadmap for AWS migration (RDS, S3, Cognito).

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
The system uses a relational structure optimized for Taiwan's rental laws. Key tables include:
- tenant: Personal details and ID verification.
- lease: Contractual terms and proration data.
- payment: Transaction records for rent and utilities.
- cash_flow: Comprehensive ledger for property expenses and income.

**Database Views**: The system uses PostgreSQL views to provide optimized, pre-computed data:
- `v_tenant_complete`: Complete tenant information with active leases
- `v_room_current_tenant`: Current tenant(s) for each room
- `v_room_payment_history`: Payment/invoice history for rooms
- `v_room_electricity_history`: Electricity usage and billing history
- `v_room_dashboard_summary`: Comprehensive room dashboard data
- `v_user_role`: User information with role assignments
- `v_contract`: Contract data formatted for PDF generation

For detailed view documentation, see [FRONTEND_BACKEND_INTEGRATION.md](./FRONTEND_BACKEND_INTEGRATION.md#-database-views).

### Current Implementation (Postgres)
- Project URL: https://huodcetrwapdedipjehg.supabase.co
- Auth: Managed via Supabase Auth for roles (Admin, Manager, Engineer).
- Storage: Initial receipt storage via Supabase buckets.

### AWS Roadmap
- Compute: Deploy frontend on AWS EC2/S3 + CloudFront.
- Database: Migrate to Amazon RDS (Postgres) for enterprise scaling.
- Auth: Transition to AWS Cognito for advanced IAM.
- Automation: AWS Lambda for monthly bill generation and Line Notify alerts.

### 🇹🇼 Taiwan Market Localization
- Measurement: Units tracked in Ping (坪).
- Identification: Validation for Taiwan ID and ARC numbers.
- Electricity: Support for summer/non-summer rate fluctuations and independent suite meters.

## 🛠️ Getting Started
1. Database Setup
Execute the SQL schema found in /database/schema.sql within your Supabase SQL Editor. This will initialize all tables, enums, and the enforce_room_building_match trigger.

**Important**: Run Alembic migrations to create database views:
```bash
cd backend
alembic upgrade head
```

This will create all necessary database views that provide optimized data access for the application.

2. Environment Variables
Create a .env file in the root directory:
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
DEBUG=true
DATABASE_SSL_MODE=disable
```

3. Installation
```bash
npm install
npm run dev
```

## 📈 Future Enhancements
- Automated PDF Generation: One-click official Taiwan rental contract generation.
- Smart Meter Integration: API hooks for IoT electric meters to eliminate manual entry.
- Repair Ticketing: Tenant-facing interface to report maintenance issues with photo uploads.
- Line Pay: Integrated payment interface for mobile-first tenants.
- Line Notify Integration: Auto-send rent reminders and electricity bills to tenants.