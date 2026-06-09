# Plato — Home Kitchen Food Sharing App

A full-stack mobile app where students can share and book home-cooked meals. Built with React Native (Expo), Django, and PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native + Expo SDK 54 |
| Admin Panel | React Native + Expo SDK 54 |
| Backend API | Django 6 + Django REST Framework |
| Database | PostgreSQL |
| Auth | JWT (SimpleJWT) + OTP email verification |
| Image Storage | Cloudinary |
| Payments | eSewa UAT (wallet top-up only) |
| Food AI | `nateraw/food` via HuggingFace Transformers (local GPU) |
| Build | EAS Build (Expo Application Services) |

---

## Project Structure

```
plato/
├── src/                    # React Native app source
│   ├── screens/            # App screens
│   ├── context/            # AppContext (global state)
│   ├── api/                # API client + Cloudinary upload
│   ├── navigation/         # React Navigation setup
│   └── utils/              # Helpers
├── admin/                  # Admin panel (separate Expo app)
│   └── src/
│       ├── screens/        # Admin screens
│       ├── api/            # Admin API client
│       └── context/        # AdminContext
├── plato_backend/          # Django backend
│   ├── api/                # Main app (models, views, serializers)
│   ├── panel_api/          # Admin panel API
│   └── plato/              # Django settings & URLs
├── android/                # Android native code (prebuild)
├── App.jsx                 # App entry point
├── app.json                # Expo config
└── eas.json                # EAS Build config
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** 14+
- **Expo Go** app on your phone (for development)
- **ngrok** (to expose local backend to phone)
- **NVIDIA GPU with CUDA** (optional, for AI food verification)

---

## 1. Backend Setup (Django)

### Install dependencies

```bash
cd plato_backend
python -m venv ../venv
source ../venv/bin/activate        # Windows: ..\venv\Scripts\activate
pip install -r requirements.txt
```

### Install AI model dependencies (requires CUDA GPU)

```bash
# Check your CUDA version first: nvidia-smi
# For CUDA 12.4 (RTX 40xx series):
pip install "torch==2.6.0+cu124" "torchvision==0.21.0+cu124" --index-url https://download.pytorch.org/whl/cu124
# CPU-only (slower):
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

pip install "transformers==4.47.1"
```

### Create the database

```bash
psql -U postgres -c "CREATE DATABASE plato_db;"
```

### Configure environment variables

Create `plato_backend/.env`:

```env
# Django
SECRET_KEY="your-secret-key-here"

# Database
DB_NAME=plato_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=127.0.0.1
DB_PORT=5432

# Email (Gmail SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
EMAIL_FROM=your@gmail.com

# APIs
RESEND_API_KEY=your_resend_key
HUGGINGFACE_API_KEY=your_hf_key

# eSewa UAT (replace with live credentials for production)
ESEWA_SECRET_KEY="8gBm/:&EnhH.1/q"
ESEWA_PRODUCT_CODE="EPAYTEST"

# Backend public URL (update every time your ngrok URL changes)
BACKEND_URL=https://your-ngrok-url.ngrok-free.dev
```

### Run migrations and start server

```bash
cd plato_backend
source ../venv/bin/activate
python manage.py migrate
python manage.py runserver
```

### Expose backend to phone via ngrok

```bash
ngrok http 8000
# Copy the https URL into BACKEND_URL in plato_backend/.env
# and EXPO_PUBLIC_API_URL in the root .env
```

---

## 2. Frontend App Setup

### Install dependencies

```bash
npm install
```

### Configure environment variables

Create `.env` in the root folder:

```env
EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.dev/api
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### Run on device

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone. Make sure your phone and computer are on the same Wi-Fi network.

---

## 3. Admin Panel Setup

### Install dependencies

```bash
cd admin
npm install
```

### Configure environment variables

Create `admin/.env`:

```env
EXPO_PUBLIC_ADMIN_API_URL=https://your-ngrok-url.ngrok-free.dev/panel/api
```

### Run admin panel

```bash
cd admin
npx expo start
```

### Create an admin user (first time only)

```bash
cd plato_backend
source ../venv/bin/activate
python manage.py createsuperuser
```

---

## 4. Building for Production (EAS)

### Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Build the main app APK

```bash
eas init          # first time only — links project to your Expo account
eas build -p android --profile preview     # APK for testing
eas build -p android --profile production  # AAB for Play Store
```

### Build the admin app APK

```bash
cd admin
eas init
eas build -p android --profile preview
```

### Set production environment variables on EAS

```bash
eas secret:create --name EXPO_PUBLIC_API_URL --value https://yourserver.com/api
eas secret:create --name EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME --value your_cloud_name
eas secret:create --name EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET --value your_preset
```

---

## 5. AI Food Verification

The app uses `nateraw/food` (Food-101 classifier) running locally on your GPU to verify that uploaded meal images actually contain food. The model downloads automatically (~100 MB) on first use and is cached.

| Confidence | Verdict |
|---|---|
| < 0.30 | Rejected — not food |
| 0.30 – 0.55 | Pending admin review |
| > 0.55 | Approved automatically |

With an RTX 4050 GPU inference takes ~50ms per image.

---

## 6. Payment Flow

All in-app payments go through the **Plato Wallet**:

1. **Top up wallet** via eSewa (test credentials: phone `9806074000`, password `Nepal@123`, MPIN `1122`)
2. **Book food** → deducted from buyer wallet, credited to cook wallet instantly
3. **Cancel booking** → 70% refunded to buyer wallet instantly; cook keeps 30% cancellation fee
4. **Pro subscription** → Rs.199 deducted from wallet

eSewa is used **only** for wallet top-up.

---

## 7. Key Features

- OTP email verification on registration
- In-app wallet with full transaction history
- GPU-accelerated food image AI verification
- Cook receives payment directly to their wallet on booking
- Instant refunds for wallet-paid cancellations
- Buyer "Mark as Received" confirmation flow
- Pro subscription with featured meal listings
- Admin panel: meal approval, refund management, user management, subscription management

---

## 8. Default Ports

| Service | Port |
|---|---|
| Django backend | 8000 |
| Expo Metro bundler | 8081 |
| PostgreSQL | 5432 |

---

## 9. Common Issues

**AI shows pending_review for everything** — Django is not running inside the venv. Always activate first: `source venv/bin/activate`

**ngrok URL changed** — Update `BACKEND_URL` in `plato_backend/.env` AND `EXPO_PUBLIC_API_URL` in root `.env`, then restart both Django and Expo.

**"Booking is not awaiting payment"** — Booking was created without wallet payment method. Force-close and reopen the app.

**eSewa redirect not returning to app** — Make sure `scheme: "plato"` is in `app.json` and deep link paths (`mymeals`, `profile`, `wallet`) are in `App.jsx`.

**Profile picture not changing** — Camera/gallery picker needs permissions. Go to phone Settings → Apps → Plato → Permissions and enable Camera and Storage.
