import { Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackItems, NewTrackItem } from '../drizzle/schema';
import { TrackItemType } from '../enums/track-item-type';
import { setupTestDb } from './db.testUtils';
import { getTimestamp } from './time.testUtils';

vi.mock('electron');
vi.mock('electron-is-dev');
vi.mock('../utils/log-manager');

let client: Client;
let db: ReturnType<typeof drizzle>;
let fetchSpy: ReturnType<typeof vi.fn>;

async function cleanup() {
    if (client) {
        await db.delete(trackItems).execute();
        await client.close();
    }
}

beforeEach(async () => {
    vi.resetModules();
    vi.resetAllMocks();
    ({ db, client } = await setupTestDb());

    fetchSpy = vi.fn().mockResolvedValue({ ok: true } as Response);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = fetchSpy;
});

afterEach(async () => {
    await cleanup();
});

describe('track item webhook', () => {
    it('sends webhook for each saved item', async () => {
        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        const item: NewTrackItem = {
            app: 'TestApp',
            title: 'Test',
            taskName: TrackItemType.AppTrackItem,
            beginDate: getTimestamp('2023-01-10T10:00:00'),
            endDate: getTimestamp('2023-01-10T10:01:00'),
        };

        await insertTrackItemInternal({ ...item });

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, options] = fetchSpy.mock.calls[0];
        expect(url).toBe('https://auto.linktic.com/webhook/tockler/log-activity');
        expect(options).toMatchObject({ method: 'POST' });
        const payload = JSON.parse(options.body);
        expect(payload.app).toBe(item.app);
        expect(payload.taskName).toBe(item.taskName);
    });

    it('sends multiple webhooks when item spans midnight', async () => {
        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        const begin = getTimestamp('2023-01-09T23:59:00');
        const end = getTimestamp('2023-01-10T00:01:00');
        const item: NewTrackItem = {
            app: 'TestApp',
            title: 'Test',
            taskName: TrackItemType.AppTrackItem,
            beginDate: begin,
            endDate: end,
        };

        await insertTrackItemInternal({ ...item });

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        const firstPayload = JSON.parse(fetchSpy.mock.calls[0][1].body);
        const secondPayload = JSON.parse(fetchSpy.mock.calls[1][1].body);
        expect(firstPayload.beginDate).toBe(begin);
        expect(secondPayload.endDate).toBe(end);
    });

    it('works with StatusTrackItem and LogTrackItem', async () => {
        const { insertTrackItemInternal, insertNewLogTrackItem } = await import('../drizzle/worker/queries/trackItem.db');

        const statusItem: NewTrackItem = {
            app: 'ONLINE',
            title: 'online',
            taskName: TrackItemType.StatusTrackItem,
            beginDate: getTimestamp('2023-01-10T10:00:00'),
            endDate: getTimestamp('2023-01-10T10:05:00'),
        };

        await insertTrackItemInternal({ ...statusItem });
        const logItem: NewTrackItem = {
            app: 'TestApp',
            title: 'Log',
            taskName: TrackItemType.LogTrackItem,
            beginDate: getTimestamp('2023-01-10T11:00:00'),
            endDate: getTimestamp('2023-01-10T11:01:00'),
        };
        await insertNewLogTrackItem({ ...logItem });

        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
});
