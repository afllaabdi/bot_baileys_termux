/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║           TASKFLOW - Modern WhatsApp Task Assistant            ║
 * ║           Premium Productivity Bot for Modern Users             ║
 * ╚════════════════════════════════════════════════════════════════╝
 *
 * A modern, clean, and fast task reminder bot with smart parsing,
 * beautiful UI, and productivity-focused features.
 *
 * @author TaskFlow Bot
 * @version 3.0.0
 */

"use strict";

// ═══════════════════════════════════════════════════════════════════════════
// DEPENDENCIES
// ═══════════════════════════════════════════════════════════════════════════

const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const P = require("pino");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════════════════
// CORE IMPORTS
// ═══════════════════════════════════════════════════════════════════════════

const Config = require("./src/config");
const Database = require("./src/helpers/database");
const SmartParser = require("./src/helpers/parser");
const ReminderManager = require("./src/helpers/reminder");
const ConnectionManager = require("./src/helpers/connection");
const MessageUI = require("./src/helpers/ui");

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BOT CLASS
// ═══════════════════════════════════════════════════════════════════════════

class TaskFlowBot {
    constructor() {
        this.db = new Database();
        this.parser = new SmartParser();
        this.reminderManager = new ReminderManager(this);
        this.connectionManager = null;
        this.socket = null;
        this.isReady = false;
    }

    async start() {
        this.printBanner();
        this.db.init();

        const { state, saveCreds } = await useMultiFileAuthState(Config.SESSION_DIR);

        this.socket = makeWASocket({
            auth: state,
            logger: P({ level: "silent" }),
            browser: ["TaskFlow Bot", "Chrome", "3.0"],
            printQRInTerminal: false,
            shouldSyncHistory: () => false,
            buyTicketForMe: { enabled: false },
        });

        // Save credentials on update
        this.socket.ev.on("creds.update", saveCreds);

        // Initialize connection manager
        this.connectionManager = new ConnectionManager(this.socket, this);

        // Setup message handler
        this.socket.ev.on("messages.upsert", async ({ messages }) => {
            for (const msg of messages) {
                await this.handleMessage(msg);
            }
        });

        // Start the connection
        this.connectionManager.start();
    }

    async handleMessage(msg) {
        if (!msg?.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const isGroup = from?.endsWith("@g.us");
        const text = this.extractText(msg);
        const botNumber = this.socket.user?.id?.replace(":","@") || "";

        if (!text?.trim()) return;

        // Check if this is a group and if bot is mentioned
        const isMentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.includes(botNumber);
        const isReplyToBot = msg.message.extendedTextMessage?.contextInfo?.participant === botNumber;

        // Check prefix - only respond if message starts with prefix
        const hasPrefix = Config.COMMAND_PREFIX && text.trim().startsWith(Config.COMMAND_PREFIX);

        // In groups: only respond if mentioned, replied to bot, OR (has prefix AND command starts with prefix)
        // In private: respond to all valid commands (prefix optional for familiarity)
        const shouldRespond = isGroup
            ? (isMentioned || isReplyToBot || (hasPrefix && this.isCommand(text.trim().substring(1))))
            : (hasPrefix || this.isCommand(text));

        if (!shouldRespond) return;

        try {
            // Remove prefix from text if present
            const cleanText = hasPrefix ? text.trim().substring(1) : text;
            const response = await this.processCommand(cleanText, from, isMentioned);
            if (response) {
                await this.sendResponse(from, response);
            }
        } catch (err) {
            console.error("⚠️ Error:", err.message);
        }
    }

    isCommand(text) {
        const trimmed = text.trim().toLowerCase();
        return trimmed.startsWith("+") ||
               trimmed.startsWith(".") ||
               trimmed.startsWith("/") ||
               ["list", "stats", "menu", "help", "hi", "halo", "hai", "?"].includes(trimmed);
    }

    extractText(msg) {
        return msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            "";
    }

    async processCommand(text, from, wasMentioned = false) {
        const trimmed = text.trim();
        const lower = trimmed.toLowerCase();

        // Anti-spam check
        if (this.db.isSpam(from)) {
            return MessageUI.spamWarning();
        }
        this.db.recordActivity(from);

        // Greeting - use different response if mentioned
        if (["hi", "halo", "hai", "yo", "hey"].includes(lower)) {
            return MessageUI.greeting(wasMentioned);
        }

        // Quick help
        if (lower === "?" || lower === "help") {
            return MessageUI.quickHelp();
        }

        // ─────────────────────────────────────────────────────────────────
        // ADD TASK (+)
        // ─────────────────────────────────────────────────────────────────
        if (trimmed.startsWith("+")) {
            return this.handleAddTask(trimmed.substring(1), from);
        }

        // ─────────────────────────────────────────────────────────────────
        // QUICK ACTIONS (.)
        // ─────────────────────────────────────────────────────────────────
        if (trimmed.startsWith(".")) {
            return this.handleQuickAction(trimmed, from);
        }

        // ─────────────────────────────────────────────────────────────────
        // DASHBOARD
        // ─────────────────────────────────────────────────────────────────
        if (lower === "list" || lower === ".list" || lower === "/list") {
            return this.handleDashboard(from);
        }

        // ─────────────────────────────────────────────────────────────────
        // STATS
        // ─────────────────────────────────────────────────────────────────
        if (["stats", "stat", "statistik"].includes(lower)) {
            return this.handleStats(from);
        }

        // ─────────────────────────────────────────────────────────────────
        // MENU
        // ─────────────────────────────────────────────────────────────────
        if (["menu", "/menu", "/help", "/commands"].includes(lower)) {
            return MessageUI.fullMenu();
        }

        // Unknown command - in groups only respond if mentioned
        if (wasMentioned) {
            return MessageUI.unknownCommand(trimmed);
        }
        return null;
    }

    async handleAddTask(input, from) {
        const result = this.parser.parse(input);

        if (!result.valid) {
            return MessageUI.addTaskError(result.error);
        }

        const task = {
            id: this.db.generateId(),
            chat: from,
            title: result.title,
            deadline: result.deadline,
            category: result.category,
            priority: result.priority,
            createdAt: Date.now(),
            nextReminder: Date.now() + Config.REMINDER_ROUTIN,
            oneHourSent: false,
            fifteenSent: false,
            deadlineSent: false,
            status: "active",
        };

        this.db.addTask(task);
        this.reminderManager.scheduleReminder(task);

        return MessageUI.taskAdded(task);
    }

    async handleQuickAction(command, from) {
        const parts = command.substring(1).split(" ");
        const action = parts[0]?.toLowerCase();
        const arg = parts.slice(1).join(" ");
        const userTasks = this.db.getUserTasks(from);

        switch (action) {
            // ── Done ──
            case "done":
            case "d":
            case "selesai": {
                const id = parseInt(arg);
                const task = userTasks.find(t => t.id === id);
                if (!task) return MessageUI.taskNotFound(id);

                this.db.updateTask(id, from, { status: "done", completedAt: Date.now() });
                return MessageUI.taskDone(task);
            }

            // ── Delete ──
            case "del":
            case "delete":
            case "hapus": {
                const id = parseInt(arg);
                const task = userTasks.find(t => t.id === id);
                if (!task) return MessageUI.taskNotFound(id);

                this.db.deleteTask(id, from);
                return MessageUI.taskDeleted(task);
            }

            // ── Edit ──
            case "edit":
            case "rename": {
                const match = arg.match(/(\d+)\s+(.+)/);
                if (!match) return MessageUI.editUsage();

                const id = parseInt(match[1]);
                const newTitle = match[2].trim();
                const task = userTasks.find(t => t.id === id);
                if (!task) return MessageUI.taskNotFound(id);

                this.db.updateTask(id, from, { title: newTitle });
                return MessageUI.taskEdited(task, newTitle);
            }

            // ── Pin ──
            case "pin": {
                const id = parseInt(arg);
                const task = userTasks.find(t => t.id === id);
                if (!task) return MessageUI.taskNotFound(id);

                this.db.updateTask(id, from, { priority: task.priority === "high" ? "normal" : "high" });
                return MessageUI.taskPinned(task);
            }

            // ── List Quick ──
            case "list":
            case "l": {
                return this.handleDashboard(from);
            }

            // ── Help Quick ──
            case "h":
            case "?": {
                return MessageUI.quickHelp();
            }

            default:
                return MessageUI.unknownCommand(command);
        }
    }

    async handleDashboard(from) {
        const tasks = this.db.getUserTasks(from);
        return MessageUI.dashboard(tasks);
    }

    async handleStats(from) {
        const tasks = this.db.getUserTasks(from);
        return MessageUI.stats(tasks);
    }

    async sendResponse(to, text) {
        try {
            await this.socket.sendMessage(to, { text });
        } catch (err) {
            console.error("Failed to send:", err.message);
        }
    }

    printBanner() {
        console.log(Config.BANNER);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("\n📥 Shutting down...");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n📥 Shutting down...");
    process.exit(0);
});

// Global error handlers
process.on("uncaughtException", (err) => {
    console.error("❌ Error:", err.message);
});

process.on("unhandledRejection", (reason) => {
    console.error("❌ Rejection:", reason);
});

// Auto backup
setInterval(() => {
    try {
        if (fs.existsSync(Config.DB_FILE)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            fs.copyFileSync(Config.DB_FILE, `./backup-${timestamp}.json`);
        }
    } catch (err) {
        console.error("⚠️ Backup failed:", err.message);
    }
}, 3600000);

// Start bot
const bot = new TaskFlowBot();
bot.start().catch(console.error);