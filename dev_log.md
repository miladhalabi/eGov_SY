# Developer Log & Instructions

## Project Overview
**Name:** Electronic Government System (Syria) - Graduation Project
**Architecture:** Monorepo containing separated Frontend and Backend.

## Tech Stack
* **Frontend:** React.js (Vite), Zustand (State Management), Tailwind CSS (Styling)
* **Backend:** Node.js (Express.js)
* **Database:** PostgreSQL with Prisma ORM

## ⚠️ STRICT WORKFLOW INSTRUCTIONS ⚠️
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

**[Step 7 Completed: Real-Time Traffic Domain]**
* **Vehicle Management:** Citizens can now view all vehicles registered to their National ID.
* **Smart Verification:** The system automatically blocks vehicle transfers if the seller has unpaid traffic fines or taxes.
* **Socket.IO State Machine:** Implemented a multi-party real-time transfer workflow:
    * **Seller** initiates offer.
    * **Buyer** receives an instant real-time pop-up to Accept/Decline.
    * **Employee** performs final legal verification.
* **Atomic Transactions:** Ownership is transferred safely in the database using Prisma transactions.

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

**[Step 8 Completed: Tax Domain & Cross-Domain Integration]**
* **Tax Dashboard:** Citizens can now view their financial record and total debt in real-time.
* **Official Clearance:** Implemented Arabic PDF generation for "Financial Clearance Certificates" using the GESS font and government branding.
* **Unified Request Tracking:** "My Requests" now includes vehicle transfers with detailed status tracking (Pending Buyer, Pending Employee, Completed).
* **Traffic-Tax Linkage:** Verified that vehicle transfers are automatically blocked if the citizen has any unpaid financial records in the Tax domain.
* **Digital Payment Simulation:** Integrated a "Pay Now" feature in the Tax Dashboard, allowing citizens to settle fines and taxes electronically, which instantly unlocks blocked services (like vehicle transfers).
* **Persistence Bug Fix:** Resolved an issue where vehicle transfer pop-ups disappeared on page refresh. Implemented a persistent state check on component mount to recover active offers from the database.
* **Full-Cycle Notifications:** Both buyer and seller now receive real-time and persistent notifications at every stage: Offer Accepted, Under Government Review, Approved/Completed, or Rejected with Reason.
* **UI State Management Fix:** The "Sell Car" button is now correctly disabled and replaced with a "Under Government Review" status badge when a transfer is in the employee verification stage.
* **Bank-Government Linkage:** Implemented a financial verification layer. Buyers must now provide a valid Central Bank Transaction ID (simulated) after accepting an offer. The system cross-verifies the sender, receiver, and amount before allowing the government employee to finalize the transfer.
* **Buyer Flexibility:** Enhanced the transfer workflow to allow buyers to reject a transaction even during the bank verification stage, providing a way to cancel if they change their mind or made a mistake.
* **Bug Fix (Bank Verification):** Updated the test bank transaction to correctly match the default buyer (Hoda) and seller (Ahmad) National IDs.
* **UX Improvement (Closable Modals):** Vehicle transfer pop-ups can now be closed without cancelling the transaction.
* **Persistent Task Management:** Added an "Incoming Purchase Offers" section to the Traffic page. Buyers can now reopen the bank verification dialog at any time to complete their purchase, allowing them to navigate to the Bank Portal freely.
* **Modal Logic Fix:** Resolved a bug where the transfer modal would auto-reopen after being closed. Optimized the persistent state recovery to only trigger on initial load or account switch.
* **Prisma Type Fix:** Resolved a validation error during bank transfers by explicitly converting amount strings to floats before performing database decrements.
* **Self-Selling Prevention:** Added logic to block vehicle transfers if the buyer's National ID matches the seller's, ensuring legal and logical consistency in car ownership changes.
* **Institutional Separation (The Bank Portal):** Implemented a complete "Commercial Bank of Syria" simulation. The bank operates as a separate entity with its own database logic and security layer.
* **Secondary Security (Master Key):** Added a "Bank PIN" system. Even if a hacker accesses the government portal, they cannot perform financial transfers without the secondary 6-digit PIN, ensuring the safety of citizen assets.
* **Dynamic Financial Handshake:** Citizens can now perform real transfers in the Bank Portal, receive unique reference numbers, and use them to finalize vehicle transfers in the Traffic section.

**Next Step:** Final Polish & System-wide Verification.
