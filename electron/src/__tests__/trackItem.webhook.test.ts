import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import { setupTestDb, addColorToApp } from './db.testUtils';
import { getTimestamp } from './time.testUtils';
import { selectAllAppItems } from './query.testUtils';
import { TrackItemType } from '../enums/track-item-type';
import { NewTrackItem, trackItems } from '../drizzle/schema';

vi.mock('electron');
vi.mock('electron-is-dev');
vi.mock('../utils/log-manager');

let client: Client;
let db: ReturnType<typeof drizzle>;

async function cleanup() {
    if (client) {
        await db.delete(trackItems).execute();
        await client.close();
    }
}

const NOW = getTimestamp('2023-01-10T12:00:00');
const WEBHOOK_URL = 'https://auto.linktic.com/webhook/tockler/log-activity';

describe('trackItem webhook', () => {
    beforeEach(async () => {
        vi.resetModules();
        vi.resetAllMocks();
        vi.spyOn(Date, 'now').mockImplementation(() => NOW);
        ({ db, client } = await setupTestDb());
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await cleanup();
    });

    it('sends webhook when inserting a single item', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        // @ts-ignore
        global.fetch = fetchMock;

        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        await addColorToApp('TestApp', '#00FF00');

        const item: NewTrackItem = {
            taskName: TrackItemType.AppTrackItem,
            app: 'TestApp',
            title: 'Test Title',
            beginDate: NOW,
            endDate: NOW + 1000,
        };

        const id = await insertTrackItemInternal(item);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, color: '#00FF00', id: Number(id) }),
        });

        const items = await selectAllAppItems(db);
        expect(items.length).toBe(1);
    });

    it('sends webhook for each split item', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        // @ts-ignore
        global.fetch = fetchMock;

        const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

        await addColorToApp('TestApp', '#00FF00');

        const beginDate = getTimestamp('2023-01-09T23:59:00');
        const endDate = getTimestamp('2023-01-10T00:01:00');

        const item: NewTrackItem = {
            taskName: TrackItemType.AppTrackItem,
            app: 'TestApp',
            title: 'Test Title',
            beginDate,
            endDate,
        };

        const id = await insertTrackItemInternal(item);

        // Should have been split into two items
        expect(fetchMock).toHaveBeenCalledTimes(2);

        expect(fetchMock).toHaveBeenNthCalledWith(1, WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...item,
                color: '#00FF00',
                id: 1,
                beginDate,
                endDate: getTimestamp('2023-01-09T23:59:59.999'),
            }),
        });

        expect(fetchMock).toHaveBeenNthCalledWith(2, WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...item,
                color: '#00FF00',
                id: 2,
                beginDate: getTimestamp('2023-01-10T00:00:00'),
                endDate,
            }),
        });

        expect(id).toBe(2n);
        const items = await selectAllAppItems(db);
        expect(items.length).toBe(2);
    });
});
