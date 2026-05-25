/**
 * TaskFlow Bot - Configuration
 * Centralized configuration for the entire bot
 */

const path = require("path");

const CONFIG = {
    // Files
    DB_FILE: path.join(__dirname, "..", "data", "tasks.json"),
    SESSION_DIR: path.join(__dirname, "..", "sessions"),
    BACKUP_DIR: path.join(__dirname, "..", "backups"),

    // Reminder settings
    REMINDER_INTERVAL: 30_000,          // Check every 30 seconds
    REMINDER_ROUTIN: 5 * 60 * 60 * 1000,  // 5 hours routine reminder

    // Deadlines
    DEADLINE_1_HOUR: 60 * 60 * 1000,
    DEADLINE_15_MIN: 15 * 60 * 1000,

    // Limits
    MAX_BACKUP: 5,
    MAX_TASK_TITLE: 200,
    COOLDOWN_MS: 2000,  // Anti-spam: 2 seconds between messages

    // Command prefix - bot only responds to messages with this prefix
    // For group use, set to "!" or "." - bot won't respond to random messages
    // Set to "" to allow all messages (private chat only)
    COMMAND_PREFIX: "!",

    // Allowed JIDs for group mode (empty = all groups allowed)
    // Example: ["123456789-987654321@g.us", "group2@g.us"]
    ALLOWED_GROUPS: [],

    // Keywords for auto-categorization
    CATEGORIES: {
        kuliah: ["kuliah", "kelas", "dosen", "ujian", "quiz", "tugas", "praktikum", "modul", "krs", "semester"],
        kerja: ["kerja", "kantor", "meeting", "presentasi", "laporan", "deadline", "client", "project"],
        pribadi: ["pribadi", "rumah", "keluarga", "belanja", "masak", "bersih", "laundry"],
        project: ["project", "app", "website", "design", "ui", "ux", "code", "github", "figma"],
        health: ["gym", "olahraga", "diet", "obat", "dokter", "checkup", "kesehatan"],
    },

    // Priority keywords
    PRIORITY_KEYWORDS: {
        high: ["urgent", "penting", "buru", "sekarang", "today", "besok"],
        low: ["kapan", "nanti", "kurang", "bisa"],
    },

    // Banner art
    BANNER: `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ███████╗██╗   ██╗ ██████╗ ██████╗ ███╗   ██╗██╗  ██╗   ║
║   ██╔════╝██║   ██║██╔════╝██╔═══██╗████╗  ██║██║ ██╔╝   ║
║   ███████╗██║   ██║██║     ██║   ██║██╔██╗ ██║█████╔╝    ║
║   ╚════██║██║   ██║██║     ██║   ██║██║╚██╗██║██╔═██╗    ║
║   ███████║╚██████╔╝╚██████╗╚██████╔╝██║  ╚████║██║  ██╗   ║
║   ╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝   ╚═══╝╚═╝  ╚═╝   ║
║                                                           ║
║        Modern WhatsApp Productivity Assistant             ║
║                   v3.0.0 Premium                          ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║  🚀 Starting TaskFlow Bot...                              ║
║  📱 Ready for WhatsApp connection                          ║
╚═══════════════════════════════════════════════════════════╝
`
};

module.exports = CONFIG;