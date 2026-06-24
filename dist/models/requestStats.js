"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestStatsModel = void 0;
const TTL_DAYS = 90;
// Histogram upper bounds (ms) for latency. Bucket counts are summable across
// instances/days, so the dashboard can merge them and interpolate p50/p95/p99 —
// percentiles themselves are not averageable, raw buckets are.
const LATENCY_BUCKETS_MS = [250, 500, 1000, 2000, 5000, 10000, 20000, 30000, 60000];
function latencyBucketKey(latencyMs) {
    for (const bound of LATENCY_BUCKETS_MS) {
        if (latencyMs <= bound)
            return String(bound);
    }
    return 'inf';
}
class RequestStatsModel {
    constructor(db) {
        this.collection = db.collection('ai_request_daily_stats');
    }
    async ensureIndexes() {
        await this.collection.createIndex({ updatedAt: 1 }, { expireAfterSeconds: TTL_DAYS * 24 * 60 * 60, name: 'idx_ttl_updatedAt' });
        console.log('[RequestStatsModel] Indexes created successfully');
    }
    static getDateKey() {
        return new Date().toISOString().slice(0, 10);
    }
    async recordSuccess(latencyMs) {
        const dateKey = RequestStatsModel.getDateKey();
        await this.collection.updateOne(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { _id: dateKey }, {
            $inc: {
                successCount: 1,
                totalLatencyMs: latencyMs,
                [`latencyBuckets.${latencyBucketKey(latencyMs)}`]: 1,
            },
            $set: { updatedAt: new Date() },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, { upsert: true });
    }
    async recordFailure(category) {
        const dateKey = RequestStatsModel.getDateKey();
        await this.collection.updateOne(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { _id: dateKey }, {
            $inc: {
                failureCount: 1,
                [`errorCountByCategory.${category}`]: 1,
            },
            $set: { updatedAt: new Date() },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, { upsert: true });
    }
    async getStats24h() {
        const today = RequestStatsModel.getDateKey();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = await this.collection.findOne({ _id: today });
        if (!doc) {
            return { successCount: 0, failureCount: 0, avgLatencyMs: 0, errorCountByCategory: {}, latencyBuckets: {} };
        }
        const avgLatencyMs = doc.successCount > 0
            ? Math.round(doc.totalLatencyMs / doc.successCount)
            : 0;
        return {
            successCount: doc.successCount || 0,
            failureCount: doc.failureCount || 0,
            avgLatencyMs,
            errorCountByCategory: doc.errorCountByCategory || {},
            latencyBuckets: doc.latencyBuckets || {},
        };
    }
}
exports.RequestStatsModel = RequestStatsModel;
//# sourceMappingURL=requestStats.js.map