import { RequestStatsModel } from '../../models/requestStats';

function createMockCollection() {
  return {
    createIndex: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };
}

function createMockDb(collection: any) {
  return { collection: jest.fn().mockReturnValue(collection) } as any;
}

describe('RequestStatsModel', () => {
  let mockColl: ReturnType<typeof createMockCollection>;
  let model: RequestStatsModel;

  beforeEach(() => {
    mockColl = createMockCollection();
    model = new RequestStatsModel(createMockDb(mockColl));
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ensureIndexes', () => {
    it('should create TTL index', async () => {
      await model.ensureIndexes();
      expect(mockColl.createIndex).toHaveBeenCalledWith(
        { updatedAt: 1 },
        expect.objectContaining({ expireAfterSeconds: expect.any(Number) })
      );
    });
  });

  describe('recordSuccess', () => {
    it('should increment success count, latency, and the latency bucket', async () => {
      await model.recordSuccess(150);
      expect(mockColl.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $inc: { successCount: 1, totalLatencyMs: 150, 'latencyBuckets.250': 1 },
        }),
        { upsert: true }
      );
    });

    it('should select the correct histogram bucket by upper bound', async () => {
      const bucketOf = async (ms: number) => {
        mockColl.updateOne.mockClear();
        await model.recordSuccess(ms);
        const inc = mockColl.updateOne.mock.calls[0][1].$inc;
        return Object.keys(inc).find(k => k.startsWith('latencyBuckets.'))!.split('.')[1];
      };
      expect(await bucketOf(250)).toBe('250');   // boundary is inclusive
      expect(await bucketOf(251)).toBe('500');
      expect(await bucketOf(2000)).toBe('2000');
      expect(await bucketOf(7500)).toBe('10000');
      expect(await bucketOf(99999)).toBe('inf');
    });
  });

  describe('recordFailure', () => {
    it('should increment failure count and category counter', async () => {
      await model.recordFailure('timeout');
      expect(mockColl.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $inc: expect.objectContaining({
            failureCount: 1,
            'errorCountByCategory.timeout': 1,
          }),
        }),
        { upsert: true }
      );
    });
  });

  describe('getStats24h', () => {
    it('should return zeros when no data exists', async () => {
      mockColl.findOne.mockResolvedValue(null);
      const stats = await model.getStats24h();
      expect(stats).toEqual({
        successCount: 0,
        failureCount: 0,
        avgLatencyMs: 0,
        errorCountByCategory: {},
        latencyBuckets: {},
      });
    });

    it('should calculate average latency correctly', async () => {
      mockColl.findOne.mockResolvedValue({
        successCount: 10,
        failureCount: 2,
        totalLatencyMs: 1500,
        errorCountByCategory: { timeout: 1, auth: 1 },
      });
      const stats = await model.getStats24h();
      expect(stats.successCount).toBe(10);
      expect(stats.failureCount).toBe(2);
      expect(stats.avgLatencyMs).toBe(150);
      expect(stats.errorCountByCategory).toEqual({ timeout: 1, auth: 1 });
    });
  });
});
