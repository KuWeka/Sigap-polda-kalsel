<div align="center">

<img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/>
<img src="https://img.shields.io/badge/Express-4.18-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
<img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/Prisma-5.10-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma"/>
<img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL"/>
<img src="https://img.shields.io/badge/Socket.io-4.7-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io"/>

<br/><br/>

# 🚔 SIGAP

### Sistem Informasi Gangguan dan Aduan Polri — Polda Kalimantan Selatan

*Pengelolaan informasi gangguan dan aduan kepolisian yang terstruktur, transparan, dan real-time untuk seluruh satuan kerja.*

<br/>

[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=flat-square&logo=railway)](https://railway.app)
[![Cloudinary](https://img.shields.io/badge/Storage-Cloudinary-3448C5?style=flat-square&logo=cloudinary)](https://cloudinary.com)

</div>

---

## 📋 Daftar Isi

- [Tentang Project](#-tentang-project)
- [Fitur Utama](#-fitur-utama)
- [Tech Stack](#-tech-stack)
- [Arsitektur & Struktur Project](#-arsitektur--struktur-project)
- [Alur Tiket & Role](#-alur-tiket--role)
- [Database Schema](#-database-schema)
- [Setup Lokal](#-setup-lokal)
- [Environment Variables](#-environment-variables)
- [API Overview](#-api-overview)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Keamanan](#-keamanan)

---

## 🧭 Tentang Project

**SIGAP** (Sistem Informasi Gangguan dan Aduan Polri) adalah sistem helpdesk IT internal berbasis web yang dibangun untuk **Kepolisian Daerah Kalimantan Selatan**. Sistem ini menggantikan pencatatan manual gangguan TI dengan alur digital yang terstruktur, mulai dari pelaporan tiket oleh satuan kerja hingga penyelesaian oleh teknisi lapangan.

Dibangun sebagai **monorepo** dengan tiga workspace: `frontend`, `backend`, dan `shared` — sehingga tipe dan konstanta bisa digunakan bersama tanpa duplikasi.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🎫 **Ticketing End-to-End** | Buat, assign, selesaikan, rating — semua dalam satu alur |
| 🔔 **Notifikasi Real-time** | Berbasis Socket.io, setiap perubahan status tiket langsung terkirim |
| 🔒 **RBAC 4 Role** | SATKER, BIDTEKKOM, PADAL, TEKNISI — tiap role punya akses berbeda |
| ⭐ **Rating Gate** | SATKER wajib memberi rating sebelum bisa membuat tiket baru |
| ❌ **Reject & Cancel Flow** | BIDTEKKOM bisa tolak tiket dengan alasan wajib untuk audit trail |
| 📊 **Laporan Bulanan** | Export PDF dan Excel dengan ringkasan statistik per bulan |
| 🔍 **Audit Log** | 14+ tipe event tercatat lengkap untuk setiap aksi penting |
| 🌙 **Dark Mode** | Tema terang/gelap, persisten per user |
| 📎 **Upload Attachment** | Foto dan file pendukung tiket via Cloudinary |
| 🔑 **Reset Password** | Via email dengan token aman (hashed, expires 15 menit) |

---

## 🛠 Tech Stack

### Frontend
```
Next.js 14 (App Router)    — Framework React dengan SSR dan routing berbasis file
React 18                   — UI library dengan concurrent features
TypeScript 5.3             — Type safety end-to-end
Tailwind CSS + shadcn/ui   — Styling dan komponen UI
TanStack Query v5          — Server state management dan caching
React Hook Form + Zod      — Form handling dan validasi schema
Socket.io Client           — Real-time event dari backend
Recharts                   — Visualisasi data dashboard
Axios                      — HTTP client dengan interceptor
```

### Backend
```
Express 4.18               — HTTP server
TypeScript 5.3             — Type safety
Prisma 5.10 + MySQL 8      — ORM dan database
Socket.io 4.7              — Real-time bidirectional events
JWT + bcryptjs             — Autentikasi dan hashing password
Zod                        — Validasi request body dan params
Helmet                     — HTTP security headers
express-rate-limit         — Rate limiting per endpoint
Multer + Cloudinary        — Upload dan storage file
Nodemailer                 — Email transaksional (password reset)
PDFKit + ExcelJS           — Generate laporan PDF dan Excel
```

### Shared
```
@sigap/shared          — Internal package: tipe TypeScript dan konstanta
                             digunakan bersama oleh frontend dan backend
```

### DevOps & Tools
```
Vercel                     — Deploy frontend (Next.js)
Railway                    — Deploy backend + MySQL database
Cloudinary                 — CDN dan storage file
UptimeRobot                — Health check & uptime monitoring
```

---

## 🏗 Arsitektur & Struktur Project

```
sigap-polda-kalsel/                   ← Root monorepo (npm workspaces)
│
├── frontend/                       ← Next.js 14 App
│   └── src/
│       ├── app/
│       │   ├── (auth)/             ← Route group: login, register, reset password
│       │   └── (dashboard)/        ← Route group: semua halaman setelah login
│       │       └── dashboard/
│       │           ├── error.tsx           ← Global error boundary dashboard
│       │           ├── page.tsx            ← Dashboard utama (berbeda per role)
│       │           ├── tickets/            ← Daftar tiket + detail [id]
│       │           ├── create-ticket/      ← Form buat tiket baru
│       │           ├── staff/              ← Manajemen user (BIDTEKKOM)
│       │           ├── teams/              ← Manajemen tim (PADAL)
│       │           ├── my-team/            ← Anggota tim saya (PADAL)
│       │           ├── reports/            ← Laporan bulanan (BIDTEKKOM/PADAL)
│       │           ├── audit-log/          ← Log aktivitas (BIDTEKKOM)
│       │           ├── notifications/      ← Notifikasi user
│       │           └── settings/           ← Profil & preferensi
│       │
│       ├── components/
│       │   ├── ui/                 ← shadcn/ui base components
│       │   ├── layout/             ← Header, Sidebar, MobileDrawer
│       │   ├── dashboard/          ← Komponen dashboard per role
│       │   ├── tickets/            ← Modal dan komponen tiket
│       │   └── shared/             ← EmptyState, LoadingSkeleton, ConfirmModal
│       │
│       ├── hooks/                  ← Custom React Query hooks
│       │   ├── useTickets.ts       ← Query & mutation tiket
│       │   ├── useStaff.ts         ← Query staff & manajemen user
│       │   ├── useDashboard.ts     ← Query statistik dashboard
│       │   ├── useReports.ts       ← Query laporan bulanan
│       │   ├── useNotifications.ts ← Query & mutation notifikasi
│       │   ├── useAudit.ts         ← Query audit log
│       │   ├── useDebounce.ts      ← Utility hook debounce
│       │   └── index.ts            ← Barrel export semua hooks
│       │
│       ├── providers/              ← Context providers
│       │   ├── AuthProvider.tsx    ← State user & token
│       │   ├── SocketProvider.tsx  ← Socket.io connection & events
│       │   ├── QueryProvider.tsx   ← TanStack Query client
│       │   └── ThemeProvider.tsx   ← Dark/light mode
│       │
│       ├── lib/
│       │   ├── api.ts              ← Axios instance + semua API calls
│       │   ├── formatters.ts       ← formatDate, formatFileSize, dll
│       │   └── status-config.ts    ← Konfigurasi warna & label status tiket
│       │
│       ├── schemas/                ← Zod schemas untuk form validation
│       └── middleware.ts           ← Next.js middleware (auth guard)
│
├── backend/                        ← Express API Server
│   └── src/
│       ├── controllers/            ← Handler request, delegasi ke service
│       ├── services/               ← Business logic utama
│       │   ├── ticketService.ts    ← CRUD + lifecycle tiket
│       │   ├── authService.ts      ← Register, login, password reset
│       │   ├── staffService.ts     ← Manajemen user & soft delete
│       │   ├── reportService.ts    ← Generate PDF dan Excel
│       │   ├── notificationService.ts ← Buat & kirim notifikasi
│       │   └── auditService.ts     ← Catat audit log
│       │
│       ├── middleware/
│       │   ├── authenticate.ts     ← Verifikasi JWT + cek soft-delete
│       │   ├── authorize.ts        ← Role-based access control
│       │   ├── validate.ts         ← Zod schema validation
│       │   ├── rateLimit.ts        ← Rate limiting per endpoint
│       │   └── upload.ts           ← Multer + Cloudinary storage
│       │
│       ├── lib/
│       │   ├── prisma.ts           ← Singleton PrismaClient
│       │   ├── socket.ts           ← Singleton Socket.io instance
│       │   └── authCache.ts        ← In-memory cache autentikasi (TTL 60s)
│       │
│       ├── routes/                 ← Express router per domain
│       ├── validators/             ← Zod schemas untuk request validation
│       ├── utils/
│       │   ├── AppError.ts         ← Custom error class
│       │   ├── logger.ts           ← Winston logger
│       │   └── ticketNumber.ts     ← Generate nomor tiket atomic
│       │
│       ├── prisma/
│       │   ├── schema.prisma       ← Database schema
│       │   ├── seed.ts             ← Data awal (admin, settings)
│       │   └── migrations/         ← Riwayat migrasi database
│       │
│       └── __tests__/
│           ├── properties/         ← Property-based tests (fast-check)
│           └── *.test.ts           ← Unit & integration tests
│
└── shared/                         ← Internal package bersama
    ├── types/
    │   ├── index.ts                ← Role, TicketStatus, enums
    │   └── api.ts                  ← PaginatedResult, ApiResponse
    └── constants/
        └── index.ts                ← Konstanta bersama
```

---

## 🔄 Alur Tiket & Role

```mermaid
graph TD
    %% Pengaturan Warna Khusus per Aktor
    classDef satker fill:#d4edda,stroke:#28a745,stroke-width:2px,color:#000,font-size:16px,font-weight:bold
    classDef sistem fill:#e2e3e5,stroke:#6c757d,stroke-width:2px,color:#000,font-size:16px,font-weight:bold
    classDef bidtekkom fill:#cce5ff,stroke:#007bff,stroke-width:2px,color:#000,font-size:16px,font-weight:bold
    classDef padal fill:#fff3cd,stroke:#ffc107,stroke-width:2px,color:#000,font-size:16px,font-weight:bold
    classDef teknisi fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#000,font-size:16px,font-weight:bold
    classDef startend fill:#000,stroke:#000,color:#fff,font-size:18px,font-weight:bold

    %% Titik Node (Nama Aktor langsung disematkan)
    NodeMulai((Mulai))
    BuatTiket(SATKER: Isi Form Tiket)
    CekRating{SISTEM: Cek Ulasan Tertunda?}
    Tolak(SISTEM: Blokir Tiket)
    BeriRating(SATKER: Beri Ulasan)
    Simpan(SISTEM: Set PENDING)
    Validasi{BIDTEKKOM: Validasi Laporan?}
    Batal(BIDTEKKOM: Batalkan Tiket)
    Teruskan(BIDTEKKOM: Assign ke PADAL)
    Assign(PADAL: Delegasi ke Teknisi)
    Kerja(TEKNISI: Perbaiki Gangguan)
    TutupTiket(PADAL: Verifikasi Selesai)
    UpdateSelesai(SISTEM: Set SELESAI)
    NodeSelesai((Selesai))

    %% Transisi Alur
    NodeMulai --> BuatTiket
    BuatTiket --> CekRating
    
    CekRating -->|Ada Tertunda| Tolak
    Tolak -.->|Wajib| BeriRating
    
    CekRating -->|Aman| Simpan
    Simpan --> Validasi
    
    Validasi -->|Ditolak| Batal
    Batal --> NodeSelesai
    
    Validasi -->|Disetujui| Teruskan
    Teruskan --> Assign
    
    Assign --> Kerja
    Kerja --> TutupTiket
    
    TutupTiket --> UpdateSelesai
    UpdateSelesai --> BeriRating
    
    BeriRating --> NodeSelesai

    %% Penerapan Warna
    class NodeMulai,NodeSelesai startend
    class BuatTiket,BeriRating satker
    class CekRating,Tolak,Simpan,UpdateSelesai sistem
    class Validasi,Batal,Teruskan bidtekkom
    class Assign,TutupTiket padal
    class Kerja teknisi
```

### Hak Akses per Role

| Aksi | SATKER | BIDTEKKOM | PADAL | TEKNISI |
|------|:------:|:---------:|:-----:|:-------:|
| Buat tiket | ✅ | — | — | — |
| Lihat tiket sendiri | ✅ | ✅ (semua) | ✅ (timnya) | ✅ (assigned) |
| Validasi & assign ke PADAL | — | ✅ | — | — |
| Tolak tiket + alasan | — | ✅ | — | — |
| Assign teknisi | — | — | ✅ | — |
| Selesaikan tiket | — | — | ✅ | ✅ |
| Beri rating | ✅ | — | — | — |
| Manajemen staff | — | ✅ | — | — |
| Lihat audit log | — | ✅ | — | — |
| Export laporan | — | ✅ | ✅ | — |
| System settings | — | ✅ | — | — |

### Status Tiket

```
         ┌─────────────────────────────────────┐
         │                                     │
  [BARU] │                                     ▼
PENDING ──┤── BIDTEKKOM assign ──▶ PROSES ──▶ SELESAI
         │
         ├── BIDTEKKOM tolak ──▶ DITOLAK
         │
         └── SATKER/BIDTEKKOM batal ──▶ DIBATALKAN
```

---

## 🗄 Database Schema

```mermaid
classDiagram
    %% Pengaturan Gaya & Arah
    direction TB
    classDef default fill:#ffffff,stroke:#333333,stroke-width:1.5px,font-family:sans-serif,font-size:14px

    %% Definisi Entitas
    class USER {
        +String id <<PK>>
        +String email <<Unique>>
        +String password <<Hashed>>
        +String nama
        +String nomorWhatsApp
        +Role role <<SATKER, BIDTEKKOM, PADAL, TEKNISI>>
        +String divisi
        +String foto
        +String tema
        +String bahasa
        +String padalId <<FK>>
        +String passwordResetToken
        +DateTime passwordResetExpires
        +DateTime deletedAt
        +DateTime createdAt
        +DateTime updatedAt
    }
    
    class TICKET {
        +String id <<PK>>
        +String nomorTiket <<Unique, SGP-YYYY-XXXXX>>
        +String judul
        +Text deskripsi
        +TicketCategory kategori <<HARDWARE, SOFTWARE, dll>>
        +String lokasi
        +TicketStatus status <<PENDING, PROSES, SELESAI, BATAL>>
        +String divisiSatker
        +String creatorId <<FK>>
        +String padalId <<FK>>
        +String alasanBatal
        +DateTime tanggalBuat
        +DateTime tanggalAssign
        +DateTime tanggalSelesai
    }
    
    class ATTACHMENT {
        +String id <<PK>>
        +String ticketId <<FK>>
        +String originalName
        +String storedName
        +String mimeType
        +Int size
        +DateTime createdAt
    }
    
    class RATING {
        +String id <<PK>>
        +String ticketId <<FK, Unique>>
        +String userId <<FK>>
        +Int bintang <<1-5>>
        +Text feedback
        +DateTime createdAt
    }
    
    class NOTIFICATION {
        +String id <<PK>>
        +String userId <<FK>>
        +NotificationType type
        +String ticketNumber
        +String message
        +Boolean isRead
        +DateTime createdAt
    }
    
    class AUDIT_LOG {
        +String id <<PK>>
        +AuditEventType eventType
        +String actorId <<FK>>
        +String actorNama
        +String targetEntityId
        +Json metadata
        +DateTime createdAt
    }
    
    class SYSTEM_SETTINGS {
        +String id <<PK>>
        +String appName
        +String appLogo
    }
    
    class TICKET_SEQUENCE {
        +String id <<PK>>
        +Int year <<Unique>>
        +Int seq
    }

    %% Relasi
    USER "1" --> "*" USER : teamMembers
    USER "1" --> "*" TICKET : creates
    USER "1" --> "*" TICKET : assignedTo
    TICKET "1" *-- "*" ATTACHMENT : has
    TICKET "1" o-- "0..1" RATING : receives
    USER "1" --> "*" RATING : gives
    USER "1" --> "*" NOTIFICATION : receives
    USER "1" --> "*" AUDIT_LOG : triggers
```

---

## 🚀 Setup Lokal

### Prasyarat

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MySQL** 8.0 (aktif secara lokal)
- Akun **Cloudinary** (untuk upload file)
- Kredensial **SMTP** (untuk fitur reset password)

### 1. Clone & Install

```bash
git clone https://github.com/KuWeka/sigap-polda-kalsel.git
cd sigap-polda-kalsel

# Install semua dependencies (frontend + backend + shared sekaligus)
npm install
```

### 2. Konfigurasi Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — isi DATABASE_URL, JWT_SECRET, Cloudinary, SMTP

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local — isi NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate --workspace=backend

# Jalankan migrasi
npm run prisma:migrate --workspace=backend

# Seed data awal (akun admin default)
npm run prisma:seed --workspace=backend
```

### 4. Jalankan Development Server

```bash
# Terminal 1 — Backend (port 5000)
npm run dev:backend

# Terminal 2 — Frontend (port 3000)
npm run dev:frontend
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=mysql://root:password@localhost:3306/sigap_polda_kalsel

# JWT
JWT_SECRET=ganti-dengan-string-random-panjang-yang-aman
JWT_EXPIRES_IN=24h

# CORS (ganti dengan URL Vercel di production)
CORS_ORIGIN=http://localhost:3000

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@sigap-polda-kalsel.id
PASSWORD_RESET_URL=http://localhost:3000/reset-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=SIGAP
```

---

## 📡 API Overview

Semua endpoint diawali `/api` dan memerlukan header `Authorization: Bearer <token>` kecuali auth routes.

| Domain | Endpoint | Method | Akses |
|--------|----------|--------|-------|
| **Auth** | `/api/auth/register` | POST | Public |
| | `/api/auth/login` | POST | Public |
| | `/api/auth/forgot-password` | POST | Public |
| | `/api/auth/reset-password` | POST | Public |
| **Tiket** | `/api/tickets` | GET, POST | Authenticated |
| | `/api/tickets/:id` | GET | Authenticated |
| | `/api/tickets/:id/assign` | PATCH | BIDTEKKOM |
| | `/api/tickets/:id/reject` | PATCH | BIDTEKKOM |
| | `/api/tickets/:id/assign-teknisi` | PATCH | PADAL |
| | `/api/tickets/:id/complete` | PATCH | PADAL/TEKNISI |
| | `/api/tickets/:id/cancel` | PATCH | SATKER/BIDTEKKOM |
| **Staff** | `/api/staff` | GET, POST | BIDTEKKOM |
| | `/api/staff/:id/role` | PATCH | BIDTEKKOM |
| | `/api/staff/:id` | DELETE | BIDTEKKOM |
| **Laporan** | `/api/reports/monthly` | GET | BIDTEKKOM/PADAL |
| | `/api/reports/export/pdf` | GET | BIDTEKKOM/PADAL |
| | `/api/reports/export/excel` | GET | BIDTEKKOM/PADAL |
| **Lainnya** | `/api/dashboard` | GET | Authenticated |
| | `/api/notifications` | GET, PATCH | Authenticated |
| | `/api/audit` | GET | BIDTEKKOM |
| | `/api/profile` | GET, PATCH | Authenticated |
| | `/api/settings` | GET, PATCH | BIDTEKKOM |

### Real-time Events (Socket.io)

Setiap user bergabung ke room `user_{userId}` setelah login. Event yang dikirim server ke client:

```
ticket:new            → Ada tiket baru masuk (BIDTEKKOM)
ticket:assigned       → Tiket di-assign ke PADAL
ticket:teknisi        → Tiket di-assign ke Teknisi
ticket:completed      → Tiket selesai (SATKER & BIDTEKKOM)
ticket:cancelled      → Tiket dibatalkan
ticket:rejected       → Tiket ditolak (SATKER)
notification:new      → Notifikasi baru (update badge counter)
```

---

## 🧪 Testing

Project menggunakan **Jest** dengan dua pendekatan testing:

### Property-Based Tests (fast-check)

File di `backend/src/__tests__/properties/` — menguji properti invariant yang harus selalu benar untuk semua input yang mungkin:

```bash
npm run test:property --workspace=backend
```

Properti yang diuji meliputi:
- JWT token encode/decode consistency
- Password hashing one-way (tidak bisa di-reverse)
- Rating hanya bisa diberikan untuk tiket SELESAI
- Role-based data scoping (SATKER hanya lihat tiket sendiri)
- Ticket status transitions yang valid
- Nomor tiket unik per tahun

### Unit & Integration Tests

```bash
npm run test --workspace=backend
```

### Typecheck Seluruh Workspace

```bash
npm run typecheck
```

---

## 🌐 Deployment

### Frontend → Vercel

1. Push ke GitHub, connect repo ke Vercel
2. Set **Environment Variables** di Vercel dashboard:
   ```
   NEXT_PUBLIC_API_URL     = https://your-backend.railway.app/api
   NEXT_PUBLIC_SOCKET_URL  = https://your-backend.railway.app
   NEXT_PUBLIC_APP_NAME    = SIGAP
   ```
3. Deploy otomatis setiap push ke `main`

### Backend → Railway

1. Connect repo ke Railway, pilih folder `backend` sebagai root
2. Railway mendeteksi `railway.json` secara otomatis:
   ```json
   {
     "deploy": {
       "startCommand": "npx prisma migrate deploy ... && npm run start"
     }
   }
   ```
3. Set **Environment Variables** di Railway dashboard
4. Tambahkan **MySQL plugin** di Railway, copy `DATABASE_URL` ke env backend
5. Set `CORS_ORIGIN` ke URL Vercel yang exact (tanpa trailing slash)

### Health Check & Uptime

Backend expose `/api/health` yang return `{ status: "ok" }`. Gunakan **UptimeRobot** untuk ping setiap 5 menit agar Railway tidak sleep.

---

## 🔒 Keamanan

| Aspek | Implementasi |
|-------|-------------|
| **Autentikasi** | JWT dengan expiry 24h, verifikasi soft-delete per request |
| **Auth Cache** | In-memory cache TTL 60s untuk mengurangi DB query autentikasi |
| **Password** | bcrypt salt rounds 10 |
| **Password Reset** | Token `crypto.randomBytes(32)`, disimpan sebagai SHA-256 hash, expires 15 menit |
| **RBAC** | Middleware `authorize(Role.X)` per route, tidak ada bypass |
| **Optimistic Lock** | `updateMany` dengan kondisi status di WHERE, cegah race condition assign bersamaan |
| **Rate Limiting** | Auth: 5 req/15min · Ticket create: 20 req/jam · Reset: 3 req/15min |
| **HTTP Headers** | Helmet.js: X-Content-Type-Options, X-Frame-Options, CSP, HSTS |
| **Input Validation** | Zod schema di setiap endpoint (body, params, query) termasuk UUID validation |
| **File Upload** | Whitelist MIME type, max 5MB per file, langsung ke Cloudinary |
| **Soft Delete** | User yang dihapus tidak bisa login meskipun token masih valid |
| **Audit Trail** | 14+ event type dicatat dengan aktor, timestamp, dan metadata JSON |
| **Error Handling** | `unhandledRejection` & `uncaughtException` handler, graceful SIGTERM shutdown |

---

## 📁 Dokumen Tambahan

- [`backend/src/prisma/README.md`](backend/src/prisma/README.md) — Dokumentasi schema database dan panduan migrasi
- [`tasks.md`](tasks.md) — Riwayat task development sprint 1 (27 tasks ✅)
- [`tasks_v2.md`](tasks_v2.md) — Riwayat task development sprint 2 (7 tasks ✅)

---

<div align="center">

Dibangun untuk **Polda Kalimantan Selatan** sebagai **SIGAP** &nbsp;·&nbsp; TypeScript Monorepo &nbsp;·&nbsp; Vercel + Railway

</div>