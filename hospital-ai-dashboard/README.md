# MediFlow AI Dashboard 🏥🤖

MediFlow AI Dashboard is a prototype full-stack application designed to simulate an AI-driven hospital patient flow optimization system. It features specialized portals for Administrators, Doctors, and Patients.

---

## 🏗️ Project Architecture & Technologies

The project is built with a lightweight backend to serve dynamic data to a modern, responsive frontend.

*   **Backend:** Python 3 with Flask
*   **Database:** SQLite (`hospital.db`)
*   **Frontend:** Vanilla HTML5, CSS3, and JavaScript (ES6)
*   **Charting:** Chart.js (for rendering live data visualizations)

---

## 📁 Directory Structure & File Explanations

Here is a breakdown of the key files and directories in the project:

### Root Directory
*   **`run.bat`** (If present): A batch script used to quickly launch the Flask backend server.
*   **`hospital.db`**: The SQLite database file. It stores users (admins, doctors, patients, bed applications).
*   **`requirements.txt`**: Lists all the necessary Python pip packages (like `flask`, `werkzeug`, etc.).
*   **`start_ngrok.py`**: A utility script to start an Ngrok tunnel, exposing the local Flask server to the internet for remote testing.
*   **`migrate_db.py`**: A python script for managing schema updates or creating new tables.
*   **`index.html`**: The main Admin dashboard UI.
*   **`style.css`**: The core stylesheet containing modern design tokens, animations, and custom CSS classes.
*   **`app.js`**: A generic javascript file for the application's root logic.

### `backend/` - The Application Core
This directory contains the core logic for the web server and database interactions.
*   **`app.py`**: The entry point for the Flask application. It initializes the app, configures the template and static folders, and registers Blueprints (routes).
*   **`routes.py`**: Defines all the URL endpoints for the application. It includes HTML page renders (`/`, `/doctor`, `/patient`) and JSON API endpoints (`/api/admin/stats`, `/api/patient/me`, etc.).
*   **`database.py`**: Manages the connection to the SQLite database (`hospital.db`). It provides helper functions to initialize tables and get database cursors.
*   **`auth.py`**: Handles authentication logic, including logging in, logging out, and session management using Flask's `session` object.
*   **`seed.py`**: A utility script used to populate the database with mock data. It creates sample admin, doctor, and patient accounts to make testing easier.

### `static/` - Frontend Assets & Logic
Contains the Javascript files that power the interactivity and simulated AI of the dashboards.
*   **`admin_app.js`**: The brains behind the Admin dashboard. It fetches data from the backend APIs, renders Chart.js graphs, populates tables, and runs the "What-If Simulator" math logic.
*   **`doctor_app.js`**: Handles the logic for the Doctor's portal, managing patient schedules, displaying workloads, and updating patient statuses.
*   **`style.css`**: (Repeated) Main stylesheet.

### `templates/` - HTML Views
Contains the Jinja2/HTML templates served by the Flask backend.
*   **`admin_dashboard.html`**: The main view for the hospital administrators to monitor patient flow, doctor workloads, and AI insights.
*   **`doctor_dashboard.html`**: The view for doctors to manage their appointments, view patient details, and see their daily schedules.
*   **`patient_dashboard.html`**: The view for patients to apply for bed availability, check their queue status, and view AI-predicted wait times.
*   **`login.html`**: The unified authentication portal for all user types.

### `data/` 
*   Directory storing any static structured data, like `.csv` files used to load initial mock patient histories or hospital info into the database.

---

## 🧠 The "AI" Implementation

The project uses a frontend simulation approach to demonstrate its features.

**Why a Simulation?**
Building a true Reinforcement Learning engine requires vast amounts of real-time clinical data and high compute power. This prototype simulates the *outputs* of such an engine to demonstrate the UI/UX and product vision.

*   **Dashboards & Charts:** The real-time line charts, workload pie charts, and Live Flow maps (SVG) are generated and manipulated in `admin_app.js`. They utilize Javascript Math functions and random noise generation to mimic live, shifting patient loads.
*   **What-If Simulator:** The simulator pane uses predefined formulas linked to HTML range sliders. When you increase the "Doctor Availability" slider, the Javascript immediately recalculates and updates the predicted wait time chart instantly, no backend ML request required.
*   **Explainable AI (XAI):** The AI alerts ("Queue bottleneck resolved") are pulled sequentially from predefined prompt templates in the Javascript arrays to mock an engine continuously monitoring the queue data.

---

## 🚀 How to Run the Project

1. **Install Dependencies:**
   Make sure you have Python installed. If it's your first time, install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

2. **Initialize Database (Optional/First-time setup):**
   If `hospital.db` is missing or you want a fresh setup with dummy accounts:
   ```bash
   python backend/seed.py
   ```

3. **Start the Server:**
   Run the main Flask app file:
   ```bash
   python backend/app.py
   ```
   *(Alternatively, you can double-click `run.bat` if you are on Windows).*

4. **Access the App:**
   Open your browser and navigate to: [http://localhost:5000](http://localhost:5000)

### 🔑 Default Test Accounts
Use these credentials to test the different user roles:
*   **Admin:** `admin@mediflow.com` / `admin123`
*   **Doctor:** `malhotra@mediflow.com` / `doctor123`
*   **Patient:** `arjun@patient.com` / `patient123`
