# 🛡️ VERA — Voice Emergency Response Assistant

**An intelligent civic emergency & public hazard management platform.**

> "Every complaint deserves to be heard — the urgent ones deserve to be heard first."

---

## 📖 Project Overview

VERA 2.0 is an intelligent **Civic Emergency & Public Hazard Response Orchestration System**. Most civic reporting platforms treat every complaint identically — a broken streetlight and a life-threatening accident sit in the same slow queue. VERA fixes this by scoring every report's urgency in real-time, extracting structured incident intelligence, generating actionable emergency response plans with nearest responder units, and enabling human-in-the-loop dispatch confirmation.

---

## ❓ Problem Statement

**Problem Statement 3 — Smart Complaint & Public Issue Management System**
*Design a centralized platform for reporting, tracking, prioritizing, and resolving public or organizational complaints efficiently.*

Standard complaint systems are digital suggestion boxes: submit, wait, hope someone reads it. That's tolerable for a pothole and dangerous for an emergency. VERA reframes complaints as existing on a severity spectrum rather than a flat queue, providing structured intelligence, transparent AI decision factors, and automated response orchestration.

---

## 💡 Proposed Solution: VERA 2.0 Architecture

1. **Dual-Mode Citizen Portal**: Citizens report civic complaints or emergency incidents with voice triage, multilingual translation, photo evidence, and high-precision GPS. Auto-switches to Emergency Mode upon detecting danger indicators.
2. **Deterministic Risk & Confidence Engine**: Scores urgency 0–100 and computes heuristic confidence metrics (`input_completeness`, `category_clarity`, `location_availability`, `evidence_strength`) without relying on opaque hallucinating black boxes.
3. **Structured Incident Intelligence**: Generates standardized incident cards (type, severity, risk score, estimated affected individuals, injury detection, confirmed location, recommended action, and clear "Why VERA escalated" decision factors).
4. **Non-Destructive Duplicate Detection**: Spatial ($\le 150\text{m}$) and temporal ($< 45\text{min}$) clustering that links related caller reports with similarity scores without deleting citizen records.
5. **VERA Response Orchestrator**: Queries Overpass OSM for nearest hospital trauma centers and police stations, calculates realistic traffic ETAs ($\max(3, \text{round}((\text{dist}/25)\times 60 + 2))$), and prepares dispatch plans.
6. **Human-in-the-Loop Verification**: Command center dispatchers can verify and trigger one-click dispatch confirmation or downgrade false alarms with full audit logging.
7. **3-Column Tactical Command Center**:
   - **Column 1 — Priority Queue**: Real-time incoming reports filterable by severity with duplicate cluster indicators.
   - **Column 2 — Tactical Live Map**: Pulsing Ground Zero incident marker, GPS accuracy circle, hospital/police responder pins with ~ETA badges, and dynamic vector polylines.
   - **Column 3 — Intelligence & Response Plan**: Live Incident Intelligence Card + Response Plan with human confirmation actions.
   - **Bottom Panel — Operational Timeline**: Immutable audit trail of system evaluation, AI triage, operator decisions, and dispatch statuses.

---

## ✨ Features

### 3-Column Command Center (Dashboard)
A unified situational awareness dashboard featuring 5 live KPI sparklines, a real-time Priority Queue, a Leaflet-powered Tactical Map with responder routing, and side-by-side Incident Intelligence & Response Plan cards.

### Incident Intelligence & Explainable AI
Structured cards showing risk breakdown, injury cues, affected counts, and transparent checkmarks explaining why VERA escalated the report.

### VERA Response Plan & Dispatch Orchestration
Automated primary (e.g. Hospital Trauma) and secondary (e.g. Police Traffic Control) unit recommendation with real-time distance and estimated ETA calculation, subject to operator confirmation.

### Non-Destructive Duplicate Detection
Intelligent spatial-temporal grouping that highlights multi-caller clusters (e.g., "3 related reports nearby") to increase response confidence while preserving individual submissions.

### Dual-Mode Citizen Portal (Report Issue)
Offers "Civic Issue" mode for routine maintenance and "Emergency Priority" mode for active hazards, with real-time auto-switch detection when urgent language is entered.

### Tactical Live Map
High-resolution Leaflet map displaying Ground Zero, GPS precision radii, nearby emergency facilities, and estimated route paths.

### Operational Timeline
A timestamped chronicle recording submission, AI risk assessment, duplicate linking, operator verification, and dispatch milestones.

### Video Rooms & WebRTC Mesh
Emergency coordination rooms automatically activated for critical incidents, allowing citizens and responders to establish live communication.

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

