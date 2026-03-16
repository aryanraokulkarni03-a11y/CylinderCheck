# 🔥 CylinderCheck
**India's #1 LPG Intelligence & Delivery Tracker.**

CylinderCheck is a professional-grade web utility designed to solve the uncertainty around gas cylinder bookings in India. It empowers Bharat Gas, HP Gas, and Indane customers with crowd-sourced shortage signals, real-time price tracking, and official survival guides.

---

## ✨ Key Features

### 📡 Delivery Intelligence (Next-Gen Tracking)
- **PIN-Code Shortage Heatmap**: Interactive map-driven filtering showing active supply chain disruptions in your specific cluster.
- **Smart Booking Window**: Automated calculations using the **2026 Official 25-Day Rule** (25-day mandatory gap for urban areas).
- **Urgency Scoring**: Real-time "Community Shortage Signal" based on live reporting from your neighbors.

### 📰 Dynamic News Aggregator
- **Localized News Feed**: Dynamic city-based filtering using an interactive Leaflet.js map.
- **AI-Categorized Articles**: Smart filtering for Price Revisions, Supply Scarcity, and Government Policy changes.

### 📚 LPG Survival Guide
- **Accordion Knowledge Base**: Deep-dive into 2026 booking rules, cylinder conservation tips, and consumer rights. 
- **Emergency Directory**: One-tap access to 1906 (Gas Leakage) and official OMCS Smartlines.

### 💳 Alerts & Subscriptions
- **Single-Column Alert Stack**: Streamlined view for Booking Alerts and Price Revision notifications.
- **CylinderCheck Plus**: Priority alerts for high-demand zones (Beta).

---

## 🛠️ Tech Stack
- **Frontend**: React (Vite) + Vanilla CSS (Custom Neumorphic System)
- **Database**: Supabase (PostgreSQL) + Row-Level Security (RLS)
- **Mapping**: Leaflet.js (Dynamic GeoJSON-based city filtering)
- **Payment**: Razorpay Integration (Plus subscriptions)
- **Intelligence**: India Post PIN API + LPG News Scraper

---

## 🚧 2026 Roadmap

### Phase 1: The "Fixes Pass" (Current Focus)
- [ ] **SQL Intelligence**: Implementing `get_avg_delivery_days` RPC for precise localized ETAs.
- [ ] **Accessibility Audit**: Full WCAG compliance and `:focus-visible` navigation.
- [ ] **UPI Intelligence**: Integrated guides for LPG booking within PhonePe, Paytm, and GPay.

### Phase 2: Community Expansion
- **WhatsApp/SMS Bridge**: Real-time push notifications for price revisions and booking windows.
- **Commercial Dashboard**: Bespoke solutions for high-volume users (Hotels/Catering).

---

## 🚀 Getting Started
1. **Clone & Install**: `git clone` followed by `npm install`.
2. **Environment**: Copy `.env.example` to `.env.local` and add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_RAZORPAY_KEY_ID`.
3. **Run**: `npm run dev` to launch locally.

---

## ⚠️ Disclaimer
CylinderCheck is an independent tool and is not affiliated with IndianOil, HP Gas, or Bharat Gas. All data is community-sourced and provided for informational purposes only.

© 2026 CylinderCheck 🇮🇳

