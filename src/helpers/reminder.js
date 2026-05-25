/**
 * TaskFlow Bot - Reminder Manager
 * Handles all reminder scheduling and notifications
 */

const CONFIG = require("../config");

class ReminderManager {
    constructor(bot) {
        this.bot = bot;
        this.interval = null;
        this.isRunning = false;
        this.pendingReminders = new Map(); // taskId -> scheduled time
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        console.log("⏰ Reminder manager started");

        this.interval = setInterval(() => {
            this.checkReminders();
        }, CONFIG.REMINDER_INTERVAL);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log("⏰ Reminder manager stopped");
    }

    scheduleReminder(task) {
        // Schedule 15 min reminder
        const time15 = task.deadline - CONFIG.DEADLINE_15_MIN - Date.now();
        if (time15 > 0) {
            this.scheduleOnce(task.id, "15min", time15);
        }

        // Schedule 1 hour reminder
        const time1h = task.deadline - CONFIG.DEADLINE_1_HOUR - Date.now();
        if (time1h > 0) {
            this.scheduleOnce(task.id, "1hour", time1h);
        }

        // Schedule routine reminder
        this.scheduleRoutineReminder(task);
    }

    scheduleOnce(taskId, type, delay) {
        const key = `${taskId}_${type}`;
        this.pendingReminders.set(key, Date.now() + delay);

        setTimeout(() => {
            this.pendingReminders.delete(key);
            this.executeReminder(taskId, type);
        }, delay);
    }

    scheduleRoutineReminder(task) {
        // Will be handled by interval check
    }

    cancelReminders(taskId) {
        // Remove all pending reminders for this task
        for (const key of this.pendingReminders.keys()) {
            if (key.startsWith(`${taskId}_`)) {
                this.pendingReminders.delete(key);
            }
        }
    }

    async checkReminders() {
        try {
            const db = this.bot.db;
            const tasks = db.getAllTasks();
            const now = Date.now();

            for (const task of tasks) {
                if (task.status !== "active") continue;

                const kirim = async (text) => {
                    try {
                        await this.bot.sendResponse(task.chat, text);
                    } catch {}
                };

                const sendReminder = (messageFn) => {
                    kirim(messageFn(task));
                    // Mark as sent by updating in DB
                    db.updateTask(task.id, task.chat, { [messageFn.name.replace("MessageUI.", "") + "Sent"]: true });
                };

                // Check 15 min reminder
                const timeUntil15 = task.deadline - CONFIG.DEADLINE_15_MIN;
                if (!task.fifteenSent && timeUntil15 <= now && task.deadline > now) {
                    const MessageUI = require("./ui");
                    await kirim(MessageUI.reminder15Min(task));
                    db.updateTask(task.id, task.chat, { fifteenSent: true });
                }

                // Check 1 hour reminder
                const timeUntil1h = task.deadline - CONFIG.DEADLINE_1_HOUR;
                if (!task.oneHourSent && timeUntil1h <= now && task.deadline > now) {
                    const MessageUI = require("./ui");
                    await kirim(MessageUI.reminder1Hour(task));
                    db.updateTask(task.id, task.chat, { oneHourSent: true });
                }

                // Check routine reminder (every 5 hours)
                if (!task.nextReminder || task.nextReminder <= now) {
                    if (task.deadline > now) {
                        const MessageUI = require("./ui");
                        await kirim(MessageUI.reminderRoutine(task));
                        db.updateTask(task.id, task.chat, {
                            nextReminder: now + CONFIG.REMINDER_ROUTIN
                        });
                    }
                }

                // Check overdue
                if (!task.deadlineSent && task.deadline <= now) {
                    const MessageUI = require("./ui");
                    await kirim(MessageUI.reminderOverdue(task));
                    db.updateTask(task.id, task.chat, { deadlineSent: true });
                }
            }
        } catch (err) {
            console.error("⚠️ Reminder check error:", err.message);
        }
    }

    async executeReminder(taskId, type) {
        const db = this.bot.db;
        const tasks = db.getAllTasks();
        const task = tasks.find(t => t.id === taskId);

        if (!task || task.status !== "active") return;

        const MessageUI = require("./ui");
        let message;

        switch (type) {
            case "15min":
                message = MessageUI.reminder15Min(task);
                db.updateTask(taskId, task.chat, { fifteenSent: true });
                break;
            case "1hour":
                message = MessageUI.reminder1Hour(task);
                db.updateTask(taskId, task.chat, { oneHourSent: true });
                break;
            default:
                return;
        }

        try {
            await this.bot.sendResponse(task.chat, message);
        } catch (err) {
            console.error("⚠️ Failed to send reminder:", err.message);
        }
    }
}

module.exports = ReminderManager;