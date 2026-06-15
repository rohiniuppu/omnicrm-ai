# OmniCRM AI - AI-Native Mini CRM for Shopper Engagement

🚀 **Live Demo**: [https://omnicrm-ai-five.vercel.app]( https://omnicrm-ai-five.vercel.app)
🔧 **Backend API**: [https://omnicrm-ai-production.up.railway.app]( https://omnicrm-ai-production.up.railway.app )

OmniCRM AI is a next-generation marketing automation CRM that helps retail brands manage customers, log purchases, isolate target audiences using rule builders or Gemini-powered natural language queries, draft campaigns with AI copywriting, and track deliveries using a simulated callback channel service.

## Tech Stack
* **Frontend**: React (Vite) + Tailwind CSS + Recharts + Lucide Icons + React Router
* **Backend**: Node.js + Express
* **Database**: MySQL (with automatic JSON file-based database fallback)
* **AI integration**: Google Gemini 2.5 Flash SDK

---

## Folder Structure

```text
crm/
├── client/                 # React SPA (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/     # Reusable layout and modal components
│   │   ├── pages/          # Dashboard, Customers, Segments, Campaigns
│   │   ├── App.jsx         # Client routing
│   │   └── index.css       # Tailwind & Glassmorphism styles
│   └── package.json
│
├── crm-backend/            # Express REST API (MySQL, Gemini SDK)
│   ├── db/
│   │   ├── schema.sql      # Database structure
│   │   ├── generator.js    # Data seeder engine
│   │   ├── seed.js         # MySQL DB seeder command
│   │   └── mockDb.js       # JSON fallback database helper
│   ├── db.js               # Connection router / proxy
│   ├── geminiService.js    # Gemini segment parser & copywriter
│   ├── server.js           # API entry point
│   └── package.json
│
└── channel-service/        # Simulated Communication Gateway
    ├── server.js           # Express app with async webhook callbacks
    └── package.json
```

---

## Local Setup Instructions

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **MySQL Server** (Optional: A local database server. If not detected, the backend automatically sets up a local JSON file-based database so the application works out-of-the-box!)

### Step 1: Database Setup (If using MySQL)
1. Log into your MySQL console and create a database:
   ```sql
   CREATE DATABASE mini_crm;
   ```
2. In the `crm-backend/` directory, copy the `.env` template configurations and adjust your credentials:
   ```env
   PORT=5000
   DB_HOST=127.0.0.1
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=mini_crm
   DB_PORT=3306
   GEMINI_API_KEY=your_gemini_api_key
   CHANNEL_SERVICE_URL=http://localhost:5001
   DB_FALLBACK=true
   ```
3. Run the database seeding command inside the `crm-backend/` folder to create tables and insert 120 customers and 500+ orders:
   ```bash
   npm run seed
   ```

### Step 2: Install Dependencies & Run Services

Open three terminal windows (or tabs) and execute the following commands:

#### Terminal 1: Run Channel Service Simulator
```bash
cd channel-service
npm install
npm run dev
```
*Port active: `http://localhost:5001`*

#### Terminal 2: Run CRM Backend
```bash
cd crm-backend
npm install
npm run dev
```
*Port active: `http://localhost:5000`*

#### Terminal 3: Run React Client
```bash
cd client
npm install
npm run dev
```
*Port active: `http://localhost:5173`*

---

## Core Modules & Features

### 1. Customer & Order Management
* Create, update, search, and delete customers.
* View granular profiles with computed statistics: Total Spend, Order Count, and Last Purchase Date.
* Log transactions directly for any customer, which dynamically updates their metrics.

### 2. Audience Segmentation & AI Generator
* Create rules using filters like minimum spend, residential city, order count, or date.
* **AI Segment Generator**: Enter raw queries like *"Show customers in Pune who spent more than 4000 and haven't bought in 30 days"* to let Gemini resolve the segment filters.

### 3. AI Campaign Assistant (Agent)
* Select the **AI Campaign Agent** workspace tab to create campaigns end-to-end.
* Type a high-level business goal (e.g., *"Clear mechanical keyboard inventory with a 15% discount for Pune shoppers on WhatsApp"*).
* Gemini automatically plans the campaign, recommends the channel, writes optimized template copy (with `[Customer Name]` placeholders), builds segment rules, and displays a preview of matching customers.
* Every AI-generated segment and campaign now includes a visible reasoning trail so the team can review why the audience, channel, and message were selected.
* Click **Approve & Launch** to broadcast the campaign instantly!

### 4. Login & Workspace Entry
* Open the `/login` route to use the new pricing-inspired entry screen.
* Use the demo workspace button for a quick local sign-in, or enter any email/password pair to continue into the CRM shell.
* The entry page now follows a cleaner, product-led layout, while the app shell keeps the operational tools focused and readable.

### 5. Conversion & Purchase Tracking
* Track campaign pipelines through a complete attribution loop: **Campaign $\rightarrow$ Click $\rightarrow$ Purchase**.
* When simulated customers click a campaign message, the simulator triggers a **random purchase conversion chance (20% - 50%)**.
* Converted events are sent to the CRM webhook:
  `SENT -> DELIVERED -> OPENED -> CLICKED -> CONVERTED (Purchased!)`
* The CRM backend automatically inserts an order for that customer with campaign-attributed product names and prices, updating lifetime value.
* View Conversion Rates and timeline curves directly on the glassmorphic Dashboard.

---

## Production Deployment Instructions

### 1. Database (Railway MySQL)
1. Spin up a new MySQL service on Railway.
2. Connect to it via your CLI/GUI or run the tables found in `crm-backend/db/schema.sql`.
3. Retrieve the Connection URL and credentials (`MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`).

### 2. CRM Backend (Render)
1. Create a new Web Service on **Render** linked to your backend repository.
2. Set the **Root Directory** to `crm-backend/`.
3. Set Build Command: `npm install`
4. Set Start Command: `npm start`
5. Configure Environment Variables:
   * `DB_HOST`: Railway database host
   * `DB_USER`: Railway database username
   * `DB_PASSWORD`: Railway database password
   * `DB_NAME`: Railway database name
   * `DB_PORT`: Railway database port
   * `GEMINI_API_KEY`: Google Generative AI API key
   * `CHANNEL_SERVICE_URL`: URL of the Channel Service deployed on Render

### 3. Channel Service (Render)
1. Create a new Web Service on **Render**.
2. Set the **Root Directory** to `channel-service/`.
3. Set Build Command: `npm install`
4. Set Start Command: `npm start`
5. Configure Environment Variables:
   * `CRM_CALLBACK_URL`: `https://your-crm-backend.onrender.com/api/webhooks/channel-callback`

### 4. React Frontend (Vercel)
1. Connect Vercel to your repository.
2. Select the `client/` folder as the root directory.
3. Vercel automatically detects Vite framework. Set build command: `npm run build` and output directory: `dist`.
4. Configure Environment Variables:
   * `VITE_API_URL`: `https://your-crm-backend.onrender.com`
