import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { OneBotDriver, type DriverOptions } from '../src/driver.ts';
import { connectionErrorForLog, connectionUrlForLog } from '../src/logging.ts';
import { identity, testLogger } from './helpers.ts';

const drivers: OneBotDriver[] = [];
afterEach(async () => { await Promise.all(drivers.splice(0).map((d) => d.stop())); vi.restoreAllMocks(); });

function setup(patch: Partial<DriverOptions> = {}) {
  const sockets: FakeSocket[] = [];
  const servers: FakeServer[] = [];
  class FakeSocket extends EventEmitter {
    readyState = WebSocket.OPEN;
    close = vi.fn(() => this.emit('close'));
    send = vi.fn();
    constructor(readonly url: string) { super(); sockets.push(this); }
  }
  class FakeServer extends EventEmitter {
    constructor() { super(); servers.push(this); queueMicrotask(() => this.emit('listening')); }
    close(done?: () => void) { done?.(); }
  }
  const log = testLogger();
  const driver = new OneBotDriver({
    mode: 'forward', wsUrl: 'ws://localhost:3001/onebot', wsHost: '127.0.0.1', wsPort: 0, wsPath: '/onebot',
    token: 'test credential / +', log, onEvent: vi.fn(),
    WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
    WebSocketServerImpl: FakeServer as unknown as typeof WebSocketServer,
    ...patch,
  });
  vi.spyOn(driver, 'refreshIdentity').mockResolvedValue(identity());
  drivers.push(driver);
  return { driver, log, sockets, servers, FakeSocket };
}

describe('connection log redaction', () => {
  it.each([
    ['wss://user:password@example.com/ws?access_token=secret#hidden', 'wss://example.com/ws'],
    ['/onebot?ToKeN=secret&access%5Ftoken=another', '/onebot'],
    ['ws://localhost:3001/', 'ws://localhost:3001/'],
    ['not a URL token=secret', '[invalid URL]'],
  ])('only logs the endpoint: %s', (url, expected) => expect(connectionUrlForLog(url)).toBe(expected));

  it('redacts credentials in URL and plain/encoded error text', () => {
    const message = connectionErrorForLog(new Error('failed ws://u:pass@host/ws?access_token=secret test%20secret token=another'), 'test secret');
    expect(message).not.toMatch(/secret|another|pass/);
    expect(message).toContain('ws://host/ws');
  });

  it('still authenticates forward connections, without logging credentials', async () => {
    const { driver, sockets, log } = setup();
    await driver.start();
    expect(new URL(sockets[0].url).searchParams.get('access_token')).toBe('test credential / +');
    sockets[0].emit('open');
    expect(log.info).toHaveBeenCalledWith('已正向连入 NapCat', { url: 'ws://localhost:3001/onebot' });
    expect(JSON.stringify(log.info.mock.calls)).not.toContain('credential');
    sockets[0].emit('error', new Error(`connection failed: ${sockets[0].url}`));
    expect(JSON.stringify([...log.warn.mock.calls, ...log.error.mock.calls])).not.toContain('credential');
  });

  it('rejects incorrect reverse tokens without recording the supplied token', async () => {
    const { driver, servers, FakeSocket, log } = setup({ mode: 'reverse' });
    await driver.start();
    const socket = new FakeSocket('unused');
    servers[0].emit('connection', socket, { url: '/onebot?access_token=wrong-secret', headers: {} });
    expect(socket.close).toHaveBeenCalledWith(1008, 'invalid token');
    expect(log.warn).toHaveBeenCalledWith('接入 Token 不匹配，拒绝连接', { url: '/onebot', presented: true });
    expect(JSON.stringify(log.warn.mock.calls)).not.toContain('wrong-secret');
  });

  it('accepts a valid Bearer token, taking precedence over a stale query', async () => {
    const { driver, servers, FakeSocket } = setup({ mode: 'reverse', token: 'valid-test-token' });
    await driver.start();
    const socket = new FakeSocket('unused');
    servers[0].emit('connection', socket, { url: '/onebot?token=old-test-token', headers: { authorization: 'Bearer valid-test-token' } });
    expect(socket.close).not.toHaveBeenCalled();
    expect(driver.connected).toBe(true);
  });

  it('redacts the replacement-connection path too', async () => {
    const { driver, servers, FakeSocket, log } = setup({ mode: 'reverse', token: 'fixture-secret' });
    await driver.start();
    for (let i = 0; i < 2; i++) servers[0].emit('connection', new FakeSocket('unused'), { url: '/onebot?token=fixture-secret', headers: {} });
    expect(log.warn).toHaveBeenCalledWith('新的反向连接接入，踢掉先前那条', { url: '/onebot' });
    expect(JSON.stringify(log.warn.mock.calls)).not.toContain('fixture-secret');
  });

  it('sanitizes synchronous constructor errors before propagating them to the host', async () => {
    class ThrowingSocket { constructor(url: string) { throw new Error(`invalid URL: ${url}`); } }
    const { driver } = setup({ wsUrl: 'ws://user:password@localhost/ws?token=fixture-secret', token: 'fixture-secret', WebSocketImpl: ThrowingSocket as unknown as typeof WebSocket });
    const error = await driver.start().catch(error => error as Error);
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).not.toMatch(/fixture-secret|password/);
  });

  it('sanitizes failed API replies before callers can log them', async () => {
    const { driver, sockets } = setup({ token: 'fixture-secret' });
    await driver.start();
    sockets[0].emit('open');
    const result = driver.callApi('fixture_action').catch(error => error as Error);
    const request = JSON.parse(sockets[0].send.mock.calls[0][0]);
    sockets[0].emit('message', Buffer.from(JSON.stringify({ echo: request.echo, status: 'failed', retcode: 1, message: 'rejected fixture-secret', data: { url: 'ws://host/ws?token=fixture-secret' } })));
    expect(String(await result)).not.toContain('fixture-secret');
  });

  it('never exposes an unauthenticated reverse listener to the LAN', async () => {
    const { driver, servers } = setup({ mode: 'reverse', token: '', wsHost: '0.0.0.0' });
    await expect(driver.start()).rejects.toThrow('拒绝启动');
    expect(servers).toHaveLength(0);
  });
});
