# VERA — Voice Emergency Response Assistant

**VERA** is a real-time Smart Complaint & Public Issue Management System with **automatic emergency escalation**.

---

## 🌟 Operating Levels

* **LEVEL 1 — Public Complaint Management:** Reporting civic issues (potholes, streetlights, garbage, water leaks, harassment) with geolocation, category classification, and timeline tracking.
* **LEVEL 2 — Emergency Response:** Automatic backend risk engine escalation (>60/100 risk score) activating real-time emergency workflows (Web Speech API voice capture, OmniRoute AI context-aware triage, OpenStreetMap Overpass hospital/police detection, responder summaries, and SMS fallback).

---

## 🏗️ Architecture & Deployment Decision (Section 0)

* **Deployment Model:** Full stack runs **locally on the same machine** (`localhost`) during development and live demonstration.
* **OmniRoute Integration:** Assumed at `http://localhost:20128/v1`. The browser never talks directly to OmniRoute; all AI requests go:
  $$\text{Browser} \longrightarrow \text{VERA Backend} \longrightarrow \text{OmniRoute (Port 20128)} \longrightarrow \text{AI Model}$$
* **Database:** Supabase PostgreSQL with Row Level Security (RLS) and Supabase Realtime for instant multi-window synchronizations.
* **Risk Engine:** Authoritative deterministic backend scoring engine (0–100) analyzing weighted danger keywords, cluster proximity, and reporter frequency.

---

## 📁 Project Structure

```
VERA/
├── frontend/                     # React + Vite + Tailwind CSS + Leaflet
│   ├── src/
│   │   ├── components/           # UI components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Supabase client & utilities
│   │   ├── services/             # API services & HTTP clients
│   │   ├── App.tsx               # Main App entry & navigation
│   │   ├── index.css             # Tailwind base & VERA glassmorphism styles
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
│
├── backend/                      # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/               # Parameterized env configurations
│   │   ├── controllers/          # Request controllers
│   │   ├── lib/                  # Supabase admin client
│   │   ├── routes/               # API routes (/api/health, /api/complaints, etc.)
│   │   ├── services/             # Risk engine, OmniRoute, Geolocation, Translation
│   │   └── server.ts             # Express server setup
│   ├── .env.example
│   └── package.json
│
├── database/
│   └── schema.sql                # Supabase schema, RLS policies & Realtime publication
│
├── .env.example                  # Root environment template
└── README.md
```

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- **Node.js** v18+ and **npm** installed.
- **OmniRoute** (v3.8.50+) running locally on `http://localhost:20128`.
- (Optional) Free **Supabase** project for PostgreSQL and Realtime updates.

---

### 2. Install Dependencies

#### Install Backend:
```bash
cd backend
npm install
```

#### Install Frontend:
```bash
cd ../frontend
npm install
```

---

### 3. Configure Environment Variables

1. Copy `backend/.env.example` to `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Copy `frontend/.env.example` to `frontend/.env`:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
3. If using Supabase, paste your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into `.env`.
4. Run the SQL script in `database/schema.sql` inside the Supabase SQL Editor.

---

### 4. Run Locally

#### Start Backend (Port 5000):
```bash
cd backend
npm run dev
```

#### Start Frontend (Port 5173):
```bash
cd frontend
npm run dev
```

Open your browser at [http://localhost:5173](http://localhost:5173).

---

## 🩺 Health Check Verification

Test the backend health check endpoint:
```bash
curl http://localhost:5000/api/health
```

Expected JSON response:
```json
{
  "status": "ok",
  "timestamp": "2026-09-01T...",
  "version": "1.0.0",
  "service": "VERA Emergency Response Backend",
  "services": {
    "database": "connected",
    "omniroute": "connected",
    "translation": "available",
    "maps": "available"
  }
}
```
