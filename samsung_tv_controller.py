# samsung_tv_web_remote.py
import json
import os
import threading
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from samsungtvws import SamsungTVWS
import socket


class SamsungTVRemote:
    def __init__(self):
        self.tv = None
        self.connected = False
        self.config_file = "tv_config.json"
        self.load_config()

    def load_config(self):
        """Load TV configuration from file"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, "r") as f:
                    config = json.load(f)
                    self.tv_ip = config.get("ip", "")
                    self.tv_name = config.get("name", "Samsung TV")
            else:
                self.tv_ip = ""
                self.tv_name = "Samsung TV"
        except Exception as e:
            print(f"Error loading config: {e}")
            self.tv_ip = ""
            self.tv_name = "Samsung TV"

    def save_config(self):
        """Save TV configuration to file"""
        try:
            config = {"ip": self.tv_ip, "name": self.tv_name}
            with open(self.config_file, "w") as f:
                json.dump(config, f)
        except Exception as e:
            print(f"Error saving config: {e}")

    def connect_to_tv(self, ip_address):
        """Connect to Samsung TV"""
        try:
            # self.tv = SamsungTVWS(host=ip_address)
            token_file = os.path.dirname(os.path.realpath(__file__)) + "/tv-token.txt"
            self.tv = SamsungTVWS(host=ip_address, port=8002, token_file=token_file)
            info = self.tv.rest_device_info()
            self.connected = True
            self.tv_ip = ip_address
            self.tv_name = info.get("name", "Samsung TV")
            self.save_config()
            return True, f"Connected to {self.tv_name}"
        except Exception as e:
            self.connected = False
            return False, f"Connection failed: {str(e)}"

    def send_key(self, key):
        """Send key command to TV"""
        if not self.connected or not self.tv:
            return False, "Not connected to TV"

        try:
            self.tv.send_key(key)
            return True, f"Sent key: {key}"
        except Exception as e:
            print(e)
            return False, f"Error sending key: {str(e)}"

    def get_apps(self):
        """Get list of installed apps"""
        if not self.connected or not self.tv:
            return []

        try:
            apps = self.tv.app_list()
            return apps
        except Exception as e:
            print(f"Error getting apps: {e}")
            return []

    def launch_app(self, app_id):
        """Launch specific app"""
        if not self.connected or not self.tv:
            return False, "Not connected to TV"

        try:
            self.tv.run_app(app_id)
            return True, f"Launched app: {app_id}"
        except Exception as e:
            return False, f"Error launching app: {str(e)}"

    def get_status(self):
        """Get current connection status"""
        return {
            "connected": self.connected,
            "tv_ip": self.tv_ip,
            "tv_name": self.tv_name,
        }


class RemoteHandler(BaseHTTPRequestHandler):
    remote = SamsungTVRemote()

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)

        if parsed_path.path == "/":
            self.serve_html()
        elif parsed_path.path == "/api/status":
            self.serve_json(self.remote.get_status())
        elif parsed_path.path == "/api/apps":
            apps = self.remote.get_apps()
            self.serve_json({"apps": apps})
        else:
            self.send_error(404)

    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length).decode("utf-8")

        try:
            data = json.loads(post_data)
        except:
            self.send_error(400)
            return

        if parsed_path.path == "/api/connect":
            ip = data.get("ip", "").strip()
            if ip:
                success, message = self.remote.connect_to_tv(ip)
                self.serve_json({"success": success, "message": message})
            else:
                self.serve_json({"success": False, "message": "IP address required"})

        elif parsed_path.path == "/api/key":
            key = data.get("key", "")
            if key:
                success, message = self.remote.send_key(key)
                self.serve_json({"success": success, "message": message})
            else:
                self.serve_json({"success": False, "message": "Key required"})

        elif parsed_path.path == "/api/launch":
            app_id = data.get("app_id", "")
            if app_id:
                success, message = self.remote.launch_app(app_id)
                self.serve_json({"success": success, "message": message})
            else:
                self.serve_json({"success": False, "message": "App ID required"})

        else:
            self.send_error(404)

    def serve_html(self):
        """Serve the main HTML page"""
        html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Samsung TV Remote</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50, #34495e);
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .status {
            padding: 15px;
            text-align: center;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .status.connected {
            background: #27ae60;
            color: white;
        }
        
        .status.disconnected {
            background: #e74c3c;
            color: white;
        }
        
        .status.connecting {
            background: #f39c12;
            color: white;
        }
        
        .connection-panel {
            padding: 20px;
            border-bottom: 1px solid #eee;
        }
        
        .input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        input[type="text"] {
            flex: 1;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
        }
        
        button {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: #3498db;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2980b9;
            transform: translateY(-2px);
        }
        
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        
        .btn-success {
            background: #27ae60;
            color: white;
        }
        
        .btn-warning {
            background: #f39c12;
            color: white;
        }
        
        .btn-secondary {
            background: #95a5a6;
            color: white;
        }
        
        .remote-section {
            padding: 20px;
        }
        
        .power-btn {
            width: 100%;
            margin-bottom: 20px;
            padding: 15px;
            font-size: 16px;
        }
        
        .control-row {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            justify-content: center;
        }
        
        .control-row button {
            flex: 1;
            padding: 12px;
        }
        
        .nav-pad {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            margin: 20px 0;
            max-width: 200px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .nav-btn {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .nav-btn.center {
            background: #2ecc71;
            font-size: 14px;
        }
        
        .nav-btn:not(.center) {
            background: #34495e;
            color: white;
        }
        
        .apps-section {
            padding: 20px;
            border-top: 1px solid #eee;
        }
        
        .apps-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 15px;
        }
        
        .app-btn {
            padding: 15px;
            border-radius: 12px;
            font-size: 14px;
        }
        
        .netflix { background: #e50914; color: white; }
        .youtube { background: #ff0000; color: white; }
        .prime { background: #00a8e1; color: white; }
        .disney { background: #113ccf; color: white; }
        
        .message {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        }
        
        .message.show {
            transform: translateX(0);
        }
        
        .message.success { background: #27ae60; }
        .message.error { background: #e74c3c; }
        
        @media (max-width: 480px) {
            .container {
                margin: 0;
                border-radius: 0;
                min-height: 100vh;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📺 Samsung TV Remote</h1>
        </div>
        
        <div id="status" class="status disconnected">
            Not Connected
        </div>
        
        <div class="connection-panel">
            <div class="input-group">
                <input type="text" id="ipInput" placeholder="Enter TV IP Address (e.g., 192.168.1.100)">
                <button id="connectBtn" class="btn-primary" onclick="connectToTV()">Connect</button>
            </div>
        </div>
        
        <div class="remote-section">
            <button class="power-btn btn-danger" onclick="sendKey('KEY_POWER')">⏻ POWER</button>
            
            <div class="control-row">
                <button class="btn-success" onclick="sendKey('KEY_VOLUP')">VOL+</button>
                <button class="btn-warning" onclick="sendKey('KEY_MUTE')">MUTE</button>
                <button class="btn-success" onclick="sendKey('KEY_VOLDOWN')">VOL-</button>
            </div>
            
            <div class="control-row">
                <button class="btn-secondary" onclick="sendKey('KEY_CHUP')">CH+</button>
                <button class="btn-secondary" onclick="sendKey('KEY_CHDOWN')">CH-</button>
            </div>
            
            <div class="nav-pad">
                <div></div>
                <button class="nav-btn" onclick="sendKey('KEY_UP')">▲</button>
                <div></div>
                <button class="nav-btn" onclick="sendKey('KEY_LEFT')">◄</button>
                <button class="nav-btn center" onclick="sendKey('KEY_ENTER')">OK</button>
                <button class="nav-btn" onclick="sendKey('KEY_RIGHT')">►</button>
                <div></div>
                <button class="nav-btn" onclick="sendKey('KEY_DOWN')">▼</button>
                <div></div>
            </div>
            
            <div class="control-row">
                <button class="btn-secondary" onclick="sendKey('KEY_HOME')">HOME</button>
                <button class="btn-secondary" onclick="sendKey('KEY_MENU')">MENU</button>
                <button class="btn-secondary" onclick="sendKey('KEY_RETURN')">BACK</button>
            </div>
            
            <div class="control-row">
                <button class="btn-secondary" onclick="sendKey('KEY_SOURCE')">SOURCE</button>
                <button class="btn-secondary" onclick="sendKey('KEY_GUIDE')">GUIDE</button>
                <button class="btn-secondary" onclick="sendKey('KEY_INFO')">INFO</button>
            </div>
        </div>
        
        <div class="apps-section">
            <h3>Quick Apps</h3>
            <div class="apps-grid">
                <button class="app-btn netflix" onclick="launchApp('11101200001')">Netflix</button>
                <button class="app-btn youtube" onclick="launchApp('111299001912')">YouTube</button>
                <button class="app-btn prime" onclick="launchApp('3201606009684')">Prime Video</button>
                <button class="app-btn disney" onclick="launchApp('3201901017640')">Disney+</button>
            </div>
        </div>
    </div>
    
    <div id="message" class="message"></div>
    
    <script>
        let isConnected = false;
        
        // Load saved IP on page load
        window.onload = function() {
            updateStatus();
        };
        
        async function updateStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                isConnected = data.connected;
                const statusEl = document.getElementById('status');
                const ipInput = document.getElementById('ipInput');
                
                if (data.connected) {
                    statusEl.textContent = `Connected to ${data.tv_name}`;
                    statusEl.className = 'status connected';
                    ipInput.value = data.tv_ip;
                } else {
                    statusEl.textContent = 'Not Connected';
                    statusEl.className = 'status disconnected';
                    if (data.tv_ip) {
                        ipInput.value = data.tv_ip;
                    }
                }
            } catch (error) {
                console.error('Error updating status:', error);
            }
        }
        
        async function connectToTV() {
            const ip = document.getElementById('ipInput').value.trim();
            if (!ip) {
                showMessage('Please enter TV IP address', 'error');
                return;
            }
            
            const connectBtn = document.getElementById('connectBtn');
            const statusEl = document.getElementById('status');
            
            connectBtn.disabled = true;
            connectBtn.textContent = 'Connecting...';
            statusEl.textContent = 'Connecting...';
            statusEl.className = 'status connecting';
            
            try {
                const response = await fetch('/api/connect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ip: ip })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showMessage(data.message, 'success');
                    updateStatus();
                } else {
                    showMessage(data.message, 'error');
                    statusEl.textContent = 'Connection Failed';
                    statusEl.className = 'status disconnected';
                }
            } catch (error) {
                showMessage('Connection error: ' + error.message, 'error');
                statusEl.textContent = 'Connection Failed';
                statusEl.className = 'status disconnected';
            }
            
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect';
        }
        
        async function sendKey(key) {
            if (!isConnected) {
                showMessage('Not connected to TV', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/key', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ key: key })
                });
                
                const data = await response.json();
                
                if (!data.success) {
                    showMessage(data.message, 'error');
                }
            } catch (error) {
                showMessage('Error sending key: ' + error.message, 'error');
            }
        }
        
        async function launchApp(appId) {
            if (!isConnected) {
                showMessage('Not connected to TV', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/launch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ app_id: appId })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showMessage('App launched', 'success');
                } else {
                    showMessage(data.message, 'error');
                }
            } catch (error) {
                showMessage('Error launching app: ' + error.message, 'error');
            }
        }
        
        function showMessage(text, type) {
            const messageEl = document.getElementById('message');
            messageEl.textContent = text;
            messageEl.className = `message ${type} show`;
            
            setTimeout(() => {
                messageEl.className = `message ${type}`;
            }, 3000);
        }
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', function(event) {
            if (!isConnected) return;
            
            switch(event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    sendKey('KEY_UP');
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    sendKey('KEY_DOWN');
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    sendKey('KEY_LEFT');
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    sendKey('KEY_RIGHT');
                    break;
                case 'Enter':
                    event.preventDefault();
                    sendKey('KEY_ENTER');
                    break;
                case 'Escape':
                    event.preventDefault();
                    sendKey('KEY_RETURN');
                    break;
                case ' ':
                    event.preventDefault();
                    sendKey('KEY_ENTER');
                    break;
            }
        });
    </script>
</body>
</html>
        """

        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        self.wfile.write(html_content.encode())

    def serve_json(self, data):
        """Serve JSON response"""
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        """Suppress default logging"""
        pass


def find_free_port():
    """Find a free port to run the server"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port


def main():
    port = find_free_port()
    server = HTTPServer(("localhost", port), RemoteHandler)

    print(f"🚀 Samsung TV Remote Server starting...")
    print(f"📱 Open your browser and go to: http://localhost:{port}")
    print(f"🔗 Or click: http://localhost:{port}")
    print(f"⏹️  Press Ctrl+C to stop the server")

    # Auto-open browser
    threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{port}")).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped!")
        server.shutdown()


if __name__ == "__main__":
    main()
