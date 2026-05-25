/**
 * TaskFlow Bot - Connection Manager
 * Handles WhatsApp connection lifecycle with smart reconnection
 */

const { DisconnectReason } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const CONFIG = require("../config");

class ConnectionManager {
    constructor(socket, bot) {
        this.socket = socket;
        this.bot = bot;
        this.isConnecting = false;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;

        // Reconnection config
        this.maxReconnectAttempts = 10;
        this.baseDelay = 3000;      // 3 seconds
        this.maxDelay = 60000;       // 1 minute
        this.backoffMultiplier = 1.5;
    }

    start() {
        this.socket.ev.on("connection.update", this.handleConnectionUpdate.bind(this));
        this.printStartup();
    }

    printStartup() {
        console.log("╔════════════════════════════════════════════╗");
        console.log("║    🚀 TaskFlow Bot v3.0 Starting...       ║");
        console.log("╚════════════════════════════════════════════╝");
    }

    handleConnectionUpdate({ connection, qr, lastDisconnect }) {
        // ── QR Code ──
        if (qr) {
            this.showQRCode(qr);
        }

        // ── Connected ──
        if (connection === "open") {
            this.onConnected();
        }

        // ── Disconnected ──
        if (connection === "close") {
            this.onDisconnected(lastDisconnect);
        }
    }

    showQRCode(qr) {
        console.log("\n┌────────────────────────────────────────┐");
        console.log("│  📱 SCAN QR INI DI WHATSAPP            │");
        console.log("│  Menu → Perangkat Tertaut → Tautkan    │");
        console.log("└────────────────────────────────────────┘");
        qrcode.generate(qr, { small: false });
        console.log("└────────────────────────────────────────┘\n");
    }

    onConnected() {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅  BERHASIL TERHUBUNG!");
        console.log("📱  TaskFlow Bot Ready");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        // Reset state
        this.isConnecting = false;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;

        // Start reminder manager
        if (this.bot.reminderManager) {
            this.bot.reminderManager.start();
        }

        console.log("⏰  Reminder manager aktif");
        console.log("📝  Ketik +nama tugas untuk memulai!\n");
    }

    onDisconnected(lastDisconnect) {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("❌  Koneksi Terputus");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // Stop reminder manager
        if (this.bot.reminderManager) {
            this.bot.reminderManager.stop();
        }

        // Parse disconnect reason
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason = this.getDisconnectReason(statusCode);

        console.log(`📋  Alasan: ${reason}`);

        // Don't reconnect if logged out
        if (statusCode === DisconnectReason.loggedOut) {
            this.onLoggedOut();
            return;
        }

        // Don't reconnect if banned
        if (statusCode === 403) {
            console.log("\n⚠️  Akun diblokir. Gunakan nomor lain.\n");
            return;
        }

        // Handle reconnection
        this.scheduleReconnect();
    }

    onLoggedOut() {
        console.log("\n🚪  Anda telah logout dari WhatsApp");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📋  Untuk login ulang:");
        console.log("   1. Hapus folder sessions/");
        console.log("   2. Jalankan bot kembali");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        this.isReconnecting = false;
        this.reconnectAttempts = 0;
    }

    scheduleReconnect() {
        if (this.isReconnecting) return;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.onMaxReconnectReached();
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;

        const delay = this.getReconnectDelay();
        const delaySec = Math.round(delay / 1000);

        console.log(`\n🔄  Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        console.log(`⏱️   Menunggu ${delaySec}s...\n`);

        this.reconnectTimer = setTimeout(() => {
            this.isReconnecting = false;
            this.bot.start();
        }, delay);
    }

    getReconnectDelay() {
        const delay = Math.min(
            this.baseDelay * Math.pow(this.backoffMultiplier, this.reconnectAttempts - 1),
            this.maxDelay
        );
        return Math.floor(delay);
    }

    onMaxReconnectReached() {
        console.log("\n⛔  Gagal reconnect setelah 10 percobaan");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("💡  Kemungkinan penyebab:");
        console.log("   • Internet tidak stabil");
        console.log("   • Server WhatsApp masalah");
        console.log("   • Session corrupt");
        console.log("\n📋  Solusi:");
        console.log("   1. Cek koneksi internet");
        console.log("   2. Tunggu beberapa menit");
        console.log("   3. Hapus folder sessions/");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        this.reconnectAttempts = 0;
    }

    getDisconnectReason(statusCode) {
        const reasons = {
            [DisconnectReason.loggedOut]: "logged_out",
            401: "auth_error",
            403: "banned",
            408: "timeout",
            427: "ip_changed",
            440: "same_session",
            500: "server_error",
            515: "restarting",
        };
        return reasons[statusCode] || `unknown_${statusCode}`;
    }

    cleanup() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.bot.reminderManager) {
            this.bot.reminderManager.stop();
        }
    }
}

module.exports = ConnectionManager;