import { Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewTrackItem, trackItems } from '../drizzle/schema';
import { TrackItemType } from '../enums/track-item-type';
import { State } from '../enums/state';
import { COLORS } from './color.testUtils';
import { addColorToApp, setupTestDb } from './db.testUtils';
import { getTimestamp } from './time.testUtils';

vi.mock('electron');
vi.mock('electron-is-dev');
vi.mock('../utils/log-manager');

let client: Client;
let db: ReturnType<typeof drizzle>;
let fetchSpy: any;

const NOW = getTimestamp('2023-01-10T12:00:00');
const WEBHOOK_URL = 'https://auto.linktic.com/webhook/tockler/log-activity';


async function cleanupTestDb() {
    if (client) {
        await db.delete(trackItems).execute();
        await client.close();
    }
}

beforeEach(async () => {
    vi.resetModules();
    vi.resetAllMocks();
    fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    // @ts-ignore
    global.fetch = fetchSpy;
    vi.spyOn(Date, 'now').mockImplementation(() => NOW);
    ({ db, client } = await setupTestDb());
});

afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestDb();
});

describe('trackItem webhook', () => {
    it('sends webhook when inserting AppTrackItem', async () => {
        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        const item: NewTrackItem = {
            app: 'TestApp',
            title: 'Test Title',
            taskName: TrackItemType.AppTrackItem,
            beginDate: NOW,
            endDate: NOW + 1000,
        };

        await addColorToApp(item.app, COLORS.GREEN);

        const id = await insertTrackItemInternal({ ...item });

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, options] = fetchSpy.mock.calls[0];
        expect(url).toBe(WEBHOOK_URL);
        expect(options.method).toBe('POST');
        const body = JSON.parse(options.body);
        const expected = { ...item, id: Number(id), color: COLORS.GREEN } as any;
        if (expected.url === undefined) delete expected.url;
        expect(body).toStrictEqual(expected);
    });

    it('sends webhook when inserting StatusTrackItem', async () => {
        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        const item: NewTrackItem = {
            app: State.Online,
            title: 'online',
            taskName: TrackItemType.StatusTrackItem,
            beginDate: NOW,
            endDate: NOW + 1000,
        };

        const id = await insertTrackItemInternal({ ...item });

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, options] = fetchSpy.mock.calls[0];
        expect(url).toBe(WEBHOOK_URL);
        expect(options.method).toBe('POST');
        const body = JSON.parse(options.body);
        const expected = { ...item, id: Number(id), color: COLORS.ONLINE } as any;
        if (expected.url === undefined) delete expected.url;
        expect(body).toStrictEqual(expected);
    });

    it('sends webhook when inserting LogTrackItem', async () => {
        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        const item: NewTrackItem = {
            app: 'TestApp',
            title: 'Test Title',
            taskName: TrackItemType.LogTrackItem,
            beginDate: NOW,
            endDate: NOW + 1000,
        };

        await addColorToApp(item.app, COLORS.GREEN);

        const id = await insertTrackItemInternal({ ...item });

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, options] = fetchSpy.mock.calls[0];
        expect(url).toBe(WEBHOOK_URL);
        expect(options.method).toBe('POST');
        const body = JSON.parse(options.body);
        const expected = { ...item, id: Number(id), color: COLORS.GREEN } as any;
        if (expected.url === undefined) delete expected.url;
        expect(body).toStrictEqual(expected);
    });

    it('sends webhook for each split item across midnight', async () => {
        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        const beforeMidnight = getTimestamp('2023-01-09T23:59:00');
        const afterMidnight = getTimestamp('2023-01-10T00:01:00');

        const item: NewTrackItem = {
            app: 'TestApp',
            title: 'Test Title',
            taskName: TrackItemType.AppTrackItem,
            beginDate: beforeMidnight,
            endDate: afterMidnight,
        };

        await addColorToApp(item.app, COLORS.GREEN);

        await insertTrackItemInternal({ ...item });

        const { splitTrackItemAtMidnight } = await import('../drizzle/worker/queries/trackItem.db.util');
        const splits = splitTrackItemAtMidnight({ ...item, color: COLORS.GREEN });

        expect(fetchSpy).toHaveBeenCalledTimes(splits.length);

        splits.forEach((split, idx) => {
            const [url, options] = fetchSpy.mock.calls[idx];
            expect(url).toBe(WEBHOOK_URL);
            expect(options.method).toBe('POST');
            const body = JSON.parse(options.body);
            const expected = { ...split, id: idx + 1 } as any;
            if (expected.url === undefined) delete expected.url;
            expect(body).toStrictEqual(expected);
        });
    });
});
