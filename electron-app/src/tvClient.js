const WebSocket = require('ws');
const http = require('http');
const https = require('https');

function b64(str) {
    return Buffer.from(String(str), 'utf8').toString('base64');
}

class SamsungRemote {
    constructor({ ip, appName = 'Electron Remote', secure = false, token = null }) {
        this.ip = ip;
        this.appName = appName;
        this.secure = !!secure;
        this.token = token || null;
        this.ws = null;
        this._connected = false;
        this._connectPromise = null;
    }

    isConnected() {
        return this._connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    _buildUrl() {
        const nameParam = `name=${encodeURIComponent(b64(this.appName))}`;
        if (this.secure) {
            const tokenParam = this.token ? `&token=${encodeURIComponent(this.token)}` : '';
            return `wss://${this.ip}:8002/api/v2/channels/samsung.remote.control?${nameParam}${tokenParam}`;
        }
        return `ws://${this.ip}:8001/api/v2/channels/samsung.remote.control?${nameParam}`;
    }

    connect() {
        if (this.isConnected()) {
            return Promise.resolve({ token: this.token || null });
        }
        if (this._connectPromise) return this._connectPromise;

        const url = this._buildUrl();
        const opts = this.secure ? { rejectUnauthorized: false, handshakeTimeout: 7000 } : { handshakeTimeout: 7000 };

        this._connectPromise = new Promise((resolve, reject) => {
            const ws = new WebSocket(url, opts);
            this.ws = ws;

            const onError = (err) => {
                this._connected = false;
                cleanup();
                reject(err);
            };

            const onOpen = () => {
                this._connected = true;
                // Connection is open. Token might be provided in a subsequent message.
            };

            const onMessage = (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    // On secure port, after approval, TV can send token in an ms.channel.connect event.
                    if (msg.event === 'ms.channel.connect' && msg.data && msg.data.token) {
                        this.token = msg.data.token;
                        // We can resolve here with the token if still pending
                        if (this._connectPromise) {
                            const p = this._connectPromise;
                            this._connectPromise = null;
                            resolve({ token: this.token });
                        }
                    }
                } catch (_) {
                    // Ignore parse errors
                }
            };

            const onClose = () => {
                this._connected = false;
                cleanup();
            };

            const cleanup = () => {
                if (!ws) return;
                if (typeof ws.off === 'function') {
                    ws.off('open', onOpen);
                    ws.off('message', onMessage);
                    ws.off('error', onError);
                    ws.off('close', onClose);
                } else if (typeof ws.removeListener === 'function') {
                    ws.removeListener('open', onOpen);
                    ws.removeListener('message', onMessage);
                    ws.removeListener('error', onError);
                    ws.removeListener('close', onClose);
                }
            };

            ws.on('open', onOpen);
            ws.on('message', onMessage);
            ws.on('error', onError);
            ws.on('close', onClose);

            // Give it a little time to emit token; if none and we’re open, resolve anyway
            const fallbackResolveTimeout = setTimeout(() => {
                if (this.isConnected()) {
                    const p = this._connectPromise;
                    this._connectPromise = null;
                    resolve({ token: this.token || null });
                }
            }, 1200);

            // Ensure timeout cleared once promise settles
            const originalResolve = resolve;
            resolve = (val) => {
                clearTimeout(fallbackResolveTimeout);
                originalResolve(val);
            };
            const originalReject = reject;
            reject = (err) => {
                clearTimeout(fallbackResolveTimeout);
                originalReject(err);
            };
        });

        return this._connectPromise;
    }

    disconnect() {
        try {
            if (this.ws) {
                this.ws.close();
            }
        } catch (_) {}
        this._connected = false;
        this.ws = null;
        this._connectPromise = null;
    }

    _send(payload) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected()) return reject(new Error('Socket not connected'));
            try {
                this.ws.send(JSON.stringify(payload), (err) => (err ? reject(err) : resolve()));
            } catch (e) {
                reject(e);
            }
        });
    }

    // Remote key press (e.g., KEY_VOLUP, KEY_HOME, KEY_POWER, KEY_1)
    sendKey(key) {
        const payload = {
            method: 'ms.remote.control',
            params: {
                Cmd: 'Click',
                DataOfCmd: key,
                Option: 'false',
                TypeOfRemote: 'SendRemoteKey'
            }
        };
        return this._send(payload);
    }

    // Basic text input for on-screen fields. Not all contexts on all TVs accept this.
    sendText(text) {
        const payload = {
            method: 'ms.remote.control',
            params: {
                Cmd: 'Type',
                DataOfCmd: String(text),
                Option: 'false',
                TypeOfRemote: 'SendInputString'
            }
        };
        return this._send(payload);
    }

    // Query installed apps via REST helper available through TV HTTP API (only on newer models)
    async listApps() {
        // Many TVs expose app list at ws API as well via remote.register/information calls,
        // but a common approach is to call app list REST on 8001/8002. We'll try via WebSocket first.
        return new Promise((resolve, reject) => {
            if (!this.isConnected()) return reject(new Error('Socket not connected'));
            const requestId = `apps_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const payload = {
                method: 'ms.channel.emit',
                params: {
                    event: 'ed.installedApp.get',
                    to: 'host',
                    data: { id: requestId }
                }
            };

            let timeout = null;
            const onMessage = (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.event === 'ed.installedApp.get' && msg.data && msg.data.data) {
                        cleanup();
                        const appsRaw = msg.data.data || [];
                        const apps = appsRaw.map((a) => ({
                            id: a.appId || a.id,
                            appId: a.appId || a.id,
                            name: a.name || a.appName || a.title || 'Unknown'
                        }));
                        resolve(apps);
                    }
                } catch (_) {
                    // ignore
                }
            };
            const cleanup = () => {
                clearTimeout(timeout);
                if (this.ws) {
                    if (typeof this.ws.off === 'function') {
                        this.ws.off('message', onMessage);
                    } else if (typeof this.ws.removeListener === 'function') {
                        this.ws.removeListener('message', onMessage);
                    }
                }
            };
            this.ws.on('message', onMessage);
            this._send(payload).catch((e) => {
                cleanup();
                reject(e);
            });
            timeout = setTimeout(() => {
                cleanup();
                reject(new Error('App list timed out'));
            }, 4000);
        });
    }

    // Launch app by id
    async launchApp(appId) {
        if (!appId) throw new Error('appId required');
        const payload = {
            method: 'ms.channel.emit',
            params: {
                to: 'host',
                event: 'ed.apps.launch',
                data: { appId: String(appId) }
            }
        };
        try {
            return await this._send(payload);
        } catch (e) {
            // Fallback to REST API when WebSocket launch fails or is unsupported
            return launchAppRest(this.ip, String(appId), this.secure);
        }
    }
}

function launchAppRest(ip, appId, secure = false) {
    return new Promise((resolve, reject) => {
        if (!ip) return reject(new Error('ip required'));
        if (!appId) return reject(new Error('appId required'));
        const isHttps = !!secure;
        const port = isHttps ? 8002 : 8001;
        const options = {
            hostname: ip,
            port,
            path: `/api/v2/applications/${encodeURIComponent(String(appId))}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            rejectUnauthorized: false
        };
        const mod = isHttps ? https : http;
        const req = mod.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    const msg = body || `HTTP ${res.statusCode}`;
                    reject(new Error(`REST launch failed: ${msg}`));
                }
            });
        });
        req.on('error', reject);
        try {
            req.write(JSON.stringify({ action: 'LAUNCH' }));
        } catch (e) {}
        req.end();
    });
}

module.exports = { SamsungRemote, launchAppRest };