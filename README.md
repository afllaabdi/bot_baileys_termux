# TaskFlow Bot v3.0

**Modern WhatsApp Task Assistant** - Bot pengingat tugas dengan UI clean, command simpel, dan fitur produktivitas modern.

![TaskFlow Banner](https://img.shields.io/badge/TaskFlow-v3.0-6366f1?style=for-the-badge)

---

## 🎯 Fitur Utama

| Fitur | Deskripsi |
|-------|------------|
| ⚡ **Smart Input** | Parsing natural language, cukup ketik `!+nama 2h` |
| 🎨 **UI Modern** | Tampilan clean dan minimalis |
| 📊 **Dashboard** | Lihat semua tugas dalam format modern |
| 🔔 **Reminder Cerdas** | Pengingat otomatis 15mnt, 1jam, rutin |
| 📁 **Auto Category** | Kategori otomatis: Kuliah, Kerja, dll |
| 📈 **Stats** | Statistik produktivitas kamu |
| ⚡ **Quick Actions** | `!done`, `!del`, `!pin` untuk aksi cepat |
| 👥 **Group Mode** | Bot tidak spam - hanya respond saat di-mention atau pakai prefix |

---

## 🚀 Cara Install

### Prerequisites

- Node.js v16+
- npm
- WhatsApp account

### 1. Clone / Download

```bash
# Clone repository
git clone https://github.com/username/taskflow-bot.git
cd taskflow-bot

# Atau download file secara manual
# Lalu extract ke folder yang diinginkan
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Jalankan Bot

```bash
node bot.js
```

### 4. Scan QR Code

1. Buka **WhatsApp** di HP
2. Ketuk **⋮ Menu** → **Perangkat Tertaut**
3. Ketuk **Tautkan Perangkat**
4. Scan QR code yang muncul di terminal

---

## 👥 Setup di Grup WhatsApp

Bot sekarang mendukung **group mode** - tidak akan merespons pesan random di grup!

### Cara Kerja

| Kondisi | Bot Merespons? |
|---------|---------------|
| Di-mention (@bot) | ✅ Ya |
| Reply pesan bot | ✅ Ya |
| Pakai prefix `!` + command valid | ✅ Ya |
| Pesan random (tanpa mention/prefix) | ❌ Tidak |

### Contoh di Grup

```
📢 Alice: !+tugas AI 3h          → ✅ Bot respons
📢 Bob: !list                     → ✅ Bot respons
📢 Charlie: @TaskFlow list        → ✅ Bot respons (mention)
📢 David: pagi semua!             → ❌ Bot diam
📢 Eve: ada yang tahu deadline?   → ❌ Bot diam
```

### Ubah Prefix

Edit `src/config.js` untuk ubah prefix:

```javascript
COMMAND_PREFIX: "!"   // Default
COMMAND_PREFIX: "."   // Alternatif
COMMAND_PREFIX: "/"   // Alternatif
COMMAND_PREFIX: ""    // Nonaktifkan prefix
```

---

## ⌨️ Daftar Command

### ➕ Tambah Tugas

| Command | Description | Contoh |
|---------|-------------|--------|
| `!+[nama] [waktu]` | Tambah tugas cepat | `!+AI 2h` |
| `!+[nama] [jumlah]h` | Deadline dalam jam | `!+laporan 3h` |
| `!+[nama] [jumlah]hari` | Deadline dalam hari | `!+tugas 3hari` |
| `!+[nama] besok` | Deadline besok | `!+meeting besok` |
| `!+[nama] besok jam [jam]` | Besok jam tertentu | `!+presentasi besok jam 9` |
| `!+[nama] [hari]` | Hari spesifik | `!+tugas senin` |
| `!+[nama] malam ini` | Deadline malam ini | `!+review malam ini` |

**Contoh Penggunaan:**

```
!+AI 2h                    → AI, deadline 2 jam
!+laporan 3h                → Laporan, deadline 3 jam
!+UI figma 2hari           → UI figma, 2 hari
!+meeting besok jam 8       → Meeting besok jam 08:00
!+tugas senin jam 10        → Tugas deadline Senin jam 10
!+presentasi 3hari         → Presentasi, 3 hari
!+laporan lusa              → Laporan, 2 hari lagi
```

### ⚡ Quick Actions

| Command | Fungsi | Contoh |
|---------|--------|--------|
| `!done [id]` | Tandai selesai | `!done 1` |
| `!del [id]` | Hapus tugas | `!del 2` |
| `!pin [id]` | Set/unset priority | `!pin 3` |
| `!edit [id] [nama baru]` | Edit nama tugas | `!edit 1 Laporan Final` |

**Contoh:**

```
!done 1          → Tandai tugas ID 1 selesai
!del 2           → Hapus tugas ID 2
!pin 3           → Set tugas ID 3 sebagai priority
!edit 1 Nama Baru → Ubah nama tugas ID 1
```

### 📋 Dashboard & Stats

| Command | Fungsi |
|---------|--------|
| `!list` | Lihat dashboard tugas |
| `!list aktif` | Lihat tugas aktif saja |
| `!list done` | Lihat tugas selesai saja |
| `!stats` | Statistik produktivitas |
| `!menu` | Menu bantuan lengkap |

---

## 📊 Contoh Penggunaan

### 1. Tambah Tugas Baru

```
Kamu: +laporan AI 3h
Bot:  ✅ Tugas Ditambahkan

📌 Laporan AI
🕐 25 Mei 18:30 · ⏱️ 3j
🔴 High Priority · 📚 Kuliah

─────────────────────
```

### 2. Lihat Dashboard

```
Kamu: .list
Bot:
─────────────────────
📊 TASKFLOW DASHBOARD

─────────────────────

🔴 Terlambat (1)
  [1] ⏰ Laporan AI · 2d

🟡 Hari Ini (2)
  [2] ⏳ Presentasi PPT · 3j 20m
  [3] ⏳ UI Design · 5j

🟢 Akan Datang
  [4] ⏳ Meeting Client · 1h
  [5] ⏳ Laporan Mingguan · 2d

─────────────────────

📈 Aktif: 5 · Selesai: 3 · Overdue: 1
```

### 3. Tandai Selesai

```
Kamu: .done 1
Bot:  ✅ Tugas Selesai!

📌 Laporan AI

🎉 Satu beban terangkat!
```

### 4. Lihat Stats

```
Kamu: stats
Bot:
─────────────────────
📊 STATISTIK KAMU

─────────────────────

📈 Overview
  Total tugas: 12
  Aktif: 5 · Selesai: 7

🏆 Hari Ini
  Selesai: 2
  Terlambat: 0
  Completion rate: 58%

📁 Kategori
  📚 Kuliah: 5
  💼 Kerja: 4
  💻 Project: 3

─────────────────────
```

---

## 📁 Auto Categories

Bot otomatis mengkategorikan tugas berdasarkan keyword:

| Kategori | Keyword | Emoji |
|----------|---------|-------|
| Kuliah | kuliah, kelas, dosen, ujian, quiz | 📚 |
| Kerja | kerja, kantor, meeting, presentasi | 💼 |
| Project | project, app, code, github, figma | 💻 |
| Pribadi | pribadi, rumah, keluarga | 🏠 |
| Health | gym, olahraga, diet, kesehatan | 🏃 |

---

## 🔔 Sistem Reminder

Bot mengirim pengingat otomatis:

| Timing | Pesan |
|-------|-------|
| 15 menit sebelum | 🔴 **15 Menit Lagi!** |
| 1 jam sebelum | 🟠 **1 Jam Lagi!** |
| Rutin (setiap 5 jam) | 📝 **Pengingat** |
| Deadline lewat | ⚠️ **Deadline Terlewat!** |

---

## 🛠️ Setup di Termux

### 1. Install Node.js

```bash
pkg update && pkg upgrade
pkg install nodejs
```

### 2. Install Bot

```bash
# Buat folder
mkdir taskflow
cd taskflow

# Install dependencies
npm install @whiskeysockets/baileys pino qrcode-terminal

# Copy file bot.js dan src/ ke folder ini
```

### 3. Jalankan

```bash
node bot.js
```

---

## ⚙️ Setup PM2 (Background)

Agar bot tetap jalan di background:

```bash
# Install PM2
npm install -g pm2

# Jalankan dengan PM2
pm2 start bot.js --name taskflow

# Cek status
pm2 status

# Lihat logs
pm2 logs taskflow

# Restart bot
pm2 restart taskflow

# Stop bot
pm2 stop taskflow
```

### Auto-start saat boot

```bash
pm2 startup
pm2 save
```

---

## ⚠️ Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Bot disconnect terus | Hapus folder `sessions/`, scan QR lagi |
| QR tidak muncul | Cek koneksi internet |
| Node error | `npm install` ulang |
| Out of memory | Tutup aplikasi lain |
| Reminder tidak kirim | Pastikan HP online |

---

## 📝 File Structure

```
taskflow-bot/
├── bot.js                    # Main entry point
├── package.json              # Dependencies
├── sessions/                 # WhatsApp auth (auto-generated)
├── data/
│   └── tasks.json           # Database (auto-generated)
└── src/
    ├── config.js             # Configuration
    └── helpers/
        ├── database.js       # Database operations
        ├── parser.js         # Smart input parser
        ├── ui.js             # Message UI formatter
        ├── reminder.js       # Reminder scheduler
        └── connection.js     # Connection manager
```

---

## 🔧 Configuration

Edit `src/config.js` untuk mengubah setting:

```javascript
const CONFIG = {
    // Reminder interval (ms)
    REMINDER_INTERVAL: 30_000,

    // Routine reminder every (ms)
    REMINDER_ROUTIN: 5 * 60 * 60 * 1000,

    // Anti-spam cooldown (ms)
    COOLDOWN_MS: 2000,

    // Max task title length
    MAX_TASK_TITLE: 200,
};
```

---

## 📜 License

MIT License - Bebas digunakan dan dimodifikasi.

---

## 🙋 Dukungan

Kalau ada bug atau butuh fitur baru, buat issue di GitHub repo.

---

**Made with ❤️ for productivity**