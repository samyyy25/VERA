# 🛡️ VERA — Voice Emergency Response Assistant

**An intelligent civic emergency & public hazard management platform.**

> "Every complaint deserves to be heard — the urgent ones deserve to be heard first."

---

## 📖 Project Overview

VERA is a real-time **Smart Complaint & Public Issue Management System** with **automatic emergency escalation**. Most civic reporting platforms treat every complaint identically — a broken streetlight and a life-threatening accident sit in the same slow queue. VERA fixes this by scoring every report's real urgency the moment it's submitted, and automatically activating an emergency response workflow the instant something dangerous is detected — no one has to manually flag it as urgent.

---

## ❓ Problem Statement

**Problem Statement 3 — Smart Complaint & Public Issue Management System**
*Design a centralized platform for reporting, tracking, prioritizing, and resolving public or organizational complaints efficiently.*

Standard complaint systems are digital suggestion boxes: submit, wait, hope someone reads it. That's tolerable for a pothole and dangerous for an emergency. VERA reframes complaints as existing on a severity spectrum rather than a flat queue, and builds the infrastructure to detect and act on that spectrum automatically.

---

## 💡 Proposed Solution

1. A citizen reports an issue — category, description, optional photo/video, voice input — with automatic GPS capture and reverse-geocoded location.
2. A **deterministic backend risk engine** scores the report 0–100 using weighted danger keywords, reporter frequency, and location clustering — never an LLM, never random.
3. The report is **automatically routed to the correct responsible authority** (Municipal Roads, Sanitation, Electrical, Water, Police, Fire, Medical) based on category, with a target SLA and a real notification sent to that department.
4. If the risk score crosses the threshold (≥60), the report **automatically escalates to Critical Incident status**, instantly provisioning a live video coordination room and activating the full emergency workflow.
5. Every action — status change, routing decision, notification, live session — is logged in a transparent, timestamped audit trail, visible in real time on the Command Center.

VERA does not claim to physically repair anything or dispatch real emergency units — it claims to detect, route, and coordinate faster than a manual process could, and to never fabricate a status or a statistic along the way.

---

## ✨ Features

### Command Center (Dashboard)
Real-time overview: total incidents, active issues, critical escalations, and resolved counts, each with a live sparkline. A live incidents table and an interactive incident map are shown side by side, with click-to-expand incident detail popovers.

### Incidents
Full searchable, filterable list of every complaint and incident, with live status, risk score, and one-line description — filterable by status, category, and risk level.

### Map View
A dedicated full-page live map (OpenStreetMap + Leaflet, no API key required) showing every incident's exact location, with an in-map detail card per marker.

### Live Feed
An unfiltered, chronological real-time stream of every incoming report across all civic and emergency channels — the rawest view of what's entering the system right now.

### Video Rooms
Emergency video coordination channels, automatically provisioned the moment an incident escalates to Critical status (risk ≥ 60). Citizens and responding departments (Police, Municipal, Hospital) join the same room with role-tagged identities.

### Authorities — Dispatch Routing Matrix
A transparent view of VERA's deterministic category-to-department routing table: each civic category, its responsible department, target SLA, contact details, and how many incidents have been routed to it, with auto-notification status.

### Reports
An exportable audit and compliance log of every incident, with full filtering (category, status, risk, date range) and one-click CSV export for institutional record-keeping.

### Analytics
Aggregated civic intelligence computed directly from real database records — total evaluated, average risk score, resolved count, average resolution time, incident inflow over time, risk-level distribution, and category breakdown. No fabricated statistics: any metric without a real computable basis is omitted rather than invented.

### Telemetry
Live system health for every dependent service — database, AI gateway, translation, and maps — so the platform's own reliability is transparently visible, not just claimed.

### Report Issue (Citizen Portal)
The citizen-facing entry point: category selection, incident description with voice-to-text input, automatic GPS verification with accuracy display, photo and video evidence upload, and a real-time preview of which department the report will be routed to before submission.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, Leaflet / React-Leaflet |
| Backend | Node.js, Express, TypeScript |
| Database | Supabase (PostgreSQL, Row Level Security, Realtime) |
| AI Gateway | OmniRoute (self-hosted, OpenAI-compatible, free-tier provider aggregation) |
| Voice Input | Web Speech API (browser-native) |
| Translation | LibreTranslate (primary), MyMemory Translation API (fallback) |
| Maps & Geolocation | OpenStreetMap, Leaflet, Nominatim (reverse geocoding), Overpass API (nearby hospital/police search) |
| Live Video Coordination | WebRTC mesh (Jitsi Meet, embedded) |
| Sharing | Web Share API (native device share sheet) |
| Hosting (optional) | Vercel/Netlify (frontend), Render/Railway (backend), Cloudflare Tunnel (OmniRoute) |

All services used are free-tier or open-source — no paid API keys required anywhere in the stack.

---

## ⚙️ Setup & Usage Instructions

### Prerequisites
- Node.js v18+ and npm
- [OmniRoute](https://github.com) v3.8.50+ installed and runnable locally
- A free [Supabase](https://supabase.com) project

### 1. Clone and install dependencies
```bash
git clone <repository-url>
cd VERA
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
Fill in your Supabase credentials and OmniRoute configuration in `backend/.env`. Never commit `.env` files. Run `database/schema.sql` in the Supabase SQL Editor to create all tables and RLS policies.

### 3. Start OmniRoute
```bash
omniroute
```
Confirm it reports `api ✓ serving on :20128` before continuing.

### 4. Run the application
```bash
# Terminal 1 — backend (port 5000)
cd backend && npm run dev

# Terminal 2 — frontend (port 5173)
cd frontend && npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### 5. Verify system health
```bash
curl http://localhost:5000/api/health
```
Or check visually via the in-app **Telemetry** page.

### 6. Try it out
- Submit a routine complaint (e.g. "streetlight broken") from **Report Issue** and watch it appear on the **Command Center** as a low-risk item, routed to the correct department.
- Submit a complaint with urgent language (e.g. "accident, someone is bleeding and unconscious") and watch it automatically escalate to a Critical Incident, provisioning a live video room.

---

## 👥 Team Details

**Team Name:** Cookies

| Role | Name |
|---|---|
| Team Leader | Samriddhi Tripathi |
| Team Member | Vanshika Saxena |
| Team Member | Shourya Gaur |

---

## 📌 Note

VERA is a hackathon prototype. Department notification, dispatch routing, and video-room role identity are simulated/simplified for demonstration and are clearly labeled as such throughout the application. Production deployment would require integration with real municipal, police, and hospital systems, which is outside this prototype's scope.

