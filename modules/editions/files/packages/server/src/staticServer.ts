import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveWeb } from './web.ts';

/**
 * The app edition (window only): no library, no database, no downloads. The window still needs the web client from a real address (service
 * workers, IndexedDB and Media Session want one), so this serves just the built files on 127.0.0.1. The library lives on a server the user
 * connects in Settings > Server; until then the app keeps its own working copy in the window and says "Local only".
 */
export function startStaticServer(webDir: string, port: number): Promise<{ port: number; close(): Promise<void> }> {
  const app = new Hono();
  serveWeb(app, webDir);
  return new Promise((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, (info) => {
      resolve({ port: info.port, close: () => new Promise<void>((done) => { server.close(() => done()); (server as unknown as { closeAllConnections?: () => void }).closeAllConnections?.(); }) });
    });
    server.on('error', reject);
  });
}
