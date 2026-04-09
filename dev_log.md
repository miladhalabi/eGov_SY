# Developer Log & Instructions

## Project Overview
**Name:** Electronic Government System (Syria) - Graduation Project
**Architecture:** Monorepo containing separated Frontend and Backend.

## Tech Stack
* **Frontend:** React.js (Vite), Zustand (State Management), Tailwind CSS (Styling)
* **Backend:** Node.js (Express.js)
* **Database:** PostgreSQL with Prisma ORM

## ⚠️ STRICT AI WORKFLOW INSTRUCTIONS ⚠️
1. **Incremental Development:** Work part by part, feature by feature.
2. **Halt and Wait:** After completing a feature, STOP and wait for testing.
3. **Explicit Permission Required:** Do NOT proceed until the User explicitly asks.
4. **Continuous Documentation:** Update this log after every feature.
5. **No Mess:** Prioritize clean, working code.
6. **Language:** Use JavaScript, NOT TypeScript.

## Core Features to Implement (Incremental Roadmap)
1. ✅ **Project Scaffolding:** Base folders, Express server, React/Vite, Prisma setup.
2. ✅ **Database Schema:** Defined Prisma models and seeded Arabic test data.
3. ✅ **Authentication:** JWT Auth and Polished UI with Syria's new visual identity.
4. ✅ **Civil Status (Part 1):** Individual Record (Arabic PDF Generation).
5. ✅ **Civil Status (Part 2):** Birth Registration (File Upload & Employee Approval Workflow).
6. ⏳ **Traffic Domain:** Vehicle Status & Multi-party Ownership Transfer.
7. ⏳ **Tax Domain:** Financial Clearance (Cross-domain database aggregation).

---

## Current Status Log

**[Visual Identity Polish: Official Logo Integration]**
* **Status:** Brand consistency finalized with the official SVG logo.
* **UI:** Replaced placeholder SVG icons with the new `logo.svg` in:
    * **Login Screen:** Large, centered logo with shadow.
    * **Navbar:** Compact logo acting as the "Home" navigation button.

**How to Test:**
1. **Citizen Path:**
    * Log in as Ahmad (`1234567890`).
    * Fill out the "تسجيل واقعة ولادة" form and upload a picture.
    * Submit and see the success message.
2. **Employee Path:**
    * Log out and log in as Sara (`0000000001`).
    * You should see the "طلبات تسجيل الولادة المعلقة" queue.
    * Click "عرض الوثيقة" to see the uploaded file in a new tab.
    * Click "موافقة" to approve.

**Next Step:** Step 6 - Traffic Domain (Vehicle Status & Multi-party Ownership Transfer).
