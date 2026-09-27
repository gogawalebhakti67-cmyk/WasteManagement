# 🌿 EcoCollect: Smart Waste Collection & Recycling Platform

> **Hackathon MVP Submission**  
> A full-featured, zero-dependency smart waste collection and resource recovery platform connecting citizens with municipal collection services.

---

## 📌 Problem & Solution Overview

### The Challenge
- **For Citizens:** Disposing of non-standard waste (electronics, paint, bulky furniture, compost, batteries) is confusing. People often don't know which items can be recycled, how to prepare them, or how to schedule pickups.
- **For Collection Services:** Operations teams struggle with disorganized pickup requests, missing information, lack of route prioritization, and inefficient tracking.

### The EcoCollect Solution
EcoCollect provides an intuitive, end-to-end software platform that:
1. **Educates Citizens** with an interactive **"Can I Recycle This?"** waste encyclopedia that provides immediate disposal guidelines and safety warnings.
2. **Streamlines Scheduling** through a multi-step booking workflow with preset coordinates, photo preview, and an **instant environmental impact estimator** (calculates CO₂ avoided and landfill diversion).
3. **Offers Real-Time Tracking** with unique tracking IDs (e.g., `ECO-8941`), an interactive 5-stage status progress timeline, assigned courier details, and complete audit history.
4. **Empowers Dispatchers** via a comprehensive **Admin Operations Dashboard** equipped with fleet management, status workflows, search/filtering, live analytics, and CSV data export.
5. **Incentivizes Sustainable Habits** with printable **Eco-Receipts & Green Certificates** awarding citizen Eco-Points for diverting waste from landfills.

---

## 🚀 Key Features Implemented

| Feature | Description |
| :--- | :--- |
| **♻️ 8 Waste Categories** | Organic, Recyclable Plastics, Paper & Cardboard, Glass, Metal, E-Waste, Hazardous & Chemicals, Bulky Furniture. Each includes accepted/prohibited item lists, guidelines, and carbon avoidance factors. |
| **🔍 "Can I Recycle This?" Guide** | Real-time search engine classifying items (e.g. *pizza boxes*, *lithium batteries*, *paint cans*, *appliances*) with preparation tips and safety warnings. |
| **📍 Pickup Location & Presets** | Address capture with unit/gate notes, GPS coordinates, and 1-click neighborhood presets (*Metro Downtown*, *Tech Valley*, *Green Hills*). |
| **🌱 Real-Time Impact Estimator** | Dynamically calculates CO₂ emissions avoided (kg), landfill volume diverted (kg), and Eco-Points earned based on waste category and weight slider. |
| **📅 Scheduling & Windows** | Calendar date selector with past-date validation and time slot options (*Morning*, *Afternoon*, *Evening*). |
| **🔄 Live Tracking & Timeline** | Visual 5-step status stepper (*Submitted* → *Scheduled* → *Courier Dispatched* → *En Route* → *Recycled*), courier contact card, and timestamped audit logs. |
| **👨‍💼 Admin Dispatch Portal** | Executive KPI bar (Total, Pending, In Transit, Diverted kg), Fleet status cards, waste category distribution bars, and interactive request table. |
| **⚡ Dispatch Operations** | Inline status changer dropdown, driver assignment selector, full dossier modal with requester contacts and admin notes, and CSV export. |
| **🏅 Citizen Eco-Certificate** | Verified digital certificate summarizing materials diverted, carbon offset, and green points earned with printable layout. |

---

## 🛠️ Architecture & Tech Stack

This solution was built to be **fully self-contained, lightweight, and reliable**:
- **Runtime:** Node.js v24 (using native built-in modules)
- **Database:** SQLite (`node:sqlite` DatabaseSync) — persistent, zero external C++ build dependencies, with relations and audit history tables
- **Backend:** Node.js native HTTP REST API (`server.js`)
- **Frontend:** Responsive Single Page Application (`HTML5`, `Tailwind CSS`, `Plus Jakarta Sans`, Vanilla JavaScript)
- **Zero Third-Party Node Packages:** Zero `npm install` vulnerability or compilation hurdles; launches in under a second!

---

## 🏃 Quick Start Guide

### 1. Start the Platform
In PowerShell or terminal from the project folder:
```powershell
node server.js
```
The server will start at:
👉 **[http://localhost:3000](http://localhost:3000)**

### 2. Run the Automated Test Suite
To verify all REST API endpoints, request creation, status transitions, driver assignments, and database queries:
```powershell
node test_suite.js
```
Output:
```
Verification Summary: 17 Passed, 0 Failed
```

---

## 🧪 Demo Scenarios to Try

### Scenario A: Citizen Schedules an E-Waste Pickup
1. Open [http://localhost:3000](http://localhost:3000).
2. Click **E-Waste & Electronics** in Step 1.
3. Slide weight to **15 kg**; notice how the projected **CO₂ avoided jumps to 52.5 kg** and Eco Reward points update in real time!
4. Click the **"Metro Downtown"** preset to auto-fill address details.
5. Pick a convenient date and click **"🚀 Submit Pickup Request"**.
6. You will receive an `ECO-XXXX` tracking code. Click **"🔄 Track Status Live"** to view your request timeline!

### Scenario B: "Can I Recycle This?" Guide
1. Click the **"♻️ Disposal Guide"** tab in the navigation bar.
2. Type `battery` or click the popular `🍕 Pizza Box` pill.
3. Read the exact preparation guidelines (e.g. why grease ruins paper recycling, and how lithium batteries must have terminals taped).
4. Click **"Book Pickup →"** to automatically jump to scheduling with that category pre-selected!

### Scenario C: Admin Dispatch & Fleet Coordination
1. Click the black **"Admin Dashboard"** button in the top-right corner.
2. Review the live metrics (Total Requests, In Transit, Diverted kg).
3. Search for a request by code (e.g. `ECO-8941`) or citizen name.
4. Change the status from `Scheduled` to `In Transit` or assign a driver from the dropdown.
5. Click **"Dossier ↗"** to inspect full citizen details, location coordinates, and audit trail.
6. Click **"📥 Export CSV"** to download the complete operational log for city reporting.

### Scenario D: View and Print Eco-Certificate
1. Go to the **"📋 My History"** tab.
2. Click **"🏅 Eco-Certificate"** next to any completed request.
3. A verified green certificate appears showing the official diversion metrics and QR code stamp; click **"🖨️ Print / Save PDF"** to print or export.

---

## 📊 Database Schema Details

- **`categories`**: `id`, `name`, `icon`, `color`, `tagline`, `description`, `disposal_guide`, `accepted_items`, `prohibited_items`, `co2_factor_per_kg`
- **`disposal_items`**: `id`, `name`, `category_id`, `is_recyclable`, `instructions`, `safety_warning`
- **`drivers`**: `id`, `name`, `phone`, `vehicle_type`, `vehicle_plate`, `current_zone`, `active_status`
- **`requests`**: `id`, `tracking_id`, `user_name`, `user_email`, `user_phone`, `address`, `apartment`, `city`, `zip_code`, `latitude`, `longitude`, `category_id`, `item_description`, `estimated_weight_kg`, `bag_count`, `pickup_date`, `pickup_time_slot`, `special_instructions`, `photo_url`, `status`, `assigned_driver_id`, `admin_notes`, `created_at`, `updated_at`
- **`status_history`**: `id`, `request_id`, `status`, `note`, `created_at`

---

## 🏆 Hackathon MVP Compliance

- ✅ **Waste Category Selection:** 8 categories with clear guidance.
- ✅ **Pickup Location:** Full address + coordinates + presets.
- ✅ **Pickup Request Submission:** Detailed items, weight estimator, photos.
- ✅ **Pickup Scheduling:** Date and time window selection.
- ✅ **Request Status & Tracking:** Real-time visual timeline and driver details.
- ✅ **Admin Dashboard:** Central dispatcher control center with actions.
- ✅ **Collection Statistics:** Visual charts, CO₂ avoided, trees saved.
- ✅ **Request Search & Filtering:** Filter by status, category, date, and query.
- ✅ **Pickup History:** User history records and downloadable certificates.
- ✅ **Achieved in < 4 Hours:** Clean, modular, robust, and fully tested!
