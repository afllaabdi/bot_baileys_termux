/**
 * TaskFlow Bot - Smart Input Parser
 * Parses natural language input into structured task data
 *
 * Examples:
 *   +AI besok jam 8         → { title: "AI", deadline: tomorrow 8am, ... }
 *   +laporan 2h              → { title: "laporan", deadline: 2 hours, ... }
 *   +meeting malam ini       → { title: "meeting", deadline: tonight, ... }
 *   +tugas kuliah senin      → { title: "tugas kuliah", deadline: monday, ... }
 *   +UI figma 3 hari        → { title: "UI figma", deadline: 3 days, ... }
 */

const CONFIG = require("../config");

class SmartParser {
    constructor() {
        this.categoryKeywords = CONFIG.CATEGORIES;
        this.priorityKeywords = CONFIG.PRIORITY_KEYWORDS;
    }

    /**
     * Main parse function - converts raw input to task data
     * @param {string} input - Raw input like "AI besok jam 8"
     * @returns {Object} Parsed result with validation
     */
    parse(input) {
        if (!input || !input.trim()) {
            return { valid: false, error: "Input kosong. Gunakan: +nama tugas deadline" };
        }

        const text = input.trim();
        const parsed = this.extractComponents(text);

        // Validate
        if (!parsed.title) {
            return { valid: false, error: "Nama tugas tidak ditemukan.\nGunakan: +nama tugas deadline" };
        }

        if (!parsed.deadline) {
            return { valid: false, error: "Deadline tidak valid.\nContoh: +laporan 2h, +AI besok jam 8" };
        }

        if (parsed.deadline < Date.now()) {
            return { valid: false, error: "Deadline sudah lewat. Gunakan waktu yang akan datang." };
        }

        return {
            valid: true,
            title: parsed.title,
            deadline: parsed.deadline,
            category: this.detectCategory(parsed.title),
            priority: this.detectPriority(parsed.title, parsed.deadline),
            raw: text
        };
    }

    /**
     * Extract title and deadline from input
     */
    extractComponents(text) {
        // Try to extract deadline patterns
        let deadline = null;
        let title = text;

        // Pattern: number + time unit (2h, 3h, 2jam, 3hari)
        const hourMatch = text.match(/(\d+)\s*(h|jam|j)\b/i);
        const dayMatch = text.match(/(\d+)\s*(d|hari|h)\b/i);
        const minMatch = text.match(/(\d+)\s*(m|menit|mn)\b/i);

        if (minMatch) {
            const mins = parseInt(minMatch[1]);
            deadline = Date.now() + mins * 60 * 1000;
            title = this.removePattern(title, minMatch[0]);
        } else if (hourMatch) {
            const hours = parseInt(hourMatch[1]);
            deadline = Date.now() + hours * 60 * 60 * 1000;
            title = this.removePattern(title, hourMatch[0]);
        } else if (dayMatch) {
            const days = parseInt(dayMatch[1]);
            deadline = Date.now() + days * 24 * 60 * 60 * 1000;
            title = this.removePattern(title, dayMatch[0]);
        }

        // Pattern: "besok" or "tomorrow"
        if (!deadline && /\b(besok|tomorrow)\b/i.test(text)) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(23, 59, 0, 0);

            // Try to extract time: "besok jam 8"
            const timeMatch = text.match(/jam\s*(\d{1,2})(?::(\d{2}))?/i);
            if (timeMatch) {
                tomorrow.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2] || "0"), 0, 0);
            }

            deadline = tomorrow.getTime();
            title = text.replace(/\b(besok|tomorrow)\b/gi, "").replace(/jam\s*\d{1,2}(?::\d{2})?/gi, "").trim();
        }

        // Pattern: specific days (senin, selasa, rabu, etc.)
        if (!deadline) {
            const dayMap = {
                "senin": 1, "monday": 1,
                "selasa": 2, "tuesday": 2,
                "rabu": 3, "wednesday": 3,
                "kamis": 4, "thursday": 4,
                "jumat": 5, "friday": 5,
                "sabtu": 6, "saturday": 6,
                "minggu": 0, "sunday": 0
            };

            for (const [dayName, dayIndex] of Object.entries(dayMap)) {
                if (text.toLowerCase().includes(dayName)) {
                    const targetDate = this.getNextDayOfWeek(dayIndex);
                    const timeMatch = text.match(/jam\s*(\d{1,2})(?::(\d{2}))?/i);

                    if (timeMatch) {
                        targetDate.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2] || "0"), 0, 0);
                    } else {
                        targetDate.setHours(23, 59, 0, 0);
                    }

                    deadline = targetDate.getTime();
                    title = text.replace(new RegExp(dayName, "gi"), "").replace(/jam\s*\d{1,2}(?::\d{2})?/gi, "").trim();
                    break;
                }
            }
        }

        // Pattern: "malam ini" (tonight)
        if (!deadline && /\b(malam ini|tonight|mlm ini)\b/i.test(text)) {
            const tonight = new Date();
            tonight.setHours(23, 59, 0, 0);
            deadline = tonight.getTime();
            title = text.replace(/\b(malam ini|tonight|mlm ini)\b/gi, "").trim();
        }

        // Pattern: "pagi ini" (this morning)
        if (!deadline && /\b(pagi ini|this morning|pg ini)\b/i.test(text)) {
            const morning = new Date();
            morning.setHours(12, 0, 0, 0);
            if (morning.getTime() < Date.now()) {
                morning.setDate(morning.getDate() + 1);
            }
            deadline = morning.getTime();
            title = text.replace(/\b(pagi ini|this morning|pg ini)\b/gi, "").trim();
        }

        // Pattern: "lusa" (day after tomorrow)
        if (!deadline && /\b(lusa)\b/i.test(text)) {
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 2);
            dayAfter.setHours(23, 59, 0, 0);
            deadline = dayAfter.getTime();
            title = text.replace(/\b(lusa)\b/gi, "").trim();
        }

        // Pattern: direct time like "jam 8" or "8 PM" (today or tomorrow)
        if (!deadline) {
            const directTimeMatch = text.match(/(?:jam\s*)?(\d{1,2})(?::(\d{2}))?\s*(pagi|siang|sore|malam|am|pm)?/i);
            if (directTimeMatch) {
                const hour = parseInt(directTimeMatch[1]);
                const minute = parseInt(directTimeMatch[2] || "0");
                const period = directTimeMatch[3]?.toLowerCase();

                const target = new Date();
                target.setHours(hour, minute, 0, 0);

                // Adjust based on period
                if (period === "pagi" || (period === "am" && hour < 12)) {
                    target.setHours(hour < 12 ? hour : hour - 12, minute, 0, 0);
                } else if (period === "siang" || (period === "pm" && hour < 12)) {
                    target.setHours(hour < 12 ? hour + 12 : hour, minute, 0, 0);
                } else if (period === "sore" || period === "malam") {
                    target.setHours(hour < 12 ? hour + 12 : hour, minute, 0, 0);
                } else if (period === "pm" || period === "pagi") {
                    target.setHours(hour < 12 ? hour + 12 : hour, minute, 0, 0);
                }

                // If time already passed, assume tomorrow
                if (target.getTime() < Date.now()) {
                    target.setDate(target.getDate() + 1);
                }

                deadline = target.getTime();
                title = text.replace(/jam\s*\d{1,2}(?::\d{2})?\s*(pagi|siang|sore|malam|am|pm)?/gi, "").trim();
            }
        }

        // Pattern: date like "25 Mei" or "5/25"
        if (!deadline) {
            const dateMatch = text.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Oct|Nov|Dec|jan|feb|mar|apr|mei|jun|jul|agu|sep|oct|nov|dec)/i);
            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5, jul: 6, agu: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
                const month = monthMatch[dateMatch[2].toLowerCase().slice(0, 3)] ?? 0;

                const target = new Date();
                target.setMonth(month, day);

                if (target.getTime() < Date.now()) {
                    target.setFullYear(target.getFullYear() + 1);
                }

                target.setHours(23, 59, 0, 0);
                deadline = target.getTime();
                title = text.replace(dateMatch[0], "").trim();
            }
        }

        // Fallback: no time specified, default to 24 hours from now
        if (!deadline) {
            deadline = Date.now() + 24 * 60 * 60 * 1000;
        }

        // Clean up title
        title = this.cleanTitle(title);

        return {
            title: title || "Tugas Baru",
            deadline
        };
    }

    /**
     * Remove time pattern from title
     */
    removePattern(text, pattern) {
        return text.replace(new RegExp(this.escapeRegex(pattern), "gi"), "").trim();
    }

    /**
     * Clean up title - remove extra spaces, special chars
     */
    cleanTitle(title) {
        return title
            .replace(/\s+/g, " ")
            .replace(/^[\s.,\-_]+|[\s.,\-_]+$/g, "")
            .replace(/[|]/g, "")
            .trim();
    }

    /**
     * Escape special regex characters
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    /**
     * Get next occurrence of a day of week
     */
    getNextDayOfWeek(targetDay) {
        const today = new Date();
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;

        if (daysUntil <= 0) {
            daysUntil += 7;
        }

        const result = new Date(today);
        result.setDate(today.getDate() + daysUntil);
        return result;
    }

    /**
     * Auto-detect category based on title keywords
     */
    detectCategory(title) {
        const lowerTitle = title.toLowerCase();

        for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
            for (const keyword of keywords) {
                if (lowerTitle.includes(keyword)) {
                    return category;
                }
            }
        }

        return "other";
    }

    /**
     * Auto-detect priority based on title and deadline
     */
    detectPriority(title, deadline) {
        const lowerTitle = title.toLowerCase();

        // Check keywords
        for (const [priority, keywords] of Object.entries(this.priorityKeywords)) {
            for (const keyword of keywords) {
                if (lowerTitle.includes(keyword)) {
                    return priority;
                }
            }
        }

        // Check urgency based on deadline
        const hoursUntil = (deadline - Date.now()) / (1000 * 60 * 60);
        if (hoursUntil <= 2) return "high";
        if (hoursUntil <= 24) return "normal";
        return "low";
    }

    /**
     * Format relative time for display
     */
    formatRelativeTime(deadline) {
        const diff = deadline - Date.now();
        if (diff < 0) return "terlambat";

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) {
            return `${minutes}m`;
        }
        if (hours < 24) {
            return `${hours}j ${minutes % 60}m`;
        }
        if (days < 7) {
            return `${days}h`;
        }
        return `${days}d`;
    }
}

module.exports = SmartParser;