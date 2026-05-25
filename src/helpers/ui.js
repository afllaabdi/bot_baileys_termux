/**
 * TaskFlow Bot - Message UI Formatter
 * Creates beautiful, modern, and clean chat messages
 */

const SmartParser = require("./parser");

const parser = new SmartParser();

const DIVIDER = "─────────────────────";
const DIVIDER_THIN = "────────────────────";
const BULLET = "  •";

class MessageUI {
    // ═══════════════════════════════════════════════════════════════════════
    // GREETING & HELP
    // ═══════════════════════════════════════════════════════════════════════

    static greeting() {
        const hour = new Date().getHours();
        let greeting = "Halo";
        if (hour < 12) greeting = "Selamat Pagi";
        else if (hour < 17) greeting = "Selamat Siang";
        else if (hour < 21) greeting = "Selamat Sore";
        else greeting = "Selamat Malam";

        return `${greeting}! 👋

Saya TaskFlow, asisten produktivitas kamu.

━━━━━━━━━━━━━━━━━━━━━━━━
📌 Cara cepat tambah tugas:

${BULLET} +nama tugas 2h
${BULLET} +meeting besok jam 8
${BULLET} +laporan 3hari

━━━━━━━━━━━━━━━━━━━━━━━━
🔹 .list    → Lihat semua tugas
🔹 .done 1  → Tandai selesai
🔹 .del 1   → Hapus tugas
🔹 stats    → Statistik kamu

Ketik .h untuk bantuan lengkap`;
    }

    static quickHelp() {
        return `${DIVIDER}
📖 *GUIDE CEPAT*

${DIVIDER_THIN}
➕ *Tambah Tugas:*
  +nama 2h        → 2 jam
  +nama 3hari     → 3 hari
  +nama besok jam 8

${DIVIDER_THIN}
⚡ *Quick Actions:*
  .done 1   → Selesai
  .del 1    → Hapus
  .pin 1    → Priority
  .edit 1 nama baru → Edit

${DIVIDER_THIN}
📋 *Lainnya:*
  .list   → Dashboard
  stats   → Statistik
  menu    → Menu lengkap
${DIVIDER}`;
    }

    static fullMenu() {
        return `${DIVIDER}
📋 *TASKFLOW MENU*

${DIVIDER_THIN}
➕ *Tambah Tugas*
  +tugas 2h
  +tugas besok jam 8
  +tugas senin jam 10
  +tugas 3hari

${DIVIDER_THIN}
📝 *Lihat Tugas*
  .list        → Semua
  .list aktif  → Belum
  .list done   → Selesai

${DIVIDER_THIN}
⚡ *Quick Actions*
  .done [id]   → Selesai
  .del [id]    → Hapus
  .pin [id]    → Priority
  .edit [id] [nama baru]

${DIVIDER_THIN}
📊 *Stats*
  stats        → Statistik

${DIVIDER_THIN}
💡 *Tips*
  • ID tugas lihat di .list
  • Priority (pin) = Urgent
  • Kategori = Otomatis

Ketik +nama tugas untuk mulai!
${DIVIDER}`;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TASK ADDED
    // ═══════════════════════════════════════════════════════════════════════

    static taskAdded(task) {
        const relativeTime = parser.formatRelativeTime(task.deadline);
        const deadline = new Date(task.deadline);
        const timeStr = deadline.toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });

        const priorityIcon = task.priority === "high" ? "🔴" : "⚪";
        const categoryIcon = this.getCategoryIcon(task.category);

        return `✅ *Tugas Ditambahkan*

${categoryIcon} ${task.title}

🕐 ${timeStr} · ⏱️ ${relativeTime}
${priorityIcon} ${this.capitalize(task.priority)} · ${this.capitalize(task.category)}

${DIVIDER}`;
    }

    static addTaskError(error) {
        return `⚠️ *Gagal Menambah Tugas*

${error}

📝 Contoh: +laporan 2h`;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════

    static dashboard(tasks) {
        const active = tasks.filter(t => t.status === "active");
        const completed = tasks.filter(t => t.status === "done");
        const overdue = active.filter(t => t.deadline < Date.now());
        const today = active.filter(t => {
            const d = new Date(t.deadline);
            const now = new Date();
            return d.toDateString() === now.toDateString();
        });
        const upcoming = active.filter(t => t.deadline >= Date.now()).sort((a, b) => a.deadline - b.deadline);

        let header = `${DIVIDER}
📊 *TASKFLOW DASHBOARD*

${DIVIDER_THIN}
`;

        if (tasks.length === 0) {
            return header + `📭 Belum ada tugas.

Ketik +nama tugas untuk mulai!`;
        }

        let body = "";

        // Overdue section
        if (overdue.length > 0) {
            body += `\n🔴 *Terlambat* (${overdue.length})
`;
            overdue.slice(0, 3).forEach(t => {
                body += `  ${this.formatTaskMini(t, true)}\n`;
            });
            if (overdue.length > 3) body += `  +${overdue.length - 3} lagi...\n`;
        }

        // Today section
        if (today.length > 0) {
            body += `\n🟡 *Hari Ini* (${today.length})
`;
            today.slice(0, 3).forEach(t => {
                body += `  ${this.formatTaskMini(t)}\n`;
            });
            if (today.length > 3) body += `  +${today.length - 3} lagi...\n`;
        }

        // Upcoming section
        if (upcoming.length > 0) {
            body += `\n🟢 *Akan Datang*
`;
            upcoming.slice(0, 5).forEach(t => {
                body += `  ${this.formatTaskMini(t)}\n`;
            });
        }

        // Completed section
        if (completed.length > 0) {
            body += `\n✅ *Selesai* (${completed.length})
`;
        }

        const footer = `${DIVIDER}

📈 Aktif: ${active.length} · Selesai: ${completed.length} · Overdue: ${overdue.length}`;

        return header + body + footer;
    }

    static formatTaskMini(task, overdue = false) {
        const id = task.id;
        const title = task.title.length > 20 ? task.title.slice(0, 20) + "..." : task.title;
        const time = parser.formatRelativeTime(task.deadline);
        const icon = overdue ? "⏰" : "⏳";
        return `[${id}] ${icon} ${title} · ${time}`;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STATS
    // ═══════════════════════════════════════════════════════════════════════

    static stats(tasks) {
        const total = tasks.length;
        const active = tasks.filter(t => t.status === "active").length;
        const done = tasks.filter(t => t.status === "done").length;
        const overdue = tasks.filter(t => t.status === "active" && t.deadline < Date.now()).length;

        const todayDone = tasks.filter(t => {
            if (!t.completedAt) return false;
            const d = new Date(t.completedAt);
            const now = new Date();
            return d.toDateString() === now.toDateString();
        }).length;

        // Calculate completion rate
        const rate = total > 0 ? Math.round((done / total) * 100) : 0;

        // Category breakdown
        const categories = {};
        tasks.forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + 1;
        });

        let catBreakdown = "";
        Object.entries(categories).slice(0, 4).forEach(([cat, count]) => {
            catBreakdown += `\n  ${this.getCategoryIcon(cat)} ${this.capitalize(cat)}: ${count}`;
        });

        return `${DIVIDER}
📊 *STATISTIK KAMU*

${DIVIDER_THIN}

📈 *Overview*
  Total tugas: ${total}
  Aktif: ${active} · Selesai: ${done}

${DIVIDER_THIN}

🏆 *Hari Ini*
  Selesai: ${todayDone}
  Terlambat: ${overdue}
  Completion rate: ${rate}%

${DIVIDER_THIN}

📁 *Kategori*${catBreakdown}

${DIVIDER}`;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // QUICK ACTIONS
    // ═══════════════════════════════════════════════════════════════════════

    static taskDone(task) {
        return `✅ *Tugas Selesai!*

${task.title}

🎉 Satu beban terangkat!`;
    }

    static taskDeleted(task) {
        return `🗑️ *Tugas Dihapus*

${task.title}

(ID ${task.id})`;
    }

    static taskEdited(task, newTitle) {
        return `✏️ *Tugas Diubah*

  ${task.title}
      ↓
  ${newTitle}

(ID ${task.id})`;
    }

    static taskPinned(task) {
        const isPinned = task.priority === "high";
        return `${isPinned ? "📌" : "📍"} *Priority Diubah*

${task.title}

Sekarang: ${isPinned ? "🔴 High Priority" : "⚪ Normal"}`;
    }

    static taskNotFound(id) {
        return `⚠️ *Tugas Tidak Ditemukan*

ID ${id} tidak ada.

Ketik .list untuk melihat tugas.`;
    }

    static editUsage() {
        return `⚠️ *Format Edit Salah*

Gunakan: .edit [id] [nama baru]

Contoh: .edit 1 Laporan Final`;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ERROR & WARNING
    // ═══════════════════════════════════════════════════════════════════════

    static unknownCommand(cmd) {
        return `❓ *Command Tidak Dikenal*

"${cmd}"

Ketik .h untuk bantuan, atau +nama tugas untuk menambah.`;
    }

    static spamWarning() {
        return `⚠️ *Terlalu Cepat*

Tunggu sebentar sebelum mengirim lagi.`;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REMINDERS
    // ═══════════════════════════════════════════════════════════════════════

    static reminder15Min(task) {
        return `🔴 *15 Menit Lagi!*

${task.title}

Waktunya kumpulkan sekarang!`;
    }

    static reminder1Hour(task) {
        return `🟠 *1 Jam Lagi!*

${task.title}

Segera kerjakan!`;
    }

    static reminderRoutine(task) {
        const time = parser.formatRelativeTime(task.deadline);
        return `📝 *Pengingat*

${task.title}
⏱️ ${time} lagi`;
    }

    static reminderOverdue(task) {
        return `⚠️ *Deadline Terlewat!*

${task.title}

Hubungi dosen/kordinator untuk solusi.`;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    static getCategoryIcon(category) {
        const icons = {
            kuliah: "📚",
            kerja: "💼",
            pribadi: "🏠",
            project: "💻",
            health: "🏃",
            meeting: "📅",
            other: "📌"
        };
        return icons[category] || "📌";
    }

    static capitalize(str) {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

module.exports = MessageUI;