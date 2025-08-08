const isElectronRuntime = Boolean(process.versions && process.versions.electron);

if (isElectronRuntime) {
    const { app, BrowserWindow, ipcMain } = require('electron');
    const path = require('path');
    const fs = require('fs');
    const { SamsungRemote, launchAppRest } = require('./tvClient');

    let mainWindow = null;
    let remotes = new Map(); // key: ip -> SamsungRemote instance
    let tokens = {};
    let tokensFilePath = null;

    function loadTokens(filePath) {
        try {
            if (filePath && fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (e) {
            console.error('Failed to load tokens:', e);
        }
        return {};
    }

    function saveTokens(tokensObject) {
        try {
            if (!tokensFilePath) return;
            fs.writeFileSync(tokensFilePath, JSON.stringify(tokensObject, null, 2), 'utf8');
        } catch (e) {
            console.error('Failed to save tokens:', e);
        }
    }

    function createWindow() {
        // If you ever enable secure mode, some TVs have self-signed certs; Chromium requests
        // are unaffected here because we use node 'ws', but this prevents edge prompts.
        app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

        mainWindow = new BrowserWindow({
            width: 520,
            height: 820,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true
            },
            title: 'Samsung TV Remote'
        });

        mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    }

    app.whenReady().then(() => {
        tokensFilePath = path.join(app.getPath('userData'), 'tokens.json');
        tokens = loadTokens(tokensFilePath);

        createWindow();

        app.on('activate', function() {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on('window-all-closed', function() {
        if (process.platform !== 'darwin') app.quit();
    });

    // IPC handlers
    ipcMain.handle('connect', async(event, { ip, appName, secure }) => {
        try {
            // Reuse if already connected
            let remote = remotes.get(ip);
            if (remote && remote.isConnected()) {
                return { ok: true, secure, token: tokens[ip] || null };
            }

            const token = tokens[ip] || null;
            remote = new SamsungRemote({ ip, appName, secure, token });
            remotes.set(ip, remote);

            const result = await remote.connect();

            // If TV returned/updated token on secure port, persist it
            if (result.token && secure) {
                tokens[ip] = result.token;
                saveTokens(tokens);
            }

            return { ok: true, secure, token: result.token || tokens[ip] || null };
        } catch (err) {
            console.error('Connect error:', err);
            return { ok: false, error: String(err && err.message ? err.message : err) };
        }
    });

    ipcMain.handle('disconnect', async(event, { ip }) => {
        const remote = remotes.get(ip);
        if (!remote) return { ok: true };
        try {
            remote.disconnect();
            remotes.delete(ip);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: String(err) };
        }
    });

    ipcMain.handle('send-key', async(event, { ip, key }) => {
        const remote = remotes.get(ip);
        if (!remote || !remote.isConnected()) {
            return { ok: false, error: 'Not connected' };
        }
        try {
            await remote.sendKey(key);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: String(err) };
        }
    });

    ipcMain.handle('send-text', async(event, { ip, text }) => {
        const remote = remotes.get(ip);
        if (!remote || !remote.isConnected()) {
            return { ok: false, error: 'Not connected' };
        }
        try {
            await remote.sendText(text);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: String(err) };
        }
    });

    ipcMain.handle('get-token', async(event, { ip }) => {
        return { ok: true, token: tokens[ip] || null };
    });

    ipcMain.handle('set-token', async(event, { ip, token }) => {
        try {
            if (token) {
                tokens[ip] = token;
            } else {
                delete tokens[ip];
            }
            saveTokens(tokens);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: String(err) };
        }
    });

    // List installed apps (requires secure connection and supported TVs)
    ipcMain.handle('list-apps', async(event, { ip }) => {
        const remote = remotes.get(ip);
        if (!remote || !remote.isConnected()) {
            return { ok: false, error: 'Not connected' };
        }
        try {
            const apps = await remote.listApps();
            return { ok: true, apps };
        } catch (err) {
            return { ok: false, error: String(err) };
        }
    });

    // Launch app by id or fuzzy name, with fallbacks
    ipcMain.handle('launch-app', async(event, { ip, appId, appName }) => {
        const remote = remotes.get(ip);
        const isConnected = Boolean(remote && remote.isConnected());

        // Helper: try launch by appId via WS if connected, else REST
        const tryLaunchById = async(id) => {
            if (!id) throw new Error('appId required');
            if (isConnected) {
                try {
                    await remote.launchApp(id);
                    return true;
                } catch (_) {
                    // fall through to REST
                }
            }
            try {
                await launchAppRest(ip, id, remote ? remote.secure : false);
                return true;
            } catch (_) {
                return false;
            }
        };

        try {
            if (appId) {
                const ok = await tryLaunchById(String(appId));
                return ok ? { ok: true } : { ok: false, error: 'Launch failed' };
            }

            if (appName) {
                const query = appName.trim().toLowerCase();

                // First attempt: if connected, try to resolve via installed apps list
                if (isConnected) {
                    try {
                        const apps = await remote.listApps();
                        const match = apps.find(a => (a.name || '').toLowerCase().includes(query));
                        if (match) {
                            const ok = await tryLaunchById(match.appId || match.id);
                            if (ok) return { ok: true };
                        }
                    } catch (_) {
                        // ignore and fallback to known IDs
                    }
                }

                // Fallback: try known app IDs by common names
                const NAME_TO_APPIDS = {
                    'netflix': ['3201907018807', '11101200001'],
                    'youtube': ['3201907018745', '111299001912'],
                    'prime': ['3201512006785', '3201909019271', 'amazon'],
                    'prime video': ['3201512006785', '3201909019271'],
                    'amazon prime video': ['3201512006785', '3201909019271'],
                    'hotstar': ['3201708012872']
                };
                const candidates = NAME_TO_APPIDS[query] || [];
                for (const candidate of candidates) {
                    if (await tryLaunchById(String(candidate))) {
                        return { ok: true };
                    }
                }

                return { ok: false, error: 'App not found' };
            }

            return { ok: false, error: 'Missing appId or appName' };
        } catch (err) {
            return { ok: false, error: String(err) };
        }
    });
}