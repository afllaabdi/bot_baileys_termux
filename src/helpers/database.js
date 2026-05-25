/**
 * TaskFlow Bot - Database Helper
 * Handles all JSON database operations
 */

const fs = require("fs");
const path = require("path");
const CONFIG = require("../config");

class Database {
    constructor() {
        this.filePath = CONFIG.DB_FILE;
        this.ensureDataDir();
    }

    ensureDataDir() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    init() {
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({
                tasks: [],
                users: {},
                stats: {
                    totalTasksCreated: 0,
                    totalTasksCompleted: 0,
                    streak: 0,
                    longestStreak: 0,
                    lastCompletedAt: null
                }
            }, null, 2));
            console.log("📁 Database initialized:", this.filePath);
        }
    }

    read() {
        try {
            return JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
        } catch {
            return { tasks: [], users: {}, stats: {} };
        }
    }

    write(data) {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    }

    // ── Task Operations ──────────────────────────────────────────────────────

    getAllTasks() {
        return this.read().tasks || [];
    }

    getUserTasks(chatId) {
        return this.getAllTasks().filter(t => t.chat === chatId);
    }

    getActiveTasks(chatId) {
        return this.getUserTasks(chatId).filter(t => t.status === "active");
    }

    getCompletedTasks(chatId) {
        return this.getUserTasks(chatId).filter(t => t.status === "done");
    }

    getOverdueTasks(chatId) {
        const now = Date.now();
        return this.getUserTasks(chatId).filter(t => t.status === "active" && t.deadline < now);
    }

    getTaskById(id, chatId) {
        return this.getUserTasks(chatId).find(t => t.id === id);
    }

    addTask(task) {
        const data = this.read();
        data.tasks.push(task);
        data.stats.totalTasksCreated++;
        this.write(data);
        return task;
    }

    updateTask(id, chatId, updates) {
        const data = this.read();
        const idx = data.tasks.findIndex(t => t.id === id && t.chat === chatId);

        if (idx !== -1) {
            // Track completion for streak
            if (updates.status === "done" && data.tasks[idx].status !== "done") {
                data.stats.totalTasksCompleted++;
                this.updateStreak();
            }

            data.tasks[idx] = { ...data.tasks[idx], ...updates };
            this.write(data);
            return data.tasks[idx];
        }
        return null;
    }

    deleteTask(id, chatId) {
        const data = this.read();
        const task = data.tasks.find(t => t.id === id && t.chat === chatId);
        data.tasks = data.tasks.filter(t => !(t.id === id && t.chat === chatId));
        this.write(data);
        return task;
    }

    // ── Stats Operations ─────────────────────────────────────────────────────

    getStats(chatId) {
        const data = this.read();
        const userTasks = this.getUserTasks(chatId);

        const active = userTasks.filter(t => t.status === "active");
        const completed = userTasks.filter(t => t.status === "done");
        const overdue = active.filter(t => t.deadline < Date.now());
        const todayCompleted = completed.filter(t =>
            t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()
        );

        // Calculate completion rate
        const total = userTasks.length;
        const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

        // Get streak from global stats
        const globalStats = data.stats || {};

        return {
            active: active.length,
            completed: completed.length,
            overdue: overdue.length,
            todayCompleted: todayCompleted.length,
            total,
            completionRate,
            streak: globalStats.streak || 0,
            longestStreak: globalStats.longestStreak || 0,
        };
    }

    updateStreak() {
        const data = this.read();
        const lastCompleted = data.stats.lastCompletedAt;
        const now = Date.now();

        if (!lastCompleted) {
            data.stats.streak = 1;
        } else {
            const lastDate = new Date(lastCompleted).toDateString();
            const today = new Date(now).toDateString();
            const yesterday = new Date(now - 86400000).toDateString();

            if (lastDate === today) {
                // Same day, don't increment
            } else if (lastDate === yesterday) {
                data.stats.streak++;
            } else {
                data.stats.streak = 1;
            }
        }

        data.stats.lastCompletedAt = now;
        data.stats.longestStreak = Math.max(data.stats.longestStreak || 0, data.stats.streak);
        this.write(data);
    }

    // ── ID Generation ────────────────────────────────────────────────────────

    generateId() {
        const tasks = this.getAllTasks();
        if (tasks.length === 0) return 1;
        return Math.max(...tasks.map(t => t.id)) + 1;
    }

    // ── Anti-Spam ───────────────────────────────────────────────────────────

    isSpam(chatId) {
        const data = this.read();
        const user = data.users[chatId] || { lastMessage: 0 };
        const now = Date.now();

        if (now - user.lastMessage < CONFIG.COOLDOWN_MS) {
            return true;
        }

        return false;
    }

    recordActivity(chatId) {
        const data = this.read();
        if (!data.users[chatId]) {
            data.users[chatId] = { createdAt: Date.now() };
        }
        data.users[chatId].lastMessage = Date.now();
        this.write(data);
    }

    // ── Cleanup ─────────────────────────────────────────────────────────────

    cleanupOldTasks() {
        const data = this.read();
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

        // Keep completed tasks for 30 days
        data.tasks = data.tasks.filter(t =>
            t.status === "active" || t.completedAt > thirtyDaysAgo
        );

        this.write(data);
    }
}

module.exports = Database;