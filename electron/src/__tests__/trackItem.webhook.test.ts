import { Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { TrackItemType } from '../enums/track-item-type';
import { addColorToApp, setupTestDb } from './db.testUtils';
import { COLORS } from './color.testUtils';
import { getTimestamp } from './time.testUtils';

// Mock modules used by trackItem.db
vi.mock('electron');
vi.mock('electron-is-dev');
vi.mock('../utils/log-manager');

let db: ReturnType<typeof drizzle>;
let client: Client;
let fetchMock: ReturnType<typeof vi.fn>;

const NOW = getTimestamp('2023-01-10T12:00:00');

async function cleanupTestDb() {
    if (client) {
        await db.delete((await import('../drizzle/schema')).trackItems).execute();
        await client.close();
    }
}

describe('trackItem webhook', () => {
    beforeEach(async () => {
        vi.resetModules();
        vi.resetAllMocks();
        vi.spyOn(Date, 'now').mockImplementation(() => NOW);

        fetchMock = vi.fn().mockResolvedValue({ ok: true });
        // @ts-ignore
        global.fetch = fetchMock;

        ({ db, client } = await setupTestDb());
        await addColorToApp('TestApp', COLORS.GREEN);
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await cleanupTestDb();
    });

    it('sends webhook when inserting a single item', async () => {
        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        await insertTrackItemInternal({
            taskName: TrackItemType.AppTrackItem,
            app: 'TestApp',
            title: 'Test Title',
            beginDate: NOW,
            endDate: NOW + 1000,
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, options] = fetchMock.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(url).toBe('https://auto.linktic.com/webhook/tockler/log-activity');
        expect(body).toMatchObject({
            id: 1,
            taskName: TrackItemType.AppTrackItem,
            app: 'TestApp',
            title: 'Test Title',
            color: COLORS.GREEN,
            beginDate: NOW,
            endDate: NOW + 1000,
        });
    });

    it('sends webhook for each split item', async () => {
        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        const begin = getTimestamp('2023-01-09T23:59:00');
        const end = getTimestamp('2023-01-10T00:01:00');

        await insertTrackItemInternal({
            taskName: TrackItemType.AppTrackItem,
            app: 'TestApp',
            title: 'Test Title',
            beginDate: begin,
            endDate: end,
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        const body1 = JSON.parse(fetchMock.mock.calls[0][1].body);
        const body2 = JSON.parse(fetchMock.mock.calls[1][1].body);
        expect(body1.beginDate).toBe(begin);
        expect(body1.endDate).toBe(getTimestamp('2023-01-09T23:59:59.999'));
        expect(body2.beginDate).toBe(getTimestamp('2023-01-10T00:00:00'));
        expect(body2.endDate).toBe(end);
    });
});
