# AI-Driven Real-Time Patient Queue & Appointment Optimization Platform

## 🎯 Problem Statement
Hospitals face long waiting times, inefficient queue management, and uneven patient distribution across departments. The system aims to optimize hospital patient flow using real-time monitoring, queue management APIs, and predictive analytics.

## 🏥 Proposed Solution
We developed a real-time hospital queue management platform that monitors patient flow, detects crowded departments using a heatmap, and dynamically manages hospital queues through backend APIs.

**The system uses:**
*   Real-time data processing
*   Queue management algorithms
*   Heatmap visualization
*   Scalable API-based architecture

*Future extension includes AI-based waiting time prediction and appointment optimization.*

## 🌡️ Core Feature — Real-Time Hospital Heatmap
*   Department-wise crowd visualization
*   Color scale → Green (Low), Yellow (Medium), Red (High)
*   Shows patient load vs capacity
*   Updates dynamically from backend data
*   Detects congested hospital areas
*   Helps hospital administrators manage resources
*   👉 *Implemented using backend API and database data.*

## 👨‍💼 Admin Dashboard
*   Current queue overview
*   Total patients monitoring
*   Department load monitoring
*   Real-time heatmap visualization
*   Patient arrival analytics
*   Queue status tracking
*   **Purpose:** Monitor hospital flow and manage system.

## 👨‍⚕️ Doctor Dashboard
*   Patient queue list
*   Patient details and disease info
*   Estimated waiting status
*   Optimized treatment order
*   Queue management interface
*   **Purpose:** Improve doctor workflow efficiency.

## 🧑‍🤝‍🧑 Patient Dashboard
*   Queue status display
*   Waiting time status
*   Appointment information (planned extension)
*   Hospital crowd awareness via heatmap
*   **Purpose:** Improve transparency and patient experience.

## ⚙️ System Architecture
`Frontend Dashboard → Backend API Server → Database → Real-Time Response`

**Backend APIs implemented:**
*   Heatmap data API → department crowd data
*   Queue management API → patient queue tracking

**Planned APIs (future extension):**
*   Appointment booking API
*   AI waiting time prediction API

## 🤖 AI Extension (Future Work / Innovation)
*   Waiting time prediction
*   Emergency case prioritization
*   Intelligent appointment scheduling
*   Reinforcement learning based optimization
*(This makes the system scalable and intelligent.)*

## 🗄️ Technology Stack
*   **Frontend:** HTML, CSS, JavaScript dashboards
*   **Backend:** Python API server (FastAPI)
*   **Database:** SQLite
*   Real-time data handling via API responses

## 🚀 Expected Outcomes
*   Reduce hospital waiting time
*   Monitor patient flow in real time
*   Detect overcrowded departments
*   Improve hospital efficiency
*   Provide scalable AI-ready architecture

## ⭐ Innovation
*   Real-time hospital heatmap monitoring
*   API-driven queue management
*   Scalable architecture for AI integration
*   Healthcare workflow optimization

---
## Getting Started

### Prerequisites

*   Python 3.x

### Installation

1. Clone this repository.
2. Install the backend dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy
   ```
3. Initialize the database dummy data:
   ```bash
   python backend/seed_data.py
   ```
4. Start the FastAPI backend server:
   ```bash
   uvicorn backend.main:app --reload --port 8042
   ```
5. Open `login.html` in your web browser or run it via Live Server.
