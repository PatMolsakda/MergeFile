# 📊 Data Merger & Analyzer

A powerful and intuitive full-stack web application to merge, align, reconcile, and clean Excel and CSV datasets entirely in the browser. Detect overlaps, resolve discrepancies, and export clean consolidated files in seconds.

---

## ✨ Features

- **📂 Multi-Format File Upload**: Import spreadsheets (.xlsx, .xls) and CSV files via local upload or directly from a public URL.
- **🔄 Dynamic Data Merging**: Perform relational joins (Left, Right, Inner, Outer) dynamically based on selected matching keys.
- **🎯 Smart Key Normalization**: Options to trim whitespace, ignore casing, and strip special characters to increase match rates.
- **⚡ Real-Time Data Preview**: Interactively preview datasets, search, filter by origin, and sort columns on-the-fly.
- **⚠️ Discrepancy & Conflict Resolver**: Identify values in overlapping columns that don't match, with a one-click visual interface to resolve conflicts.
- **📤 Versatile Export Formats**: Export clean, consolidated data sheets to CSV or Excel with source tracking.
- **🔒 Privacy First**: All data processing is done locally on the client's side.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Tailwind CSS (v4), TypeScript, Lucide Icons, Motion (framer-motion)
- **Data Engines**: SheetJS (xlsx) for Excel files, PapaParse for CSV files
- **Backend/Development**: Node.js, Express, TSX, Vite

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### 1. Installation
Clone this repository and install the dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` or `.env.local`:
```bash
cp .env.example .env.local
```
Configure your `GEMINI_API_KEY` (if utilizing AI-assisted features).

### 3. Run Locally
Start the development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000` to start using the app.

---

## 📁 Project Directory Structure

- `src/` - React frontend application code
  - `components/` - Visual UI widgets (Uploader, Configurator, Previews, Dashboard)
  - `utils/` - Local processing algorithms & excel parsing engines
  - `App.tsx` - Main interface logic and application wrapper
- `server.ts` - Local development proxy server
- `metadata.json` - AI Studio app configuration and capabilities metadata

---

## 📜 License

This project is licensed under the MIT License.
