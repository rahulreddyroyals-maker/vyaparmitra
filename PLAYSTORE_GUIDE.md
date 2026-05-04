# VyaparMitra - Play Store Upload Guide
# PWA to APK/AAB using Bubblewrap (Google's official tool)

## Method 1: PWA Builder (Easiest - No code needed)
## =====================================================

### Step 1: Deploy your PWA to Netlify (done already)
Your app is live at: https://vyaparmitra.netlify.app

### Step 2: Go to PWABuilder
1. Open: https://www.pwabuilder.com
2. Enter: https://vyaparmitra.netlify.app
3. Click "Start"
4. It will scan your PWA and score it
5. Click "Package for stores"
6. Select "Android"
7. Fill in:
   - Package ID: com.vyaparmitra.app
   - App Name: VyaparMitra
   - App Version: 1.0.0
   - Signing Key: Generate new (download and save it!)
8. Click "Download Package"
9. You get a .aab file ready for Play Store!

### Step 3: Upload to Play Store
1. Go to: https://play.google.com/console
2. Create account (one-time $25 fee)
3. Create new app: "VyaparMitra"
4. Upload .aab file
5. Fill in store listing:
   - Title: VyaparMitra - Business Manager
   - Short description: Manage your business on WhatsApp
   - Full description: (see below)
   - Category: Business
   - Screenshots: Take from your phone

---

## Method 2: Bubblewrap CLI (More control)
## =====================================================

### Prerequisites
- Java JDK 17+: https://adoptium.net
- Android Studio: https://developer.android.com/studio
- Node.js (already installed)

### Install Bubblewrap
npm install -g @bubblewrap/cli

### Initialize project
bubblewrap init --manifest=https://vyaparmitra.netlify.app/manifest.json

### When asked, enter:
- Application name: VyaparMitra
- Package ID: com.vyaparmitra.app  
- Start URL: https://vyaparmitra.netlify.app/
- Icon URL: https://vyaparmitra.netlify.app/icon-512.png
- Display: standalone
- Status bar color: #2563EB
- Splash screen color: #0F172A
- Theme color: #2563EB

### Build APK (for testing)
bubblewrap build
# Output: app-debug.apk (install on phone directly)

### Build AAB (for Play Store)
bubblewrap build --skipSigning
# Then sign with your keystore

---

## Method 3: Capacitor (Full native app)
## =====================================================
# Best for adding features like camera, offline, push notifications

npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init VyaparMitra com.vyaparmitra.app
npm run build
npx cap add android
npx cap copy android
npx cap open android
# Android Studio opens - click Build > Generate Signed Bundle/APK

---

## Play Store Store Listing Content
## =====================================================

Title: VyaparMitra - Vyapar Manager

Short Description (80 chars):
Manage your business on WhatsApp. Billing, Stock & Payments.

Full Description:
VyaparMitra is the simplest business management app for Indian MSMEs.

WHY VYAPARMITRA?
- WhatsApp-first: Just send a message to record sales
- Works in Telugu and English
- No complex training needed

FEATURES:
- Billing & Invoicing
- Inventory Management  
- Customer Payment Tracking
- WhatsApp Reminders
- Business Reports
- GST-ready exports

EXAMPLE:
Send: "Sold 5 cement to Ramesh for 2500"
Get: Invoice created, stock updated, payment tracked

For kirana stores, hardware shops, distributors and all MSMEs.

---

## One-Time Play Store Fee
## =====================================================
$25 USD (~Rs 2,100) - paid once, never again
- Register at: https://play.google.com/console/signup

## Recommended: Start with PWABuilder
## =====================================================
It's the fastest path:
1. pwabuilder.com -> enter your URL -> Download AAB -> Upload to Play Store
Total time: ~2 hours including Play Store review
