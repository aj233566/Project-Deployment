# SENETRY

### Explainable Multi-Hazard Risk, Habitation & Relocation Decision Support for the North Eastern Region (NER)

> **SIH 2026 \| Problem Statement: SIH26191 \| Theme: Disaster
> Management \| Organization: Ministry of Development of North Eastern
> Region (MDoNER)**

SENETRY (SENTRY) is a disaster decision-support platform designed
for the North Eastern Region of India. It connects citizen observations,
weather and hazard information, explainable multi-hazard assessment,
habitations and relocation sites, GIS visualization, geo-targeted
operational alerts, incident management, and emergency-response
workflows into a single system.

The platform is designed around the operational cycle:

**Detect → Enrich → Score → Assess → Act → Verify → Learn**

The goal is not simply to display disaster information, but to connect
**detection with the next responsible action**.

------------------------------------------------------------------------

## Table of Contents

-   [Problem](#problem)
-   [Solution](#solution)
-   [Key Features](#key-features)
-   [User Roles](#user-roles)
-   [End-to-End Workflow](#end-to-end-workflow)
-   [System Architecture](#system-architecture)
-   [Technology Stack](#technology-stack)
-   [GIS & Mapping](#gis--mapping)
-   [Risk Intelligence](#risk-intelligence)
-   [Incident Reporting](#incident-reporting)
-   [Weather Intelligence](#weather-intelligence)
-   [Alerts & Notifications](#alerts--notifications)
-   [Emergency Response](#emergency-response)
-   [Authentication & Authorization](#authentication--authorization)
-   [Database](#database)
-   [Project Structure](#project-structure)
-   [API Overview](#api-overview)
-   [Installation & Local Setup](#installation--local-setup)
-   [Environment Variables](#environment-variables)
-   [Running the Application](#running-the-application)
-   [Production Architecture](#production-architecture)
-   [Scalability](#scalability)
-   [Security](#security)
-   [Current Prototype Status](#current-prototype-status)
-   [Known Limitations](#known-limitations)
-   [Future Roadmap](#future-roadmap)
-   [Why SENETRY](#why-sentry--sih26191)
-   [Why Team Nirvana](#why-team-nirvana)
-   [Why This Approach](#why-this-approach)
-   [SIH Demo Flow](#sih-demo-flow)
-   [Team](#team)
-   [Contributing](#contributing)
-   [License](#license)

------------------------------------------------------------------------

## Problem

The North Eastern Region of India contains mountainous terrain, steep
slopes, heavy rainfall zones, landslide-prone corridors, vulnerable
roads, settlements and critical infrastructure.

During a disaster, useful information can exist in separate systems:

-   Weather and rainfall data
-   Terrain and slope information
-   Historical disaster information
-   Citizen observations
-   Field reports
-   Road conditions
-   Hospitals and shelters
-   Emergency resources
-   Authority alerts

A major challenge is turning these separate signals into an actionable
operational picture.

SENETRY addresses this gap by creating a common workflow where:

1.  A hazard or incident is detected or reported.
2.  The location and surrounding context are enriched.
3.  Risk is calculated using explainable factors.
4.  Authorities receive an operational view.
5.  GIS shows the affected area and relevant infrastructure.
6.  Citizens receive localized information and warnings.
7.  Emergency response can be prioritized.
8.  Incidents can be verified and tracked through resolution.

------------------------------------------------------------------------

## Solution

SENETRY combines a citizen-facing safety interface with an authority
command center and administrative governance.

### Citizen side

Citizens can:

-   Create an account and log in.
-   View localized risk information.
-   View weather conditions and forecast.
-   View nearby hazards and incidents.
-   View road-status information.
-   Report landslides and other disaster incidents.
-   Capture GPS coordinates.
-   Attach photo/video evidence.
-   Track submitted incidents.
-   Receive authority notifications.
-   Access emergency helplines.
-   Find nearby shelters and hospitals.
-   Use the live safety map.
-   Use location-aware emergency controls.

### Authority side

Authorities can:

-   Monitor incidents through GIS.
-   Review risk information.
-   Inspect incident severity and evidence.
-   Track incident status.
-   View alerts.
-   Broadcast notifications.
-   Review emergency priorities.
-   View response resources.
-   Analyze weather-linked risk.
-   Use operational map layers.
-   Support emergency response decisions.

### Admin side

Administrators provide governance by:

-   Reviewing authority applications.
-   Approving or rejecting authority accounts.
-   Controlling which users are allowed to operate as authorities.
-   Viewing authority-related statistics and verification state.

### SENTRY habitation and relocation workflow

SENTRY records geospatially located habitations and relocation sites,
assesses each habitation against available evidence for five hazard
families, and presents deterministic, explainable classifications and
red-zone views. Authorities can review hazard evidence and data quality,
compare relocation-site suitability and recorded availability, and
prioritize follow-up. Available capacity is not confirmed accommodation:
without a recorded population demand, the system does not calculate a
capacity gap or claim that a site can accommodate an affected population.

Assessments are decision support, not calibrated event probabilities or
autonomous evacuation orders. Missing, stale, or unsupported source data
must remain identifiable as unavailable/unknown; any hazard proxy is
disclosed in the assessment explanation. Operational accuracy depends on
deploying and maintaining verified source data.

------------------------------------------------------------------------

# Key Features

## 1. Role-Based Disaster Platform

The application provides separate experiences for:

  Role        Primary Purpose
  ----------- ------------------------------------------
  Citizen     Awareness, reporting and personal safety
  Authority   Verification, monitoring and response
  Admin       Governance and authority verification

Different roles do not receive the same control surface.

**Citizen → Report & Stay Safe**

**Authority → Verify & Respond**

**Admin → Govern & Control Access**

------------------------------------------------------------------------

## 2. Live GIS Safety Map

The GIS interface is the geographical core of SENETRY.

It can visualize:

-   Citizen incidents
-   Landslide hazards
-   Risk zones
-   Road conditions
-   Hospitals
-   Shelters
-   Emergency resources
-   Emergency routes
-   External hazard layers
-   Citizen location

The map is implemented using Leaflet/React Leaflet and
OpenStreetMap-based mapping.

The citizen map also supports location-aware behavior:

``` text
Citizen GPS
    ↓
Current position
    ↓
Nearby incidents
    ↓
Nearby facilities
    ↓
Safety guidance
```

------------------------------------------------------------------------

## 3. Citizen Incident Reporting

Citizens can report:

-   Landslide
-   Flash flood
-   Road blockage
-   Slope crack
-   Slope movement
-   Infrastructure damage

Reports can include:

-   Incident type
-   Description
-   Severity
-   Latitude
-   Longitude
-   Address when available
-   Photo/video evidence
-   Reporter information

The objective is to convert observations from the ground into structured
operational data.

------------------------------------------------------------------------

## 4. Incident Lifecycle

Incidents are intended to move through a controlled lifecycle:

``` text
Submitted
    ↓
Verified
    ↓
In Progress
    ↓
Resolved
```

This creates a distinction between:

**Citizen-reported information**

and

**Authority-verified operational information**

That distinction is important for disaster-management systems because an
unverified report should not automatically become an official warning.

------------------------------------------------------------------------

## 5. Weather Intelligence

SENETRY integrates weather information into its risk workflow.

The weather module supports:

-   Current temperature
-   Weather condition
-   Rainfall
-   Humidity
-   Wind information
-   Daily forecast
-   Five-day forecast
-   Weather-linked risk interpretation

Weather data can be used as one of the risk contributors rather than
being treated as the only source of risk.

------------------------------------------------------------------------

## 6. Explainable Risk Engine

The prototype uses a weighted, explainable rule-based risk engine.

Example concept:

``` text
Weather / Rainfall
        +
Recent Incidents
        +
Terrain / Slope Context
        +
Infrastructure Conditions
        +
Hazard Context
        ↓
Risk Score
        ↓
Risk Level
```

Risk levels:

-   LOW
-   MODERATE
-   HIGH
-   CRITICAL

The system can expose the major contributors behind a score.

For example:

``` text
Risk Score: 72 / 100

Risk Level: HIGH

Major contributors:
• Heavy rainfall
• Recent slope movement
• High incident density
• Vulnerable terrain
```

This makes the result easier for an authority to understand and
challenge.

------------------------------------------------------------------------

## 7. Optional AI Risk Explanation

The existing optional Gemini-based layer can provide supplemental
interpretation for the legacy risk-analysis workflow.

The AI layer can provide:

-   Risk interpretation
-   Explanation
-   Recommendations
-   Natural-language safety guidance

The rule-based baseline remains important. AI output is not used as a
probability or as the SENTRY multi-hazard assessment score.

If the AI provider is unavailable or not configured, the legacy risk
workflow can retain its baseline assessment.

### Important design principle

AI output is **decision support**, not an autonomous official evacuation
order.

Official warnings and response decisions should remain under the
appropriate authority.

------------------------------------------------------------------------

## 8. Hazard Enrichment

The backend architecture supports external hazard/context sources such
as:

-   Open-Meteo weather information
-   USGS earthquake information
-   NASA FIRMS fire hotspots
-   GNews-based context
-   Routing services where configured

External feeds are treated as enrichment sources for the risk and
operational workflow.

------------------------------------------------------------------------

## 9. Authority Alerts

The authority side can work with risk alerts containing:

-   Severity
-   Risk score
-   Risk level
-   Contributors
-   Recommendations
-   Assessment explanation and data quality
-   Explainable multi-hazard evidence and data-quality information
-   Location
-   Alert status

This allows the operational team to distinguish important events from
normal background conditions.

------------------------------------------------------------------------

## 10. Notifications

SENETRY supports notification delivery through:

-   In-app notifications
-   Browser notifications

Authority broadcasts can contain:

-   Title
-   Message
-   Type
-   Target audience
-   Delivery state

Citizens can receive relevant authority communication through the
platform.

------------------------------------------------------------------------

## 11. Emergency Response Prioritization

The emergency module is designed to help authorities answer:

> Which affected area should receive attention first?

Priority can consider factors such as:

-   Risk level
-   Incident severity
-   Affected area
-   Road accessibility
-   Available resources
-   Emergency response requirements

The intended workflow is:

``` text
Active Incidents
      ↓
Risk / Impact Assessment
      ↓
Priority Queue
      ↓
Response Unit Assignment
      ↓
Status Tracking
```

------------------------------------------------------------------------

## 12. Resources & Logistics

The operations layer is designed to provide visibility into:

-   Emergency resources
-   Resource availability
-   Deployed resources
-   Response units
-   Shelters
-   Hospitals
-   Other emergency facilities

This allows the command center to connect a detected problem with
available response capacity.

------------------------------------------------------------------------

## 13. Citizen Safety Controls

The citizen GIS provides action-first controls such as:

-   Call 112
-   Report an incident
-   Locate me
-   I'm safe
-   Show danger
-   Safe route
-   Find shelter
-   Find hospital
-   Directions
-   Safety tips

The purpose is to minimize the number of decisions a citizen needs to
make during a stressful situation.

------------------------------------------------------------------------

# User Roles

## Citizen

The citizen experience focuses on:

``` text
Awareness
   ↓
Report
   ↓
Receive Warning
   ↓
Understand Local Risk
   ↓
Reach Safety
```

## Authority

The authority experience focuses on:

``` text
Monitor
   ↓
Verify
   ↓
Prioritize
   ↓
Deploy
   ↓
Resolve
```

## Admin

The admin experience focuses on:

``` text
Verify Authority
   ↓
Control Access
   ↓
Maintain Governance
```

------------------------------------------------------------------------

# End-to-End Workflow

The complete SENETRY operational loop is:

``` text
┌───────────────────────────────────────────┐
│ 1. SENSE / REPORT                         │
│ Weather + hazards + citizen reports       │
└────────────────────┬──────────────────────┘
                     ↓
┌───────────────────────────────────────────┐
│ 2. ENRICH                                  │
│ Coordinates + nearby hazards + context     │
└────────────────────┬──────────────────────┘
                     ↓
┌───────────────────────────────────────────┐
│ 3. SCORE                                   │
│ Explainable risk engine                    │
└────────────────────┬──────────────────────┘
                     ↓
┌───────────────────────────────────────────┐
│ 4. ASSESS                                  │
│ Explainable SENTRY risk index + data quality│
└────────────────────┬──────────────────────┘
                     ↓
┌───────────────────────────────────────────┐
│ 5. ACT                                     │
│ Alert + GIS + notification + response      │
└────────────────────┬──────────────────────┘
                     ↓
┌───────────────────────────────────────────┐
│ 6. VERIFY / CLOSE                          │
│ Authority verification and resolution      │
└────────────────────┬──────────────────────┘
                     ↓
┌───────────────────────────────────────────┐
│ 7. LEARN                                   │
│ Store outcomes and improve the system      │
└───────────────────────────────────────────┘
```

------------------------------------------------------------------------

# System Architecture

``` text
                     ┌──────────────────────┐
                     │       Citizens       │
                     │  Report / Awareness  │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │    React + Vite      │
                     │ Citizen / Authority  │
                     │       / Admin        │
                     └──────────┬───────────┘
                                │
                           REST / JSON
                                │
                     ┌──────────▼───────────┐
                     │ Node.js + Express    │
                     │                      │
                     │ Auth                 │
                     │ Incidents            │
                     │ Risk                 │
                     │ Weather              │
                     │ Alerts               │
                     │ Notifications        │
                     │ Resources            │
                     │ Emergency Operations │
                     └──────┬───────┬───────┘
                            │       │
                  ┌─────────▼───┐   └──────────────────┐
                  │ MongoDB     │                      │
                  │ + Mongoose  │                      │
                  └─────────────┘                      │
                                                       │
              ┌────────────────────────────────────────┤
              │                                        │
       ┌──────▼──────┐ ┌──────────┐ ┌────────────┐ ┌──▼──────────┐
       │ Open-Meteo  │ │   USGS   │ │ NASA FIRMS │ │   Routing   │
       │ Weather     │ │ Hazards  │ │ Fire Data  │ │   Service   │
       └─────────────┘ └──────────┘ └────────────┘ └─────────────┘
                                │
                         ┌──────▼──────┐
                         │ Optional AI │
                         │ Assessment  │
                         └─────────────┘
```

------------------------------------------------------------------------

# Technology Stack

## Frontend

-   React.js
-   Vite
-   React Router
-   Bootstrap Grid
-   Vanilla CSS
-   React Leaflet
-   Leaflet
-   Axios
-   Recharts / Chart.js where used
-   Lucide React where used

Bootstrap is primarily used for responsive layout.

Custom Vanilla CSS provides the SENETRY visual identity.

------------------------------------------------------------------------

## Backend

-   Node.js
-   Express.js
-   REST APIs
-   Axios
-   JWT
-   bcrypt / bcryptjs
-   dotenv
-   CORS
-   Multer where applicable

------------------------------------------------------------------------

## Database

-   MongoDB
-   MongoDB Atlas
-   Mongoose

Core domain entities include:

-   Users
-   Incidents
-   Alerts
-   Notifications
-   Resources
-   Facilities
-   Shelters
-   Hospitals
-   Simulations / operational data

------------------------------------------------------------------------

## GIS

-   Leaflet
-   React Leaflet
-   OpenStreetMap
-   GeoJSON where applicable
-   Browser Geolocation API

The GIS layer is designed to support incidents, risk areas, roads,
facilities, resources and emergency routes.

------------------------------------------------------------------------

# GIS & Mapping

The GIS system separates:

### Base map

The geographical background used for navigation.

### Operational layers

Examples include:

-   Incidents
-   Risk zones
-   Roads
-   Hospitals
-   Shelters
-   Resources
-   External hazard layers

The Authority map also derives two operational views from the same live
incident feed:

- **Disaster danger zones:** unresolved incidents render as severity-scaled red
  zones at their recorded coordinates; resolved incidents clear from the map.
- **Road status:** road-blockage and infrastructure incidents are shown as
  **Blocked**, while flood, landslide and slope incidents are shown as
  **Restricted**. The summary card uses the complete operational incident set,
  not the currently selected severity filter.

The live earthquake overlay is filtered by a simplified India land boundary,
rather than a rectangular India-region bounding box, so events in Tibet,
Afghanistan, Pakistan, Nepal and the open ocean do not appear as misleading
floating dots.

### Citizen-specific map

Citizens receive a simplified action-oriented map.

``` text
Citizen Location
      +
Nearby Hazards
      +
Nearby Incidents
      +
Nearby Facilities
      +
Safe Route
      ↓
Citizen Safety View
```

When real GPS is available, the citizen location is used for local map
context. A controlled Sikkim scenario can also be used for demonstration
purposes.

------------------------------------------------------------------------

# Risk Intelligence

SENTRY assesses landslide, flood, earthquake, erosion, and cloudburst hazards
using deterministic rules over the evidence currently available to the
configured sources. The assessment reports contributing factors,
data-quality limitations, a composite index, and red-zone classification.
It does not claim a calibrated probability of an event or interpret
missing evidence as proof that a hazard is absent. Erosion/cloudburst
proxies, where used, are disclosed as such in the explanation.

The prototype deliberately avoids requiring large local model training.

The architecture is:

``` text
Input Data
   ↓
Validation
   ↓
Normalization
   ↓
Feature / Hazard Enrichment
   ↓
Weighted Risk Calculation
   ↓
Risk Score
   ↓
Risk Level
   ↓
Top Contributors
   ↓
Optional supplementary AI explanation (not part of SENTRY scoring)
```

### Why explainable rules?

For an early-warning prototype, an authority should be able to
understand why the system produced a result.

Instead of:

``` text
AI says: HIGH
```

the system should communicate:

``` text
HIGH RISK

Score: 78

Contributors:
• Heavy rainfall
• Recent slope movement
• Multiple nearby reports
• Vulnerable terrain

Recommendation:
Increase monitoring and follow authority procedures.
```

------------------------------------------------------------------------

# Incident Reporting

Example request structure:

``` json
{
  "type": "landslide",
  "description": "Slope movement observed near the road.",
  "severity": "high",
  "location": {
    "latitude": 27.123456,
    "longitude": 88.123456,
    "address": ""
  },
  "status": "submitted",
  "reportedBy": "anonymous",
  "images": [],
  "videos": []
}
```

The backend stores the structured incident and exposes it to authorized
workflows and GIS visualization.

------------------------------------------------------------------------

# Weather Intelligence

The weather service provides current conditions and daily forecast
information.

The prototype uses a five-day forecast for the weather/risk interface.

Weather should be interpreted as evidence for the relevant hazard
assessments, not as a prediction of a disaster by itself.

For example:

``` text
Rainfall ↑
     +
Slope vulnerability ↑
     +
Recent slope reports ↑
     ↓
Overall risk may increase
```

------------------------------------------------------------------------

# Alerts & Notifications

Geo-targeted SENTRY alerts are persisted for authority review and map
visualization against eligible assessed habitations. Saving an alert
does not deliver it to residents. This repository does not configure
SMS/email delivery or a resident push-notification subscription service.
Browser notifications use the local browser API and the current user's
permission; they are not a district-wide delivery mechanism.

The notification model supports these channel labels:

``` text
channel:
    in_app
    browser
    email
    sms
```

The current citizen-facing notification experience focuses on:

-   In-app notifications
-   Browser notifications

An authority can create a broadcast containing:

``` text
Type
Title
Message
Target Audience
```

In-app notifications are stored by the backend. A stored notification or
target-audience label is not evidence that an external channel or every
intended recipient received it.

------------------------------------------------------------------------

# Emergency Response

The emergency response architecture connects incidents to operational
decisions. Verified high-severity reports can recalculate their linked
habitation. Priority queues retain incident dispatch and, for an
authenticated verified authority/admin, include linked habitation risk,
recorded vulnerability counts, and candidate safe-site capacity and
suitability. Dispatch remains an authority/admin action. Missing
habitation links or unknown site evidence are shown as unavailable, not
replaced with population or safety estimates.

Example:

``` text
Incident
  ↓
Risk Score
  ↓
Priority
  ↓
Affected Area
  ↓
Available Resources
  ↓
Response Unit
  ↓
Dispatch
  ↓
Resolution
```

A future production implementation can extend this with:

-   Resource capacity
-   Travel time
-   Road accessibility
-   Shelter capacity
-   Hospital capacity
-   Multi-resource optimization
-   Evacuation optimization

------------------------------------------------------------------------

# Authentication & Authorization

SENETRY uses JWT-based authentication with password hashing.

The intended flow is:

``` text
Signup
   ↓
User Record
   ↓
Login
   ↓
JWT
   ↓
Role Check
   ↓
Protected Route
```

Authority accounts additionally require verification/approval before
receiving authority-level access.

This prevents an ordinary user from simply selecting an authority role
and obtaining operational permissions.

------------------------------------------------------------------------

# Database

MongoDB is used because the application contains several types of
operational records with geographical and event-oriented data.

Important indexing areas for production include:

-   User email
-   Incident status
-   Incident severity
-   Incident timestamps
-   Incident coordinates
-   Authority verification state

For larger deployments, geospatial indexes such as MongoDB `2dsphere`
indexes can support efficient location queries.

------------------------------------------------------------------------

# Project Structure

The repository uses separate frontend and backend applications.

``` text
SIH-DISASTER-NET-
│
├── backend/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── auth_controller.js
│   │   ├── incident_controller.js
│   │   └── ...
│   │
│   ├── middleware/
│   │   └── auth_middleware.js
│   │
│   ├── models/
│   │   ├── user.js
│   │   ├── incident.js
│   │   └── ...
│   │
│   ├── routes/
│   │   ├── auth_routes.js
│   │   ├── incident_routes.js
│   │   └── ...
│   │
│   ├── services/
│   │   ├── weather_service.js
│   │   ├── alert_service.js
│   │   └── ...
│   │
│   ├── utils/
│   ├── .env.example
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── alerts/
│   │   │   ├── emergency/
│   │   │   ├── gis/
│   │   │   └── common/
│   │   │
│   │   ├── context/
│   │   ├── css/
│   │   ├── data/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
│
├── README.md
└── ...
```

Frontend and backend maintain separate `package.json` files because they
use different module/runtime requirements.

------------------------------------------------------------------------

# API Overview

The backend exposes REST-style endpoints including:

  -----------------------------------------------------------------------------------
  Area                    Endpoint                      Purpose
  ----------------------- ----------------------------- -----------------------------
  Health                  `GET /`                       API health message

  Auth                    `/api/auth/*`                 Signup/login/authentication

  Admin                   `/api/admin/*`                Authority governance

  Incidents               `/api/incidents`              Create/read/update incidents

  Alerts                  `/api/alerts/*`               Risk alert operations

  Notifications           `/api/notifications/*`        Notification
                                                        retrieval/broadcast

  Emergency               `/api/emergency-priority/*`   Emergency prioritization

  Resources               `/api/resources/*`            Resource operations

  Risk                    `POST /api/risk/analyze`      Risk analysis

  Simulation              `/api/risk/simulate`          Scenario/intervention
                                                        analysis

  Weather                 `/api/weather/*`              Weather data

  Hazard                  `/api/hazards/*`              External hazard context
  Habitations             `/api/habitations/*`          Habitation records and
                                                        assessments
  Relocation sites        `/api/relocation-sites/*`     Relocation-site records
  Red zones               `/api/red-zones/*`            Red-zone views and
                                                        recalculation
  Relocation priority     `/api/relocation-priority/*`  Relocation ranking and
                                                        carrying-capacity view
  Targeted alerts         `POST /api/alerts/targeted`    Authority/admin-only
                                                        geo-targeted alert
  -----------------------------------------------------------------------------------

SENTRY habitation, relocation-site, red-zone, relocation-priority, and
alert reads require an authenticated JWT. Creating/updating domain records,
recalculating assessments, and creating/updating alerts additionally
require an authority/admin role. Citizen incident reads are scoped by
the authenticated reporter.

------------------------------------------------------------------------

# Installation & Local Setup

## Requirements

Install:

-   Node.js
-   npm
-   MongoDB or MongoDB Atlas account
-   Git

Optional external services may require their own API keys.

------------------------------------------------------------------------

## Clone the repository

``` bash
git clone https://github.com/aj233566/SIH-DISASTER-NET-.git
cd SIH-DISASTER-NET-
```

------------------------------------------------------------------------

## Backend setup

``` bash
cd backend
npm install
```

Create the environment file:

``` bash
cp .env.example .env
```

On Windows PowerShell:

``` powershell
Copy-Item .env.example .env
```

Configure the values in `.env`.

------------------------------------------------------------------------

## Frontend setup

Open another terminal:

``` bash
cd frontend
npm install
```

Create the environment file:

``` bash
cp .env.example .env
```

On Windows PowerShell:

``` powershell
Copy-Item .env.example .env
```

------------------------------------------------------------------------

# Environment Variables

Never commit real secrets to GitHub.

Example backend configuration:

``` env
PORT=5000

MONGO_URI=mongodb://127.0.0.1:27017/cascade-net

JWT_SECRET=replace-with-a-long-random-secret

CORS_ORIGIN=http://localhost:5173

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
```

External API keys should be stored server-side and should not be exposed
through public frontend environment variables.

Example categories may include:

``` env
GEMINI_API_KEY=
TOMTOM_API_KEY=
GNEWS_API_KEY=
```

Only configure variables supported by the version of the project you are
running.

The frontend supports `VITE_API_URL` for the deployed backend API base
(defaults to `http://localhost:5000`) and `VITE_DEMO_MODE=true` to opt in
to clearly simulated GIS fixtures. Leave demo mode unset or `false` for
live operation; demo fixtures are not live observations or operational
capacity.

------------------------------------------------------------------------

# Running the Application

## Start backend

``` bash
cd backend
npm run dev
```

The backend is normally available at:

``` text
http://localhost:5000
```

Health check:

``` text
http://localhost:5000/
```

------------------------------------------------------------------------

## Start frontend

In another terminal:

``` bash
cd frontend
npm run dev
```

The Vite development server normally runs at:

``` text
http://localhost:5173
```

Open the displayed Vite URL in your browser.

------------------------------------------------------------------------

# Production Architecture

The prototype is designed to evolve toward:

``` text
GitHub
   │
   ├──────────────► Frontend Hosting
   │
   └──────────────► Backend Hosting
                          │
                          ▼
                    MongoDB Atlas
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
     Weather           Hazard             Routing
     APIs              APIs                APIs
```

A prototype deployment can use:

-   Frontend: Cloudflare Pages or equivalent static hosting
-   Backend: Render or equivalent Node.js hosting
-   Database: MongoDB Atlas
-   Source: GitHub
-   Media: Cloudinary or object storage

------------------------------------------------------------------------

# Scalability

SENETRY is currently a prototype and is **not yet production-ready
at national scale**.

A production deployment would require several improvements.

## 1. API Scalability

### Problem

A single Node.js process can become a bottleneck as traffic increases.

### Solution

Use:

``` text
Load Balancer
      ↓
API Gateway
      ↓
Multiple Stateless Node.js Instances
```

The API should remain stateless where possible.

------------------------------------------------------------------------

## 2. Database Scalability

### Problem

A national disaster platform could generate large numbers of incidents,
coordinates, status updates and historical records.

### Solution

Use:

-   MongoDB replica sets
-   Proper indexes
-   `2dsphere` geospatial indexes
-   Query optimization
-   Archival policies
-   Geographic partitioning where justified
-   Sharding when scale requires it

------------------------------------------------------------------------

## 3. Real-Time Data

### Problem

Weather, incidents and alerts can change frequently.

### Solution

Use:

-   WebSockets or Server-Sent Events
-   Message queues
-   Event-driven processing
-   Background workers
-   Redis/distributed caching

This prevents every browser from repeatedly polling the entire backend.

------------------------------------------------------------------------

## 4. External API Failures

### Problem

Weather, routing or hazard providers can become unavailable or
rate-limited.

### Solution

Implement:

-   Timeouts
-   Retries with backoff
-   Circuit breakers
-   Cached last-known data
-   Provider fallbacks
-   Explicit `unavailable` states

The UI should never silently present unavailable data as real data.

------------------------------------------------------------------------

## 5. Evidence Storage

### Problem

Citizen photos and videos can consume large amounts of database/storage
capacity.

### Solution

Use:

``` text
Citizen
   ↓
Upload API
   ↓
Object Storage
   ↓
CDN
```

with:

-   Media validation
-   Virus/malware scanning
-   Compression
-   Size limits
-   Retention policies

------------------------------------------------------------------------

## 6. Risk Engine Scalability

### Problem

Different districts can have different terrain, rainfall and hazard
characteristics.

### Solution

Future versions can introduce:

-   Versioned risk models
-   Region-specific calibration
-   Feature stores
-   Historical training datasets
-   Model registry
-   MLOps
-   Continuous evaluation

The current explainable rule engine can remain as a baseline/fallback.

------------------------------------------------------------------------

## 7. Observability

Production deployment should add:

-   Structured logging
-   Metrics
-   Distributed tracing
-   Error tracking
-   API latency monitoring
-   External-provider health monitoring
-   Alerting

A disaster platform should be observable even when the underlying
infrastructure is under stress.

------------------------------------------------------------------------

# Security

Important production security measures include:

-   Password hashing with bcrypt
-   JWT validation
-   Role-based authorization
-   Authority approval workflow
-   HTTPS
-   Secure HTTP headers
-   Input validation
-   Rate limiting
-   CORS restrictions
-   File upload validation
-   Media size limits
-   API key protection
-   Secret management
-   Audit logs
-   Database access controls
-   Backup and recovery
-   Data retention policies

Location and evidence data can be sensitive, so production deployments
should define clear data-access and retention rules.

------------------------------------------------------------------------

# Current Prototype Status

SENETRY is a working SIH prototype, but individual modules have
different maturity levels.

## Implemented

-   SENTRY habitation and relocation-site records with geospatial indexes
-   Explainable five-hazard assessment snapshots and red-zone APIs
-   Relocation priority, recorded site-capacity calculations, and
    authority relocation-status decisions
-   Geo-targeted alerts for a registered habitation, assessed zone, or
    radius, with map visualization
-   Role-based citizen/authority/admin experience
-   Authentication foundation
-   Citizen incident reporting
-   Geo-tagged incident data
-   GIS incident visualization
-   Current weather
-   Five-day weather forecast
-   Explainable rule-based risk engine
-   Optional AI risk assessment integration
-   Hazard enrichment architecture
-   Risk alerts
-   In-app notifications
-   Browser notification support
-   Citizen safety map
-   Location-aware citizen map behavior
-   Incident status lifecycle
-   Authority governance workflow

## Prototype / Partially Integrated

-   Emergency prioritization persistence
-   Resource management persistence
-   Some routing/response integrations
-   Some external hazard aggregations
-   Resident delivery for geo-targeted alerts
-   Live MongoDB rollout and external weather/hazard provider behavior
-   Complete offline synchronization

## Future Production Work

-   National-scale infrastructure
-   Distributed event processing
-   Production-grade observability
-   Advanced geospatial indexing
-   Large-scale evidence storage
-   Robust offline synchronization
-   Region-specific model calibration
-   IoT/sensor ingestion
-   Satellite data pipelines
-   Advanced predictive modelling

The distinction between **implemented**, **prototype**, and **future**
functionality is intentional so the platform does not present simulated
capabilities as production infrastructure.

------------------------------------------------------------------------

# Known Limitations

## 1. Prototype Data

Some GIS scenarios can use controlled demonstration data.

This is useful for SIH demonstrations but must be clearly separated from
production/live data and is enabled only by `VITE_DEMO_MODE=true`.

SENTRY operational records require a configured MongoDB deployment and
verified source data. This repository's unit tests do not establish that
production data, MongoDB index rollout, or live external feeds are
available or correct.

------------------------------------------------------------------------

## 2. AI Dependency

The optional AI layer depends on external provider availability and
configuration.

The baseline risk engine should remain available independently.

------------------------------------------------------------------------

## 3. Weather Provider Dependency

Weather information depends on external services.

Production deployments should implement caching, retry logic and
provider fallback.

Geo-targeted alerts are saved for authority review and mapped to their
registered targets. SMS/email transport and district-wide recipient
subscriptions are not configured, so the application cannot claim
resident delivery.

------------------------------------------------------------------------

## 4. Emergency Resource Data

Hospitals, shelters and emergency resources require authoritative and
regularly maintained datasets for production use.

------------------------------------------------------------------------

## 5. Live Route Safety

Live command maps do not receive a verified origin/destination and
physical road-clearance contract for relocation routes. A traffic route
alone cannot prove that a corridor is safe during a disaster. Routes
without recorded physical road status are not offered as recommended
safe routes; route planning requires a deployment-configured provider
and verified road/incident conditions.

------------------------------------------------------------------------

## 6. Offline Synchronization

The prototype contains the foundation for low-network/offline support,
but complete offline incident synchronization requires additional work.

------------------------------------------------------------------------

## 7. Production Security Hardening

The SIH prototype requires additional infrastructure hardening before
deployment for large-scale government or public use.

------------------------------------------------------------------------

# Future Roadmap

## Phase 1 --- Prototype Stabilization

-   Complete API integration
-   Improve error states
-   Remove accidental demo fallbacks
-   Improve testing
-   Improve GIS reliability
-   Improve mobile responsiveness

------------------------------------------------------------------------

## Phase 2 --- Real-Time Operations

-   WebSocket/SSE updates
-   Real-time incident feeds
-   Live authority alerts
-   Live resource availability
-   Live road conditions
-   Real-time evacuation status

------------------------------------------------------------------------

## Phase 3 --- Advanced GIS

Add:

-   High-resolution terrain
-   Slope analysis
-   Satellite layers
-   Soil moisture
-   Historical landslide layers
-   Infrastructure dependency maps
-   Advanced hazard heatmaps

------------------------------------------------------------------------

## Phase 4 --- IoT Integration

Potential sensors:

-   Soil moisture
-   Rain gauges
-   Ground movement
-   Slope deformation
-   River/water level
-   Weather stations

Pipeline:

``` text
Sensor
   ↓
IoT Gateway
   ↓
Data Validation
   ↓
Time-Series Storage
   ↓
Risk Engine
   ↓
Alert
```

------------------------------------------------------------------------

## Phase 5 --- Predictive AI/ML

With sufficient historical data:

-   Calibrated, hazard-specific probability estimates only after
    validation against historical outcomes
-   Time-to-event estimation
-   Image-based slope damage classification
-   Incident-description analysis
-   Regional model calibration
-   Anomaly detection
-   Risk trend forecasting

AI should be evaluated against real historical outcomes rather than
treated as automatically correct.

------------------------------------------------------------------------

## Phase 6 --- Advanced Emergency Optimization

Future versions can optimize:

-   Evacuation routes
-   Emergency vehicle routing
-   Resource allocation
-   Shelter selection
-   Hospital selection
-   Multi-team dispatch
-   Road blockage impact
-   Infrastructure dependencies

------------------------------------------------------------------------

## Phase 7 --- Offline & Low-Network Resilience

Future implementation:

``` text
Web / Mobile Client
       ↓
Local IndexedDB
       ↓
Offline Incident Queue
       ↓
Network Restored
       ↓
Synchronization Service
       ↓
Backend
```

Potential additions:

-   PWA
-   Service Worker
-   IndexedDB
-   Offline maps
-   Queued reports
-   Conflict resolution
-   Background synchronization

------------------------------------------------------------------------

# Why SENETRY

SENETRY is designed as an **operational decision-support system**,
not only a dashboard.

A typical information portal may answer:

> What is happening?

SENETRY attempts to continue the workflow:

> What is happening → Why is the risk changing → Who needs to know →
> What should be checked → What response should be considered?

The platform therefore connects:

``` text
Data
 ↓
Intelligence
 ↓
Visualization
 ↓
Communication
 ↓
Response
```

This creates a more complete disaster-management workflow.

------------------------------------------------------------------------

# Why SENETRY is Different

The differentiating concept is **integration of the operational chain**.

Instead of separate modules:

``` text
Weather App
    +
Map
    +
Complaint Form
    +
Alert System
```

SENETRY connects them:

``` text
Weather
   +
Hazards
   +
Citizen Reports
   +
Historical Context
        ↓
Risk Intelligence
        ↓
GIS
        ↓
Alert
        ↓
Authority Verification
        ↓
Emergency Prioritization
        ↓
Response
        ↓
Resolution
```

The platform also keeps the citizen and authority experiences different.

Citizens need simple, actionable information.

Authorities need detailed operational information.

Administrators need governance controls.

------------------------------------------------------------------------

# Why Team Nirvana

Our team name is **Nirvana**.

For the project, the name represents the idea of reaching a safer and
more stable state after a period of uncertainty and disruption.

SENETRY follows the same conceptual direction:

``` text
Hazard / Uncertainty
        ↓
Awareness
        ↓
Understanding
        ↓
Coordinated Action
        ↓
Safer Outcome
```

Therefore:

**Nirvana represents the desired outcome --- a safer, more resilient
state --- while SENETRY represents the technology and operational
process used to move toward it.**

------------------------------------------------------------------------

# Why This Approach

## Why not train a large AI model locally?

A 10-day SIH prototype should prioritize:

-   Reliability
-   Explainability
-   Integration
-   Demonstrability
-   Real-world data flow

A large model would require:

-   Large datasets
-   Training infrastructure
-   GPU resources
-   Model validation
-   MLOps
-   Longer development time

Instead, SENETRY uses an explainable baseline and allows external AI
assistance where useful.

------------------------------------------------------------------------

## Why GIS?

A disaster is inherently geographical.

A list such as:

``` text
Incident: Landslide
Risk: High
```

does not tell an authority enough.

A map can show:

``` text
Incident
   +
Road
   +
Hospital
   +
Shelter
   +
Population / settlement
   +
Risk Zone
   +
Route
```

This makes spatial relationships easier to understand.

------------------------------------------------------------------------

## Why citizen reporting?

Official sensors and datasets cannot observe every road, slope and
settlement continuously.

Citizens can provide ground-level observations such as:

-   New cracks
-   Slope movement
-   Flooding
-   Road blockage
-   Infrastructure damage

These reports become another signal in the decision-support pipeline.

------------------------------------------------------------------------

# SIH Demo Flow

A recommended demonstration sequence is:

## Step 1 --- Citizen

Login as a citizen.

Show:

-   Local risk
-   Weather
-   Live Safety Map
-   Nearby hazards
-   Emergency controls

------------------------------------------------------------------------

## Step 2 --- Citizen Reports Incident

Create:

``` text
Incident:
Slope movement

Severity:
High

Location:
GPS

Evidence:
Photo
```

Submit the report.

------------------------------------------------------------------------

## Step 3 --- Backend

Show that the incident is stored and available through the API.

``` text
POST /api/incidents
```

------------------------------------------------------------------------

## Step 4 --- GIS

Show the incident appearing on the map.

``` text
Citizen Report
       ↓
Backend
       ↓
GIS Marker
```

------------------------------------------------------------------------

## Step 5 --- Risk

Run the risk assessment.

Show the risk index, classification, available contributors, and source
limitations. Do not present that index or data completeness as a
calibrated event probability.

------------------------------------------------------------------------

## Step 6 --- Authority

Log into the authority dashboard.

Show:

-   Incident
-   GIS
-   Risk
-   Alerts
-   Emergency priority
-   Resources

------------------------------------------------------------------------

## Step 7 --- Response

Demonstrate:

``` text
Incident
 ↓
Priority
 ↓
Resource
 ↓
Response Unit
```

------------------------------------------------------------------------

## Step 8 --- Notification

Authority broadcasts a warning.

Citizen receives:

``` text
Authority Notification
```

------------------------------------------------------------------------

## Step 9 --- Resolution

Move the incident through the status workflow:

``` text
Submitted
 ↓
Verified
 ↓
In Progress
 ↓
Resolved
```

------------------------------------------------------------------------

# Example Risk Decision

A simplified example:

``` text
Rainfall severity          → +20
Recent incidents           → +20
Slope / terrain risk       → +20
Road condition             → +10
Hazard context             → +10
                            ----
                             80
```

Result:

``` text
80 / 100
CRITICAL / HIGH
```

The actual production weighting should be calibrated against validated
regional datasets.

------------------------------------------------------------------------

# Design Principles

SENETRY follows several design principles.

### 1. Explainability

Risk should have understandable contributors.

### 2. Role Separation

Citizens, authorities and administrators have different
responsibilities.

### 3. Location Awareness

Disaster information should be geographically relevant.

### 4. Human Verification

Citizen reports should not automatically become official warnings.

### 5. Graceful Failure

External service failure should result in an explicit unavailable state
rather than fabricated live data.

### 6. Scalability

The prototype architecture should have a path toward distributed
services.

### 7. Low-Network Resilience

The system should eventually remain useful when connectivity is
unreliable.

### 8. Action-Oriented Design

The platform should help users decide what to do next.

------------------------------------------------------------------------

# Testing

Before a demonstration, verify:

``` text
[ ] Backend starts successfully
[ ] MongoDB connection works
[ ] Frontend starts successfully
[ ] Signup works
[ ] Login works
[ ] Citizen dashboard works
[ ] Authority login works
[ ] Admin approval works
[ ] Incident submission works
[ ] GPS coordinates are captured
[ ] Incident appears on GIS
[ ] Weather loads
[ ] Risk analysis works
[ ] Alerts load
[ ] Notifications load
[ ] Emergency module loads
[ ] Resource module loads
[ ] Mobile layout works
[ ] No secrets are committed
```

------------------------------------------------------------------------

# GitHub Security

Never commit:

``` text
.env
API keys
JWT secrets
MongoDB credentials
Admin passwords
Cloud credentials
Private certificates
```

Use:

``` text
.env.example
```

for documenting required variables.

------------------------------------------------------------------------

# Team

**Team Nirvana**

SENETRY is being developed by a six-member college team with
responsibilities covering:

-   Backend & system integration
-   Frontend & command center
-   GIS & mapping
-   Risk intelligence
-   Incident reporting & alerts
-   Resources / analytics / operations

The project follows a shared-integration approach so individual modules
become one end-to-end platform.

------------------------------------------------------------------------

# Contributing

1.  Create a feature branch.

``` bash
git checkout -b feature/your-feature
```

2.  Make focused changes.

3.  Test frontend and backend independently.

4.  Do not commit secrets.

5.  Keep API contracts consistent.

6.  Open a pull request.

7.  Resolve integration conflicts before merging.

------------------------------------------------------------------------

# License

This repository is currently an academic / Smart India Hackathon
project.

If the project is released publicly beyond the competition, add an
explicit open-source or proprietary license here.

------------------------------------------------------------------------

# Project Summary

**SENETRY (SENTRY)** is an explainable multi-hazard decision-support
platform for habitation risk assessment, relocation planning, and
emergency response in the North Eastern Region.

Its core idea is:

``` text
DETECT
  ↓
UNDERSTAND
  ↓
ASSESS
  ↓
WARN
  ↓
PRIORITIZE
  ↓
RESPOND
  ↓
VERIFY
```

The platform combines:

**Citizen Reporting + Weather + Hazard Data + Risk Intelligence + GIS +
Alerts + Emergency Operations**

into one connected workflow.

> **SENETRY --- From early signals to coordinated action.**
# SENETRY

This copy contains Sampad's GIS integration work. The decision map now opens
with dark OpenStreetMap (Sampad GIS) as the default basemap and keeps the SENTRY Leaflet layers
for incidents, red zones, habitations, relocation sites, routes, facilities,
alerts, resources, and live feeds.

## Basemap

The default map is **Sampad GIS**, the dark OpenStreetMap style (no API key required). Plain light OpenStreetMap is also available.
Other styles: Esri Satellite / Terrain / Dark. Google Maps was removed. No custom India boundary overlay is drawn; the map shows OpenStreetMap as-is.


Never put database, JWT, Gemini, news, or other server-only credentials in `frontend/.env`.

## Run

```bash
cd frontend
npm install
npm run dev
```

The backend remains in `backend/` and retains the integrated SENTRY API and
existing authentication, incident, risk, alert, resource, habitation, and
relocation services.

## Live road routing

Authority users can select an incident and request a road route to the nearest listed hospital or available registered relocation site. The destination is chosen by straight-line proximity, then the road geometry and estimated driving time come from OSRM. The estimate does not include live traffic or verified SENTRY road closures. The public OSRM server is a best-effort demo with no uptime guarantee, so production deployments should use a hosted provider with an SLA or run their own router. The FreeRoute endpoint returned HTTP 500 during the latest check and is not configured.


## India / Delhi NCR Disaster Response Command Center

The authority landing page (`/dashboard/authority`, navbar item **Command Center**) is a single-screen operations HUD
for **Delhi NCR** and **All India**. It replaces the old Overview link in the authority navbar (the `/operations-overview`
route and its code are kept). The original project is untouched: the backup is `SENTRY-SIH26191-V5-backup-20261030`.
There is no CCTV, drone or camera panel, and nothing on the page is simulated.

### What is on the page

| Area | Content | Source |
|------|---------|--------|
| Header | Incident total and Critical / High / Medium / Low tiles, new-in-24 h counts, open relocation sites, IST clock, weather (NCR point, or average of 12 cities for India), AQI, live status of each data feed | SENTRY API, Open-Meteo |
| Map | The existing SENTRY map (incidents, zones, routes, layers, animations) with tabs Live / Satellite / Terrain / **Rainfall** / **River levels**, record search, hazard filter chips, Focus / Full screen / Share / Print | SENTRY API, NASA GIBS IMERG, Open-Meteo flood |
| Right column | Live satellite (Himawari-9 infrared, VIIRS true colour, rainfall), river monitoring with 14-day trend and 7-day model outlook, alerts and hazards (NDMA SACHET, GDACS cyclone and flood, USGS earthquakes) | NASA GIBS, Open-Meteo, NDMA, GDACS, USGS |
| Bottom row | Active incidents table (click an ID to fly the map there), resource deployment, evacuation and road access, incident trend (24 h / 7 d / 30 d), population at risk, forecast and risk alerts | SENTRY API, Open-Meteo |

All figures are counted or measured from real records. A source that fails shows "unavailable" (or the last good copy marked stale);
it is never replaced with a made-up number.

### Free data sources (no API key)

| Feed | Endpoint | Refresh | Terms |
|------|----------|---------|-------|
| Weather, forecast grid, air quality | `api.open-meteo.com`, `air-quality-api.open-meteo.com` | 10-30 min | Free for non-commercial use, CC BY 4.0, attribution required (shown in the page footer) |
| River discharge (GloFAS model) | `flood-api.open-meteo.com` | 60 min | Same as above. Modelled estimate, not a gauge reading, no official danger level |
| Official alerts (CAP) | NDMA SACHET `rss_india.xml`, fetched by the **backend** | 5 min server cache | Public feed; rate limited, so it is never called from the browser |
| Cyclone and flood events | GDACS `geteventlist` | 15 min | Free; cyclones near India and floods in India or neighbours only |
| Earthquakes | USGS FDSN event API (M 2.5+, 7 days) | 10 min | Free |
| Satellite and rainfall imagery | NASA GIBS WMTS (Himawari-9 IR, VIIRS, IMERG, coastlines) | on load | Free |
| Base map | OpenStreetMap tiles | on pan/zoom | OSM tile usage policy applies |

Forecast watch levels use IMD 24-hour rainfall classes (heavy 64.5 mm, very heavy 115.6 mm, extremely heavy 204.5 mm), Beaufort
gust levels, US AQI bands and IMD fog classes. They are model-derived advisories, labelled as such, not official warnings.

### New interfaces

* `GET /api/feeds/sachet` (backend, authority or admin only): cached NDMA SACHET alerts as `{ alerts, fetchedAt, cached, stale }`.
  The server fetches NDMA at most once per 5 minutes, shares the result with every browser, and serves the last good copy
  (flagged `stale`) for up to an hour if NDMA is unavailable.
* `GisCommandCenter` accepts optional props `embedded`, `basemapStyle`, `onBasemapChange`, `incidentIdFilter`, `overlay` and
  `onMapInstance`. Defaults keep every other page exactly as before.
* Frontend code: `pages/CommandCenter.jsx`, `components/commandcenter/*`, `hooks/usePolledFeed.js`, `hooks/useCommandCenterFeeds.js`,
  `services/commandCenter/*`, `utils/commandCenter/*`, styles in `css/india-command-center.css` (scoped to `.india-command-center`).

### Security notes

* No credentials are added to the browser. The only authenticated new call is `/api/feeds/sachet`, protected by the existing auth middleware.
* Browser requests to public feeds carry only public city and river coordinates. Record search runs locally over loaded SENTRY records.
* The page reads SENTRY data with the signed-in user's existing token; it does not write anything.

### Tests

`npm test` in `frontend/` (incident statistics, trend buckets, forecast and river rules, feed parsers, weather codes, record search, regions,
OSM routing adapter) and `npm test` in `backend/` (SACHET parser, caching, stale fallback). Browser checks were done against the running app
at 1920x1080, 1440x900, 1280x800 and 390 px wide.

### Limitations

* The seeded incidents are all several days old, so the "new in 24 h" tiles read 0 and the trend defaults to 7 days.
* Resources are registered per area (the seed data is in Sikkim); the panel shows all registered areas, not only the selected view.
* NASA IMERG on GIBS is a daily composite and can lag real time. Himawari-9 does not cover the far west of India well.
* Open-Meteo's free tier is non-commercial. A production deployment should use a commercial plan or a licensed alternative.
* The embedded map keeps its own fixed-width side panels, so the visible map is narrower on screens under about 1440 px.
* `Navbar.jsx` still has an older lint error about a state update inside an effect; it was not changed.


### Update: national and state views, 18-32 px text, state risk layer

* **Views.** The page opens on All India. Zooming onto a state (or clicking its badge or outline, or choosing it in the VIEW list) switches the whole dashboard to that state; zooming out or pressing All India returns. Delhi and its surroundings open the Delhi NCR view. The AUTO button turns zoom switching off. The state under the map centre opens once the view is about that state's size (at most 2.4 times its height, or 6.5 degrees of latitude); entering needs zoom 5.8 and leaving happens below 5.0.
* **State risk layer.** The map tints each state by its worst active incident level and outlines it; the open state is drawn brighter and the others fade. Hover shows counts, click opens the state. The STATE RISK button turns it off. The outlines are simplified Natural Earth shapes: near disputed borders they are not an official survey.
* **Every panel is filtered to the open view** (incidents, habitations, sites, resources, risk alerts, earthquakes and cyclone/flood events near it). Empty views say what is missing.
* **National panels:** incidents by type, top affected states, population at risk by state.
* **State alerts.** `GET /api/feeds/sachet?state=IN-KL` returns that state's NDMA feed (26 states have one; the other ten fall back to the all-India feed filtered by place names). Calls to NDMA are one at a time, 1.5 s apart, cached 5 minutes, and a missing feed is remembered for 12 hours. Regional-language alerts (Kerala's feed is all Malayalam) are shown as published, marked LOCAL LANGUAGE, with no guessed severity.
* **Text size.** All text on this page, including the embedded map, is between 18 px and 32 px (five tokens `--t-s` to `--t-2xl` in `css/india-command-center.css`). Overrides are scoped to this page only. Charts are drawn at real pixel width. The page therefore scrolls.
* **Responsive layouts:** under 2200 px the side panels move below the map; under 1700 px the rail becomes icons; under 1100 px everything stacks; under 760 px one column.
* **Code:** `utils/commandCenter/{scope,stateIndex,stateStats,scopeData}.js`, `hooks/{useStateIndex,useMapScope}.js`, `components/commandcenter/{StateRiskLayer,StateBadges,NationalPanels}.jsx`, `frontend/scripts/build-india-geodata.mjs`.
* **Limits.** All seeded incidents are in Delhi, so other states show zero incidents. State borders can misplace a point within a few km. River points exist for 25 places only. Place names on the OSM tiles are part of the map image and are not page text.


### Update: 3D satellite map (MapLibre GL)

The map now opens on a **3D MAP** tab (the earlier Leaflet map stays as LIVE MAP and is the automatic fallback if WebGL is unavailable). It uses `maplibre-gl` (already a dependency); no key and no new package.

| Layer | Source | Licence / cost |
|-------|--------|----------------|
| Darkened satellite imagery | Esri World Imagery tiles (already used by the Satellite tab) | Esri's terms apply; free for development and light use, check them before a commercial or high-traffic deployment |
| 3D terrain and hillshade | AWS Terrain Tiles (terrarium; SRTM, GMTED and others) | Open data, free |
| Roads, rivers, water, boundaries, labels, **building footprints and heights** | OpenFreeMap vector tiles (OpenStreetMap data) | ODbL, free, attribution shown on the map |

What it does: terrain exaggerated 1.5x with hillshade and sky; roads by class (expressways amber, highways orange, major roads white, local roads dim) with a soft glow; glowing rivers; state boundaries (glow), district boundaries from zoom 7; per-state risk tint fading out by city zoom; extruded buildings from zoom 12; incident points with halos and click popups; habitation points coloured by assessed risk; 2D/3D tilt buttons; the same zoom-to-state switching, state outline and picking as before. Map text is at least 18 px.

Honest limits:
* **Building heights** are OpenStreetMap's. Where OSM has no height or level count OpenFreeMap supplies 5 m; those buildings are drawn in a separate, dimmer tone (legend: "default 5 m height") and are not measured heights. Building coverage depends on OSM and is dense in big cities, thin elsewhere.
* **Disaster zones** are a modelled radius around each active incident (SENTRY stores a point, not an affected-area outline), drawn as polygons with soft edges. They are not surveyed boundaries. Surveyed polygons would need a data source this project does not have.
* Boundary lines are OpenStreetMap's and near disputed borders are not an official survey.
* Rainfall and River levels tabs use the 2D map. Esri imagery is raster, so it is not extruded; terrain comes from the elevation tiles.
* MapLibre 6 needs its worker file registered (`setWorkerUrl`, done in `Map3D.jsx`); without it the vector and elevation layers never load.
* Code: `components/commandcenter/Map3D.jsx`, `utils/commandCenter/map3dStyle.js` (style), `map3dData.js` (GeoJSON), with tests.


### Update: live hazard layers on the 3D map

Three layers fill the whole country from free feeds, so the map is not empty outside the states that have SENTRY incidents:

* **Rain / wind heat** (glow, green to red): Open-Meteo forecast for the next 24 hours at about 130 state capitals and cities (one request, refreshed every 30 minutes), weighted by the IMD heavy-rain step (64.5 mm = full) and gusts of 40 km/h and above, plus every active SENTRY incident by severity. A dry day shows little glow because the data is dry. The glow fades out by city zoom.
* **Active fires:** NASA GIBS VIIRS 375 m thermal anomalies for the previous day (WMS tiles), drawn as red points.
* **Hazard icons:** ongoing cyclone and flood events (GDACS), earthquakes of magnitude 3 and above (USGS), and a warning icon per active incident coloured by severity. Click an icon for details. Icons are drawn at run time on a canvas (`utils/commandCenter/map3dIcons.js`).

Limits: the heat is a forecast at city points, not a rainfall radar; fire detections are satellite passes, not confirmed incidents; GDACS and USGS are global feeds filtered to the India region.


### 3D map: provider research, architecture and limits

**Providers checked (all fetched from a browser with CORS on the day of writing):**

| Need | Provider | Key? | Cost / terms | India coverage | Verdict |
|------|----------|------|--------------|----------------|---------|
| Vector map, buildings, roads, water, labels | OpenFreeMap (OpenStreetMap) | No | Free, no stated request limit, ODbL attribution | All India; buildings dense in cities, thin in villages | **Used** |
| Imagery, primary | Esri World Imagery | No | Free to view with attribution; Esri's terms govern commercial and heavy use | Sub-metre in cities | **Used**; check the terms before a commercial launch |
| Imagery, fallback 1 | EOX Sentinel-2 cloudless 2024 | No | CC BY-NC-SA 4.0 (non-commercial), attribution | 10 m, to about zoom 13 | **Fallback** |
| Imagery, fallback 2 | NASA GIBS VIIRS true colour | No | Public domain | 250 m, to zoom 9 | **Fallback** |
| Elevation | AWS Terrain Tiles (terrarium) | No | Free; built from SRTM, GMTED and other open DEMs | All India, to zoom 15 | **Used** |
| Elevation (alternative) | Copernicus DEM GLO-30 on AWS | No | Free | Better than SRTM in places, but published as GeoTIFF files, not tiles | Not used: needs a tiling pipeline |
| Fires | NASA GIBS VIIRS 375 m | No | Public domain | All India | **Used** |
| Weather heat | Open-Meteo | No | Free for non-commercial use | All India | **Used** |
| Building footprints, alternative | Microsoft Global ML Building Footprints | No | ODbL | Covers India, but no heights | Not used: needs a tiling pipeline |
| Administrative boundaries, official | Survey of India, Bhuvan, mapservice.gov.in | Registration | Use is restricted and no open tile or polygon download was found | Official | Not used |

**Architecture.** One MapLibre GL map holds every layer: imagery (raster) and its two fallbacks, a terrain DEM for 3D relief and a second copy for hillshading, OpenFreeMap vector tiles for roads, rivers, boundaries, labels and extruded buildings, NASA fire tiles, and GeoJSON sources fed from the SENTRY API (incidents with clustering, drawn areas, relocation sites, habitations, state tint, heat points, hazard icons). Everything is loaded by the viewport, so nothing countrywide is held in the browser. The map watches its imagery tiles: eight failures in 30 seconds switch it to the next provider and show a notice; other layers failing shows a notice and the map keeps working. If WebGL is unavailable the page falls back to the earlier 2D map.

**Connected to SENTRY.** Incidents (position and severity), relocation sites (shown as safe places unless their road access is blocked), habitations, and **drawn areas**: authorities can press DRAW AREA, click the outline on the map, name it, choose affected area or safe zone and a severity, and save. The server (`POST /api/affected-areas`, authority or admin only) checks the outline (3 to 200 points, inside India, not crossing itself, not wider than 3 degrees) and stores it; every signed-in user sees it (`GET /api/affected-areas`). Areas are resolved by `PATCH`, not deleted. Selecting a state filters the incident figures as before.

**Not done, and why**
* **District boundaries and district names:** OpenStreetMap district lines are drawn from zoom 7, but district names are not labelled. An open, correct polygon set for Indian districts was not found: official Survey of India and Bhuvan data is restricted, and other sets (for example GADM) are not licensed for open reuse.
* **Self-hosted vector tiles (PMTiles / Geofabrik India extract):** the app depends on OpenFreeMap for vectors. The Geofabrik India file is about 1.5 GB and building tiles from it needs a tile-build tool (for example Planetiler) and storage. Imagery and elevation have fallbacks; vectors do not yet. This is the main remaining single point of dependence.
* **Evacuation routes on the 3D map:** road routing exists on the 2D map (OSRM); it is not drawn on the 3D map yet.
* **Building heights** are OpenStreetMap's; where it has none, 5 m is used and drawn in a separate tone.
* **Incident zones** without a drawn area are still a modelled radius around the incident point.
* Endpoint rate limits of the free providers were not published for Esri or OpenFreeMap; heavy public use would need a self-hosted or paid tile service.


### Update: map look (buildings, ground, camera)

* **Buildings:** colour now follows a charcoal / blue-grey / pale-grey scale by height class, with a repeatable per-building shade variation computed from the building's own height values (no random numbers, no invented data). A low directional sun (`light` in `map3dStyle.js`) gives each wall and roof its own brightness. MapLibre has no ambient occlusion or cast shadows; the depth you see is face lighting plus a vertical gradient. Heights are OpenStreetMap's; the 5 m default is still drawn in its own darker tone.
* **Ground:** the earlier muddy brown came from stacked tints: heavily desaturated imagery, the red state tint and the incident circle. Imagery grading is now close to natural (forests and farmland keep their colour, urban areas stay readable), the state tint is gone by zoom 11, and the incident circle is lighter.
* **Camera:** gentler default pitches (28 national, 48 state, 52 city, maximum 68), stronger terrain relief (1.7x), and a smoother fly-to.
* Satellite sources were compared again (see the provider table above). Esri World Imagery is still the sharpest legal free source for Indian cities; Sentinel-2 cloudless (EOX) is more even in colour but only 10 m and non-commercial, so it stays a fallback. CesiumJS with 3D Tiles was considered: Google Photorealistic 3D Tiles are paid and licensed against caching, Cesium ion's free tier is limited and has no complete India photogrammetry, so no free 3D Tiles source covers Indian cities and MapLibre extrusions remain the practical choice.


### Update: 3D globe tab (CesiumJS) and the God's Eye View comparison

**What was studied.** `bilawalsidhu/gods-eye-view` (MIT for the code; the data it shows keeps its own licences). Its map stack picks a provider from the credentials present: a Google Map Tiles key gives Google Photorealistic 3D Tiles directly; a Cesium ion token gives the same tiles through ion; with neither it falls back to OpenStreetMap or Esri imagery on open terrain (Re:Earth / Mapterhorn quantized mesh). The same order is used here (`utils/commandCenter/photorealRoute.js`, `components/commandcenter/Globe3D.jsx`). Nothing was copied from the repository.

**The new 3D GLOBE tab** loads CesiumJS 1.146 (Apache-2.0) from a CDN the first time it opens and draws a true globe: Esri imagery graded dark, 3D terrain, the state outlines tinted by incident level, incidents, drawn affected areas and safe zones, relocation sites, cyclone and flood events and earthquakes. Clicking a state opens it; clicking a record opens its details. It works with no key.

**What each route costs (checked against the providers' own pages)**

| Route | Needs | Cost and terms |
|-------|-------|----------------|
| Keyless (default) | nothing | Esri imagery terms; Re:Earth terrain is CC BY 4.0. No photorealistic buildings |
| Cesium ion token (`VITE_CESIUM_ION_TOKEN`) | free Cesium ion account | Free Community plan is for personal, non-commercial use, 1,000 Google root tiles a month; Commercial plan from $149 a month |
| Google key (`VITE_GOOGLE_MAP_TILES_API_KEY`) | Google Cloud project with billing enabled | Metered per root tile (Enterprise SKU). Tiles may not be cached or stored, may not be used for analysis or data extraction, and the Google logo and attribution must stay visible. Restrict the key to this site's address and to the Map Tiles API |

**Not verified.** Google 3D coverage of Indian cities could not be confirmed from Google's documentation (the coverage page is not machine readable) and needs a keyed request to check. The two keyed routes were written to the reference's pattern but **not run**, because no key exists in this project; only the keyless route was tested in a browser. Where Google has no mesh the globe simply shows the satellite surface.

**Not in the globe tab yet:** evacuation routes, hospitals (there is no hospital data in SENTRY), district boundaries, and the weather and river layers. They are still available on the 3D MAP tab.


### Update: free 3D buildings on the globe (Cesium ion Community) and building coverage in four cities

**Setup.** A free Cesium ion Community account (no card) and its **Default Token** (`assets:read`, `geocode` only) in `frontend/.env` as `VITE_CESIUM_ION_TOKEN`. Do not use the ion website's own "map" token: it carries write and delete rights. With the token the 3D GLOBE tab adds Cesium OSM Buildings and Cesium World Terrain. Google stays off unless `VITE_ALLOW_GOOGLE_3D=1` is also set.

**Licence.** Cesium's FAQ says a paid account is needed for a government project, for funded educational research, or when free limits are exceeded; the free plan covers non-commercial personal projects, exploratory evaluation (commercial or government) and unfunded educational use. A demo or test is inside that; an operational government deployment is not.

**Measured coverage** (OpenStreetMap through OpenFreeMap tiles, about 6 km square around each centre; "real height" means a value other than the 5 m default):

| Place | Building outlines | With a real height | Cesium OSM Buildings, seen on the globe |
|-------|-------------------|--------------------|------------------------------------------|
| Delhi (Connaught Place) | about 9,500 | 8% | Good in central Delhi, with varied heights |
| Mumbai (Bandra) | about 13,600 | 4% | Dense, but whole districts of roofs (blue-roof areas) have no building |
| Bengaluru (MG Road) | about 75,600 | 3% | Good, with taller blocks near the main roads |
| Dehradun (smaller city) | about 11,800 | 0% | Almost none around the railway station on the globe |

So footprints are plentiful in the big cities but heights are rare everywhere, and smaller cities can have large gaps. Buildings without a height are drawn at the default and marked as such. The data tests were run from this machine; the globe views were checked in the browser.

**Other free sources checked.** Overture Maps (latest release 2026-10-21.0) is openly downloadable and merges several sources with heights and floor counts where known; its completeness in these cities was not measured. Microsoft building footprints are openly downloadable (footprints only). OpenBuildingMap could not be reached. A self-hosted merge of OSM, Overture and Microsoft is the way to fill gaps without a provider limit; it needs a tile-build step and storage and is not built yet.


### Update: Delhi NCR building pilot (Overture Maps vs OpenStreetMap)

Same three areas, about 3.4 km square each. Overture release 2026-10-21.0, read from its public files; OpenStreetMap through OpenFreeMap tiles (the data behind Cesium OSM Buildings). "Recorded height" means a height in metres in the source.

| Area | Source | Footprints | Recorded height | Floor count only | Parts |
|------|--------|-----------:|----------------:|-----------------:|------:|
| Connaught Place | OpenStreetMap | 3,291 | 469 (14.3%) | not measured | not measured |
| | Overture | 9,831 | 11 (0.1%) | 295 (3.0%) | 159 parts on 59 buildings |
| Loni, Ghaziabad | OpenStreetMap | 24 | 0 | not measured | not measured |
| | Overture | 20,683 | 0 | 0 | 0 |
| Gurugram (Cyber Hub) | OpenStreetMap | 6,514 | 39 (0.6%) | not measured | not measured |
| | Overture | 9,203 | 4 (0.0%) | 28 (0.3%) | 3 parts on 1 building |

Overture merges Google Open Buildings, Microsoft ML Buildings and OpenStreetMap, so it has far more footprints (Loni: 15,809 Google and 4,853 Microsoft) but almost no heights, because those two sources carry none. Footprint quality looked sound: median 52 to 122 m2, 1 to 2% under 12 m2, almost none over 20,000 m2 (this is a size check, not a check against the ground).

**Choice per area (set in `PILOT_SOURCE`):** Connaught Place uses Cesium OSM Buildings, because heights matter most there and OSM has 14% against 0.1%. Loni and Gurugram use Overture, because it adds thousands of buildings OSM lacks (Loni 20,683 against 24). A **Compare** button on the globe switches between the two on the same streets.

**Height labelling.** Recorded height: steel blue, paler when taller. Floor count only: grey-blue, height = floors x 3.3 m (an assumption, labelled). Neither: dark charcoal at a 5 m default (a footprint, not a height). The globe panel shows the counts. Cesium OSM Buildings carry `cesium#estimatedHeight` on every building (3 m for all that were inspected), which is why they are styled by whether OSM has a `height`.

**Rendering.** Sun shadows switch on below 4.5 km camera height. Measured render cost with the Loni layer (20,683 extruded buildings): 1.3 ms per frame median with shadows, 0.7 ms without, on an RTX 5080; this is CPU-side timing on a fast GPU, not a frame rate on ordinary hardware. The building files (`public/data/buildings/*.json`, 11 MB in total) are loaded only when the camera is near an area, then drawn as one batched primitive. The Overture fetch script reads about 13 minutes of S3 data for the first area; it is a one-off build step, not part of the app.

**Not done.** The pilot is three areas, not India; extending it needs a tile build (a vector or 3D Tiles pipeline over Overture) rather than JSON files. Overture's own documentation says footprint precision can be lower in the Global South. Photogrammetry (textured roofs and facades) needs Google's paid tiles; no free source covers Indian cities. Building-part shapes are drawn where Overture has them (59 buildings in Connaught Place), so most buildings are plain extrusions.


### Update: map controls on every map, population from a live API

* **Controls.** The 3D GLOBE tab now has the same 2D / 3D, LAYERS (six switches) and DRAW AREA tools as the 3D MAP tab, and drawn areas are saved through the same `/api/affected-areas` route. The Live Map's own left-hand panel (Situation, Map key) is removed on this page; its Controls panel on the right stays.
* **Population.** The national figure is live from the World Bank API (`SP.POP.TOTL`, free, no key): India **1,463,865,525 in 2025**, refreshed daily. No free API gives state-level 2025/2026 population, so the state figures are **estimates**: the live national total spread by each state's 2011 census share. That under-counts fast-growing states (Bihar, Uttar Pradesh) and over-counts slow-growing ones (Kerala, Tamil Nadu). The page says so, and `api.txt` records every API used.


### Update: incident arrival animation and every state's population

* **Arrival animation (after the reference video).** When an incident appears, rings pulse out from its point and a callout chip names it (type, place, severity); the next one replaces the previous chip, and a counter shows how many incident events have played. It plays for a **new** incident (a citizen report or one made by an authority), for a **changed** one (severity or status), and, when the map opens, for every **existing** open incident one after another (oldest first, at most 20). It runs on the 3D MAP and the 3D GLOBE, and the Live Map's existing arrival sequence now also runs on the citizen map, limited to the incidents that citizen is allowed to see. The detector is `utils/commandCenter/incidentEvents.js` (tested); the hook is `hooks/useIncidentArrivals.js`. Callouts show coordinates when an incident has no address recorded. Reduced-motion settings turn the rings off.
* **Population for every state.** The panel lists all 36 states and union territories, largest first, each as an estimate (live World Bank national total x 2011 census share). The page says so.

## Controls panel on every map (3D map, 3D globe, Live Map)

**What changed.** The Live Map's Controls panel (map focus, new-report alert switch, relocation destination, emergency road route, layers, severity filter, map display, reset view, annotations) now also appears on the 3D MAP and the 3D GLOBE. It is the same `MapControls` component, given each map's own layer list and map displays (`primaryLayers`, `moreLayers`, `styleOptions`, `focusActiveId`). The shared state lives in `hooks/useSharedMapControls.js` (called from `MapPanel`); the pure parts (severity filter, saved points, route destination choice) are in `utils/commandCenter/mapControls.js` with tests. The page's own left navigation rail is gone, and the Live Map now fills the width that the hidden left panel used to take.

**Behaviour.** Severity filter: critical / high+ filter the incidents drawn. Annotations: saved points use the Live Map's storage key, so a point dropped on one map shows on the others. Relocation destination flies to the site. Emergency road route: pick an incident, then "route to nearest facility" (OSM road estimate, no live traffic). Map display on the 3D maps switches the imagery provider. Arrival animation: only for incidents added or changed while the page is open, and the "N events" counter appears with the first one. The animation watches the unfiltered incident list, so changing the filter never replays it.

**Security.** No new external services. Nothing is sent anywhere except the existing routing and hospital lookups already used by the Live Map.

**Limitations.** The incident API has no delete, so a test incident can only be marked resolved. The road route needs an incident to be selected on the map first.

## Drawn areas on every map, and the UI inventory

**What changed.** Affected areas and safe zones drawn by an authority now show on the Live Map and on the citizen's map (new Leaflet layer `AffectedAreaLayer`, popup with name, kind, severity and notes, "AREA" switch in the Controls panel). A newly drawn or changed area plays the same arrival animation as an incident on the 3D map, the 3D globe, the Live Map and the citizen map (`areasToArrivalIncidents` in `incidentEvents.js` turns an area into an incident-shaped record at the middle of its outline). The authority page refreshes drawn areas every 15 s with the incident refresh; any other page loads them every 30 s. The Live Map's arrival animation now also reacts to changed incidents, not only new ones (`getChangedIncidentIds`). `UI_INVENTORY.md` lists the buttons, icon buttons, links and fields on every authority and citizen page.

**Security.** Areas are read-only for citizens (the existing API only lets authority and admin accounts create them). No new external service.

**Limitations.** Detail pages, admin pages, dropdown menus and pop-ups are not yet counted in `UI_INVENTORY.md`. Citizen maps refresh every 60 s, so a change can take up to a minute to appear there.

## Header scope line (V6.3)

**What changed.** The tagline under the command-center title was removed in V6.3, which left an empty line. It now shows a live scope summary, built from the team's district list (`frontend/src/data/stateDistricts.js`): for a state, its district count (Andhra Pradesh: 28 DISTRICTS · LIVE MONITORING); for India, the number of states and union territories; for Delhi NCR, the region name. The logic is in `frontend/src/utils/commandCenter/scopeLine.js` (3 tests), the line is rendered in `HudHeader.jsx` and styled by `.icc-brand-line`. It is hidden on small screens, as the old tagline was.

**Why.** The numbers come from the data, so they cannot go out of date by hand. If you would rather bring the old tagline back, replace the `scopeLine(region)` call with the text `REAL-TIME · PREDICT · COORDINATE · RESPOND · SAVE LIVES`.

**Limitations.** Not yet checked on screen in a browser (the browser tool was not available when this was written).

## Header lines and "authorities online" (V6.3)

**What changed.** The line under the command-center title now takes turns (every 6 s) between: the area watched (districts, or states and union territories), the newest open incident as a ticker ("LATEST · SLOPE CRACK · 6 D AGO"), an all-clear line shown only when no critical incident is open in view, and "N AUTHORITIES ONLINE". Lines whose data is missing are left out. Logic: `frontend/src/utils/commandCenter/headerLines.js` (5 tests).

**Presence.** A browser showing any SENETRY page sends a heartbeat every 30 s (`POST /api/presence/heartbeat`, `frontend/src/hooks/usePresence.js`, mounted once by `PresenceBeat` in `App.jsx`). A hidden tab, closed tab (`/api/presence/leave` on page hide), logout or lost connection stops the beats; the server counts a person as online for 75 s after their last beat (`backend/services/presence.js`, 4 tests). `GET /api/presence/summary` returns only a count of verified authorities, never names, and only to authority and admin accounts. New field: `users.lastSeenAt`.

**Security.** Counts only; citizens cannot read the count; logout clears the stamp.

**Limitations.** Citizens are not counted on the header (by design). A tab left visible but idle still counts. Hidden-tab behaviour is not yet checked in a browser. "N days without a critical incident" was not built: the page only loads open incidents, so it cannot know the history.

## Arrival effect on the citizen map and the Live Map (V6.3)

**What changed.** The effect from the reference video (big rings, a dotted arc from the previous event with a travelling dot, and an "INCIDENT ALERT · N EVENTS" counter) now also plays on the Leaflet maps: the citizen dashboard map and the authority Live Map. New layer: `frontend/src/components/gis/layers/IncidentVideoFx.jsx`, styles `.gis-fx-*` in `gis.css`. The red wash and the callout card still come from `IncidentArrivalFlash` and `IncidentLayer`. It plays only for incidents added or changed while the page is open (an incident added by a citizen or an authority), never for the ones already there when the map loads, and it follows the "Arrival motion" switch and reduced-motion settings. The citizen map now refreshes incidents every 20 s (the Live Map keeps 60 s).

**Security.** The citizen map only animates incidents it already shows (within 100 km of the citizen when the location is known).

**Limitations.** Checked in a browser through the page elements (rings, counter and card appeared about 12 s after an authority added an incident); not yet checked by eye. A new incident outside the part of the map on screen plays off-screen, though the counter still shows.

## Arrival effect: polished map markers (V6.3)

**What changed.** The first versions of the arrival effect (comet, target reticle, red screen flash, glowing rings) were replaced by normal emergency-map markers with a little depth, on the citizen map, the authority Live Map, the 3D map and the 3D globe:
- a **glossy location pin** in the severity colour (gradient, highlight, soft shadow on the ground) that drops onto the place, with a white badge showing the kind of incident: flood, fire, landslide, earthquake, road/infrastructure, or a plain dot;
- a **two-tone navigation arrow** (light upper half, dark lower half, white edge) that travels along a thin dashed connector with a dark casing, from the previous event to the new one (the connector links two incidents; it does not claim a vehicle is travelling);
- one thin ring spreading out, a fixed "INCIDENT ALERT · N EVENTS" counter, and the existing callout card;
- no full-screen red flash; events start 120 ms apart.

**Responsive.** All shapes scale together with `--fx-k` (1, 0.85 below 900 px, 0.7 below 600 px); on the globe the scale follows the canvas width; the counter text shrinks on phones.

**Where.** Shapes, shading and symbol table: `frontend/src/utils/commandCenter/fxMarkup.js` (5 tests). Symbols: `lucideGlyphs.js`. Leaflet layer: `components/gis/layers/IncidentVideoFx.jsx`. 3D map: `Map3D.jsx`. Globe: `cesiumRipples.js` (draws the same paths and shading onto a canvas). Styles: `.fx-*` in `gis.css`.

**Licences.** The incident symbols are Lucide icons (flame, waves-horizontal, mountain, activity, traffic-cone), ISC licence, already installed with `lucide-react`; their licence text is in `node_modules/lucide-react/LICENSE`. Nothing was downloaded from the internet.

**Limitations.** Checked by eye on the citizen map (two pins with symbols, the arrow on the connector, counter, no red wash). The 3D map and the globe use the same shapes and are built and tested but not yet checked by eye; the phone sizes were not checked on a real phone. The "citizen report flag" and "ambulance" ideas from the design brief are not built: the data cannot tell a citizen report from an authority one, and there is no vehicle tracking.

## Citizen text size (18-32 px)

All visible text on the citizen pages is now between 18 px and 32 px, the same rule as the command center. `App.jsx` puts a `role-citizen` class on the page layout when the signed-in user is a citizen, and `frontend/src/css/citizen-text.css` (loaded from `main.jsx`) clamps the sizes under that class, so authority pages are not changed. The `gis-cz-*` and dashboard rules were also clamped at the source (`gis.css`, `Dashboard.css`). Checked with a DOM scan on the dashboard, weather, my incidents, report incident, emergency resources, habitations and relocation sites pages (0 text nodes outside the range). Limitation: pages not reachable from the citizen menu (e.g. incident details) were not scanned.

## Citizen map views, redesigned markers, people nearby

What changed
- **Citizen map selector.** The citizen dashboard now has LIVE MAP / 3D MAP / 3D GLOBE tabs (`components/gis/CitizenMapViews.jsx`). Only the chosen view is mounted. The 3D views use the same Map3D / Globe3D as the command center, fed with the same incidents, shelters, habitations and drawn areas (refreshed every 20 s). If WebGL is missing, the flat map is shown with a note.
- **Black cluster disc removed (3D map).** An incident cluster is now an orange badge with a white edge and dark number plus a faint outer ring (`map3dStyle.js`). The green glow was the incident halo layer drawing under clusters; it now skips clusters.
- **Zone markers.** The yellow squares / orange diamonds / red triangles / green circles are replaced by the same glossy pin as the arrival effect, in the zone colour, with a sign for the level (alert, warning, eye, shield) so the level does not depend on colour alone (`fxMarkup.zonePinMarkup`, `RedZoneLayer`, legend). Relocation connector lines are thinner and fainter.
- **People nearby (no chat).** A citizen can switch "sharing" on; while on, they appear to other people who also have it on, and to authority and admin accounts, and they see those people on the map and in a list. Backend: `models/nearby_share.js`, `services/nearbyPeople.js`, `routes/nearby_routes.js` (`PUT/DELETE /api/nearby/me`, `GET /api/nearby`). Frontend: `components/citizen/NearbyPeople.jsx`, `hooks/useNearbyPeople.js`, `components/gis/layers/NearbyPeopleLayer.jsx`; the authority command center map shows everyone who is sharing.

Security and privacy
- Off by default. Sharing stops when switched off, on logout/leaving the page (`pagehide`), and an entry is dropped by itself after 150 s without a refresh (database TTL 300 s).
- Shared: first name, status (needs help / can help / safe / sharing), place rounded to about 100 m. Not shared: account id, phone, e-mail, address. No messages.
- A citizen sees others only while sharing themselves; authority and admin always see everyone. Places can be searched with OpenStreetMap Nominatim (only the typed words are sent).

Tests: backend `tests/nearby_people.test.js` (6), frontend `utils/nearbyPeople.test.js` (3).

Limitations: the place is approximate but still tells people roughly where someone is, so the panel warns users; 3D views do not show the people pins yet; the 3D map does not fly to the citizen when location permission is missing.

## Citizen dashboard order and fixes

The citizen dashboard is now laid out in a fixed order, with a small sticky menu that jumps to each part (Your area, Map, Warnings and roads, People nearby, Alerts, My reports): risk / weather / emergency numbers, then the map (LIVE MAP / 3D MAP / 3D GLOBE), then nearby warnings and road status, then people nearby, authority notifications and my reports. Long lists (road status) scroll inside their card, and the risk card no longer leaves a blank gap. Also in this round: one danger zone per place instead of one per incident (`utils/gis/dangerZoneGroups.js`), 3D cluster number drawn above place names, dark map credits strip. Tests: `dangerZoneGroups.test.js`.
Known limits: the satellite panel depends on an external NASA feed that sometimes returns empty tiles; the phone check was made in a 390 px frame, not on a real phone.

## Safe places and quick status (citizen)

- **Safe places near you** (`components/citizen/SafePlaces.jsx`, `utils/safePlaces.js`): the three closest active relocation sites with direct distance, free places, road access, facilities and a directions link to OpenStreetMap (only the two coordinates are in the link, and only when the person clicks it). A site with a blocked road is not ranked ahead of an open one at about the same distance.
- **Quick status** in People nearby: "I NEED HELP NOW" and "I AM SAFE" switch sharing on with that status, so nearby sharers and authorities see it on the map. They do not call anyone; "Call 112" is a normal phone link.
- Limits: authority sees these as map pins only (no alert sound or counter yet); distances are straight-line, not road distances.

## More natural hazards for authority (NASA EONET, heat, cold, storm energy, snow, UV)

- **EVENTS tab** in ALERTS & HAZARDS (`services/commandCenter/eonetFeed.js`): open natural events from NASA EONET around India for the last 30 days: severe storms and cyclones, wildfires, volcanoes, floods, landslides, drought, dust and haze, snow, temperature extremes. They are also drawn on the 3D map (and listed on the globe) with their own symbols (fire, volcano, storm bolt, snow, heat, dust). "NASA EONET" is a new line in the data-feed list.
- **More watch levels from the 24 h forecast** (`utils/commandCenter/forecastAlerts.js`): heat wave (40 / 43 / 45 C), cold wave (6 / 4 / 2 C), thunderstorm energy (CAPE 1500 / 2500 / 3500 J/kg), snowfall (5 / 15 / 30 cm) and UV (8 / 11), next to rain, wind, air quality and visibility. Each alert carries the figure that triggered it and is a model advisory, not an official warning. Thresholds follow IMD / WHO classes.
- **Help requests** (`components/commandcenter/HelpRequests.jsx`): authority and admin see a red strip when citizens switch on sharing with "needs help", hear a short beep for a new one, and can answer "Help is on the way" or "Noted"; the citizen sees the answer in their People nearby card.
- Tests: `eonetFeed.test.js`, `extremeAlerts.test.js`, `helpRequests.test.js`, backend `nearby_people.test.js`.
- Limits: EONET events are shown on the 3D map and globe but not yet on the flat Live Map; thunderstorm risk comes from model CAPE, not a lightning feed; no tsunami, drought-index or landslide-susceptibility feed yet; the beep can be blocked by the browser until the page has been clicked.

## Fix: India view flipping to a state by itself (3D map)

On a very wide screen the 3D map's camera limit (a 42 degree box) forced a minimum zoom of about 5, above the zoom where auto switching opens a state (4.8), so a resize of the map made the whole page jump from India to the state under the centre (for example Chhattisgarh). The camera limit is now much wider (`INDIA_BOUNDS` in `Map3D.jsx`) and the India fit is capped below the switching zoom. Checked in the browser: zoom 3.94, view stays All India with a help request showing.

## Natural events on the flat Live Map

`components/gis/layers/NaturalEventsLayer.jsx` draws the GDACS and NASA EONET events (cyclones, floods, storms, wildfires, volcanoes, dust, snow, temperature extremes) on the flat Live Map with the same glossy pins as the other markers, and draws the path a cyclone has taken so far as a dotted line (EONET keeps the earlier positions in `track`). Symbol and colour come from a fixed table in `utils/commandCenter/naturalEvents.js`, never from feed text. Tests: `naturalEvents.test.js`. Limit: the track is the positions NASA reports (a few per day), not a forecast cone.

## Citizen: new-incident alert, road time to shelters; authority: drought feed

- **New-incident banner** (`components/citizen/IncidentAlertBanner.jsx`, `utils/incidentAlerts.js`): while the citizen page is open, a Critical or High incident that appears within 100 km (and was not there when the page opened) shows a banner with a short beep. Tested in the browser by feeding the page one extra test incident (nothing was written to the database).
- **Road time to safe places** (`services/routeEta.js`): the three closest shelters show driving time and road kilometres from the public OSRM server (only the two places' coordinates are sent); if it cannot be reached, the straight-line distance stays.
- **Drought** events from GDACS now appear in HAZARDS. GDACS has no open tsunami event right now (its answer is empty), and that does not hide the other types.
- The citizen text is English only. A Hindi version was built and then removed on request.
- Limits: not tested on a real phone; the report list does not yet show step-by-step progress (received, verified, responding, resolved).

## India-specific risks added to the watch levels

Chosen for what actually hurts people in India (volcano feeds were left out on purpose):
- **Landslide watch** (`landslideWatch`): heavy forecast rain (35 / 64.5 / 115.6 mm in 24 h) on high ground (500 m or 1000 m, from the height Open-Meteo reports for each place). A rule of thumb from the forecast, not a slope or soil model, so it only says "watch".
- **Sea waves** (`waveCategory`, Open-Meteo Marine): rough 2.5 m, very rough 4 m, high 6 m. Inland places have no wave figure and are skipped; a coastal place near a cyclone gets an early warning of rough seas.
- **Thunderstorm and lightning risk**: from model storm energy (CAPE). Open-Meteo's lightning field is empty for India, so no direct lightning forecast is claimed.
- **Tsunami**: quakes for which USGS records a tsunami message show a red "TSUNAMI MESSAGE" badge in the QUAKES tab; GDACS tsunami events are included when it publishes one.
- Already there: cyclone (GDACS, NASA), flood (GDACS, river model, rainfall), earthquake (USGS), heat wave, cold wave, drought (GDACS), wildfire (NASA), snow, dust and haze, air quality, fog, UV.
- Tests: `indiaRisks.test.js`. Checked in the browser for India, Uttarakhand, Tamil Nadu and Delhi NCR (no console errors; no wave or landslide alert was active at that moment, so those two were checked by unit tests only).
- Not covered: glacial lake outburst, a direct lightning feed, soil-moisture drought indices.

## Full check of both systems (authority and citizen): what was found and fixed

Checked by an audit script in the browser (text size, clipped text, overlaps, icon buttons without a name, broken images, unlabelled inputs, duplicate ids, sideways overflow) on every authority and citizen page, then by API tests as the authority, as the citizen and with no sign-in.

Security (backend), found by those tests:
- `/api/resources` had **no sign-in check at all**, including create and update. Now: signed in to read (all roles), authority or admin to create or change.
- `/api/notifications` was open: anyone could read them, **send a broadcast to all citizens** and mark everything read. Now: signed in for everything, authority or admin only for `/broadcast`; the broadcast input is validated (400 instead of a server error).
- `POST /api/auth/reset-password-prototype` changed any account's password knowing only the e-mail. Now: never for authority or admin accounts, off in production unless `ALLOW_PASSWORD_RESET_PROTOTYPE=true`, and the old login session ends after a reset. A real e-mailed link or code is still needed before this is safe for citizens too.
- New test `route_access.test.js`: every route of resources, nearby, affected areas, presence, red zones, relocation sites, habitations, notifications, alerts, relocation priority and feeds must pass the sign-in check.
- Still open by an existing decision (not changed): `GET /api/emergency-priority` allows anonymous reads (a test in `emergency_route_auth.test.js` records this as a contract) and `GET /api/incidents/evidence/:fileId` needs no sign-in (images are loaded by plain `<img>` tags). Both should be reviewed by the team.

Pages:
- Authority pages other than the command center now use the same 18-32 px text rule as the citizen pages (`css/authority-text.css`), with proper side space; sign-in / sign-up pages too (`css/auth-text.css`).
- Emergency Response cards all said "#1"; they now rank #1, #2, #3 ...
- Map pin gradients had duplicate ids; every pin now has its own.
- The report form's fields now have labels.

Checked with no failure: citizen refused (403) on 25+ authority/admin actions, authority refused on admin actions, malformed or hostile input to the nearby service (strings, objects, NaN, huge numbers, a 2 MB body, bad JSON) answered with 400/413, forged tokens refused, 150 parallel reads and 60 parallel writes all answered 200.

## SENETRY V7 (release notes)

V7 is V6.3 plus everything in the sections above: citizen map views (live map, 3D map, 3D globe), glossy zone and event pins, people nearby with SOS and authority answers, safe places with road time, new-incident banner, NASA EONET / drought / heat / cold / thunderstorm / landslide-watch / sea-wave / tsunami-message watch levels for India, a 18-32 px text rule on every authority and citizen page, English-by-default alerts (regional-language NDMA alerts are one click away), and the security fixes for resources, notifications and password reset.

To run: install with `npm install` in `backend` and `frontend`, copy `backend/.env.example` to `backend/.env` and fill it in (and `frontend/.env.example` to `frontend/.env`), then start the backend (`node index.js`, port 5000) and the frontend (`npx vite --port 5175`), or use `Start.bat`. Tests: `npm test` in each folder (frontend 260, backend 81 at the time of this release).
Not in the zip on purpose: `.env` files, `API_KEYS.txt`, `api.txt`, `node_modules`, `dist`.
