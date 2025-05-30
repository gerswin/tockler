import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { setupTestDb, addColorToApp } from './db.testUtils';
import { selectAllAppItems } from './query.testUtils';
import { getTimestamp } from './time.testUtils';
import { TrackItemType } from '../enums/track-item-type';

let client: Client;
let db: ReturnType<typeof drizzle>;
const NOW = getTimestamp('2023-01-10T10:00:00');

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.spyOn(Date, 'now').mockImplementation(() => NOW);
  ({ db, client } = await setupTestDb());
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (client) {
    await client.close();
  }
});

describe('track item webhook', () => {
  it('sends webhook when inserting a single item', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch as unknown as typeof fetch;

    const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

    await addColorToApp('TestApp', '#00FF00');
    const item = {
      taskName: TrackItemType.AppTrackItem,
      app: 'TestApp',
      title: 'Test Title',
      beginDate: NOW,
      endDate: NOW + 1000,
    };
    await insertTrackItemInternal(item);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://auto.linktic.com/webhook/tockler/log-activity');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body as string);
    expect(body.app).toBe('TestApp');
    expect(body.beginDate).toBe(item.beginDate);
    const items = await selectAllAppItems(db);
    expect(items.length).toBe(1);
  });

  it('sends webhook for each split item', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch as unknown as typeof fetch;

    const { insertTrackItemInternal } = await import('../drizzle/worker/queries/trackItem.db');

    await addColorToApp('TestApp', '#00FF00');
    const begin = getTimestamp('2023-01-10T23:59:00');
    const end = getTimestamp('2023-01-11T00:01:00');

    const item = {
      taskName: TrackItemType.AppTrackItem,
      app: 'TestApp',
      title: 'Test Title',
      beginDate: begin,
      endDate: end,
    };

    await insertTrackItemInternal(item);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
