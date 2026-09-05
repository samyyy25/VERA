# 🛡️ VERA — Voice Emergency Response Assistant

**An intelligent civic emergency & public hazard management platform.**

> "Every complaint deserves to be heard — the urgent ones deserve to be heard first."

---

## 📖 Project Overview

VERA is a real-time **Smart Complaint & Public Issue Management System** with **automatic emergency escalation**. It's built on a simple insight: not all public complaints carry the same urgency, yet most civic reporting systems treat a broken streetlight and a life-threatening emergency identically — as a ticket in the same slow queue.

VERA fixes this by operating on two levels within a single, unified platform:

- **Level 1 — Public Complaint Management:** citizens report routine civic issues (road damage, garbage, streetlights, water leakage, noise, and more), which are tracked through a transparent, timestamped resolution workflow.
- **Level 2 — Emergency Response:** a deterministic backend risk engine continuously analyzes every report, and automatically escalates anything indicating real danger into a live emergency workflow — activating voice interaction, real-time translation, GPS-based responder location, and instant department notification.

A complaint doesn't need to be filed as an emergency to become one. VERA watches its own queue so nothing dangerous slips through simply because it wasn't labeled correctly.

---

## ❓ Problem Statement

**Problem Statement 3 — Smart Complaint & Public Issue Management System**
*Design a centralized platform for reporting, tracking, prioritizing, and resolving public or organizational complaints efficiently.*

Most solutions to this problem are digital suggestion boxes: a citizen submits a complaint, it sits in a queue, and someone reviews it days later. This works acceptably for a pothole. It fails dangerously for anything urgent — an accident, an injury, a threat, or a hazard where minutes matter. Compounding this, language barriers and panic make it genuinely difficult for people in distress to communicate clearly with responders, and multiple people reporting the same incident often creates duplicate, uncoordinated tickets instead of one clear picture.

---

## 💡 Proposed Solution

VERA reframes "complaint management" around a severity spectrum instead of a flat queue:

1. A citizen submits a report — text, photo, video, or voice — with automatic GPS capture and reverse-geocoded location.
2. A **deterministic backend risk engine** (not an LLM — see Technology Stack) scores the report from 0–100 using weighted danger keywords, reporter frequency, and location clustering.
3. Reports scoring below the threshold flow through a standard **Reported → Verified → In Progress → Resolved** workflow, routed automatically to the correct civic department.
4. Reports crossing the risk threshold are **automatically escalated to Critical Incident status**, instantly activating:
   - A live voice interface with real-time speech-to-text and multilingual translation
   - GPS-based nearest hospital and police station detection
   - An auto-generated, responder-ready incident summary
   - An optional live video room where the citizen and responding departments (Police, Municipal, Hospital) can join and coordinate in real time
5. Every status change and system action is logged in a transparent incident timeline — nothing happens silently.

VERA does not claim to physically repair a road or dispatch a real ambulance — no software can. Its value is faster, smarter triage and communication: getting the right information, to the right people, in seconds instead of days.

---

## ✨ Features

### Level 1 — Public Complaint Management
- Citizen reporting portal: category selection, description, optional photo/video, voice input
- Automatic GPS capture with accuracy display and reverse-geocoded address
- Real-time admin Command Center with live incident feed (no manual refresh)
- Full status workflow with a permanent, timestamped incident audit timeline
- Category-to-department authority routing with real email notifications
- Composite share cards (photo + incident context combined into one shareable image via the Web Share API)

### Level 2 — Emergency Response
- **Deterministic Risk Engine:** weighted keyword matching, reporter-frequency detection, and location clustering — server-side, non-bypassable, and never randomly generated
- **Automatic Escalation:** any report crossing the risk threshold instantly becomes a Critical Incident, no manual flagging required
- **AI Voice Interpreter:** real-time speech-to-text via the Web Speech API, with context-aware follow-up questions routed through OmniRoute
- **Multilingual Translation:** live translation between reporter and responder via LibreTranslate (MyMemory fallback)
- **Nearest Hospital & Police Finder:** live queries against OpenStreetMap's Overpass API, with distance and directions
- **Auto-Generated Responder Summary:** a clean, structured incident brief built from real data — never placeholder text
- **Multi-Department Live Video Room:** Jitsi Meet-powered live coordination room per incident, with role-tagged participants (Citizen, Police, Municipal, Hospital) and a live join/leave tracker
- **SMS Fallback (simulated):** compressed GPS + summary payload generation for offline scenarios, clearly labeled as a simulation
- **System Telemetry:** live health dashboard for every dependent service (database, AI gateway, translation, maps)

### Transparency & Trust
- No fabricated data, anywhere — every score, every location, every stat shown is computed from real input
- Clear, honest labeling of what's simulated vs. fully live at every step
- VERA never claims to have dispatched real emergency services; it prepares and routes information, and is explicit about that boundary

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
| Live Video Coordination | Jitsi Meet (embedded, external API) |
| Sharing | Web Share API (native device share sheet) |
| Hosting (optional) | Vercel/Netlify (frontend), Render/Railway (backend), Cloudflare Tunnel (OmniRoute) |

All services used are free-tier or open-source — no paid API keys are required anywhere in the stack.

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

cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in your real Supabase credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) and OmniRoute configuration (`OMNIROUTE_BASE_URL`, `OMNIROUTE_API_KEY`, `OMNIROUTE_MODEL`) in `backend/.env`. Never commit `.env` files.

Run `database/schema.sql` inside the Supabase SQL Editor to create all required tables and RLS policies.

### 3. Start OmniRoute

```bash
omniroute
```

Confirm it reports `api ✓ serving on :20128` before continuing.

### 4. Run the application locally

```bash
# Terminal 1 — backend (port 5000)
cd backend
npm run dev

# Terminal 2 — frontend (port 5173)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Verify system health

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "VERA Emergency Response Backend",
  "services": {
    "database": "connected",
    "omniroute": "connected",
    "translation": "available",
    "maps": "available"
  }
}
```

You can also check this visually from the app's **Telemetry** page.

### 6. Try it out
- Go to **Report Issue**, submit a routine complaint (e.g. "streetlight broken") and confirm it appears on the **Command Center** in real time as a low-risk item.
- Submit a complaint containing urgent language (e.g. "accident, someone is bleeding and unconscious") and watch it automatically escalate to a Critical Incident, activating the emergency response interface.

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

VERA is a hackathon prototype. Certain features (SMS delivery, department dispatch, role verification for live rooms) are simulated or simplified for demonstration purposes and are clearly labeled as such throughout the application. Production deployment would require integration with real municipal, police, and hospital dispatch systems, which are outside the scope of this prototype.
