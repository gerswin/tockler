import { Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewTrackItem, trackItems } from '../drizzle/schema';
import { TrackItemType } from '../enums/track-item-type';
import { COLORS } from './color.testUtils';
import { addColorToApp, setupTestDb } from './db.testUtils';
import { selectAllAppItems } from './query.testUtils';
import { getTimestamp } from './time.testUtils';

const WEBHOOK_URL = 'https://auto.linktic.com/webhook/tockler/log-activity';

let client: Client;
let db: ReturnType<typeof drizzle>;

async function cleanupTestDb() {
    if (client) {
        await db.delete(trackItems).execute();
        await client.close();
    }
}

const NOW = getTimestamp('2023-01-10T12:00:00');

describe('send webhook when saving track items', () => {
    beforeEach(async () => {
        vi.resetModules();
        vi.resetAllMocks();

        // mock global fetch
        global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;

        vi.spyOn(Date, 'now').mockImplementation(() => NOW);

        ({ db, client } = await setupTestDb());
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await cleanupTestDb();
    });

    it('sends webhook when inserting AppTrackItem', async () => {
        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        await addColorToApp('TestApp', COLORS.GREEN);

        const item: NewTrackItem = {
            app: 'TestApp',
            title: 'test',
            taskName: TrackItemType.AppTrackItem,
            beginDate: NOW,
            endDate: NOW,
        };

        const id = await insertTrackItemInternal(item);

        expect(id).toBe(1n);
        expect(fetch).toHaveBeenCalledTimes(1);
        const call = (fetch as any).mock.calls[0];
        expect(call[0]).toBe(WEBHOOK_URL);
        const body = JSON.parse(call[1].body);
        expect(body).toStrictEqual({
            ...item,
            color: COLORS.GREEN,
            id: 1,
        });

        const items = await selectAllAppItems(db);
        expect(items.length).toBe(1);
    });

    it('sends webhook for each split item', async () => {
        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        const beginDate = getTimestamp('2023-01-09T23:59:50');
        const endDate = getTimestamp('2023-01-10T00:00:10');

        const item: NewTrackItem = {
            app: 'ONLINE',
            title: 'online',
            taskName: TrackItemType.StatusTrackItem,
            beginDate,
            endDate,
        };

        const id = await insertTrackItemInternal(item);

        expect(id).toBe(2n);
        expect(fetch).toHaveBeenCalledTimes(2);
        const firstCall = (fetch as any).mock.calls[0];
        expect(firstCall[0]).toBe(WEBHOOK_URL);
        const firstBody = JSON.parse(firstCall[1].body);
        expect(firstBody).toStrictEqual({
            ...item,
            color: COLORS.ONLINE,
            beginDate,
            endDate: getTimestamp('2023-01-09T23:59:59.999'),
            id: 1,
        });
        const secondCall = (fetch as any).mock.calls[1];
        expect(secondCall[0]).toBe(WEBHOOK_URL);
        const secondBody = JSON.parse(secondCall[1].body);
        expect(secondBody).toStrictEqual({
            ...item,
            color: COLORS.ONLINE,
            beginDate: getTimestamp('2023-01-10T00:00:00'),
            endDate,
            id: 2,
        });

        const items = await selectAllAppItems(db);
        expect(items.length).toBe(2);
    });

    it('sends webhook when inserting LogTrackItem', async () => {
        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        await addColorToApp('LogApp', COLORS.BLUE);

        const item: NewTrackItem = {
            app: 'LogApp',
            title: 'log',
            taskName: TrackItemType.LogTrackItem,
            beginDate: NOW,
            endDate: NOW,
        };

        const id = await insertTrackItemInternal(item);

        expect(id).toBe(1n);
        expect(fetch).toHaveBeenCalledTimes(1);
        const call = (fetch as any).mock.calls[0];
        expect(call[0]).toBe(WEBHOOK_URL);
        const body = JSON.parse(call[1].body);
        expect(body).toStrictEqual({
            ...item,
            color: COLORS.BLUE,
            id: 1,
        });

        const items = await selectAllAppItems(db);
        expect(items.length).toBe(1);
    });
});
