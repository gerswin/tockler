import { defineConfig } from 'drizzle-kit';
import path from 'path';

export default defineConfig({
    schema: './src/drizzle/schema.ts',
    out: './src/drizzle/migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: path.resolve(process.cwd(), 'tockler.db'),
    },
});
