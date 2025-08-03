# Samsung TV Web Remote 📺

A modern, web-based remote control for Samsung Smart TVs. Control your TV from any device with a web browser - desktop, tablet, or smartphone!

![Samsung TV Remote](https://img.shields.io/badge/Samsung-TV%20Remote-blue?style=for-the-badge&logo=samsung)
![Python](https://img.shields.io/badge/Python-3.6+-green?style=for-the-badge&logo=python)
![HTML5](https://img.shields.io/badge/HTML5-Web%20App-orange?style=for-the-badge&logo=html5)

## ✨ Features

- 🌐 **Web-based Interface** - Works on any device with a browser
- 📱 **Mobile Responsive** - Perfect for phones and tablets
- ⌨️ **Keyboard Shortcuts** - Use arrow keys for navigation
- 🎮 **Full Remote Control** - All standard Samsung TV functions
- 🚀 **Quick App Launch** - Netflix, YouTube, Prime Video, Disney+
- 💾 **Auto-Save Settings** - Remembers your TV's IP address
- 🔄 **Real-time Status** - Live connection feedback
- 🎨 **Modern UI** - Beautiful gradient design with animations

## 🖼️ Screenshots

### Desktop View
```
┌─────────────────────────────────┐
│        📺 Samsung TV Remote      │
├─────────────────────────────────┤
│     ✅ Connected to Living Room  │
├─────────────────────────────────┤
│  [192.168.1.100] [Connect]     │
├─────────────────────────────────┤
│           ⏻ POWER              │
│                                 │
│    [VOL+]  [MUTE]  [VOL-]      │
│      [CH+]        [CH-]        │
│                                 │
│         ▲                      │
│    ◄   [OK]   ►                │
│         ▼                      │
│                                 │
│  [HOME] [MENU] [BACK]          │
│ [SOURCE][GUIDE] [INFO]         │
├─────────────────────────────────┤
│           Quick Apps            │
│  [Netflix] [YouTube]           │
│  [Prime]   [Disney+]           │
└─────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.6 or higher
- Samsung Smart TV (2016+ models)
- Both devices on the same WiFi network

### Installation

1. **Clone or download the code:**
   ```bash
   # Save the code as samsung_tv_web_remote.py
   ```

2. **Install dependencies:**
   ```bash
   pip install samsungtvws
   ```

3. **Run the app:**
   ```bash
   python3 samsung_tv_web_remote.py
   ```

4. **Open your browser:**
   - The app will automatically open your browser
   - Or manually go to the displayed URL (e.g., `http://localhost:8080`)

### First Time Setup

1. **Find your TV's IP address:**
   - **TV Settings:** Settings → General → Network → Network Status
   - **Router:** Check connected devices in your router's admin panel
   - **Network Scanner:** `nmap -sn 192.168.1.0/24 | grep -B2 "Samsung"`

2. **Connect to your TV:**
   - Enter your TV's IP address in the app
   - Click "Connect"
   - **Important:** Accept the connection request on your TV screen
   - The app will remember your TV's IP for next time

## 🎮 Controls

### Basic Remote Functions
- **Power:** Turn TV on/off
- **Volume:** Volume up/down, mute
- **Channels:** Channel up/down
- **Navigation:** Directional pad with OK button
- **Menu:** Home, Menu, Back, Source, Guide, Info

### Keyboard Shortcuts
| Key | Function |
|-----|----------|
| ↑↓←→ | Navigation |
| Enter/Space | OK button |
| Escape | Back button |

### Quick Apps
Pre-configured buttons for popular streaming services:
- Netflix
- YouTube
- Prime Video
- Disney+

## 🛠️ Technical Details

### Architecture
```
┌─────────────────┐    HTTP     ┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Web Browser   │ ◄────────► │  Python Server  │ ◄────────────► │   Samsung TV    │
│   (Frontend)    │             │   (Backend)     │                 │                 │
└─────────────────┘             └─────────────────┘                 └─────────────────┘
```

### API Endpoints
- `GET /` - Main web interface
- `GET /api/status` - Connection status
- `POST /api/connect` - Connect to TV
- `POST /api/key` - Send key command
- `POST /api/launch` - Launch app

### File Structure
```
samsung-tv-remote/
├── samsung_tv_web_remote.py    # Main application
├── tv_config.json             # Auto-generated TV settings
└── README.md                  # This file
```

## 🔧 Configuration

### Supported Samsung TV Models
- 2016+ Samsung Smart TVs
- Models with Tizen OS
- TVs with network connectivity

### Common Samsung TV Key Codes
```python
# Power & Basic Controls
KEY_POWER, KEY_POWEROFF, KEY_POWERON

# Navigation
KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT, KEY_ENTER, KEY_RETURN

# Volume & Channels
KEY_VOLUP, KEY_VOLDOWN, KEY_MUTE
KEY_CHUP, KEY_CHDOWN

# Menu & Functions
KEY_HOME, KEY_MENU, KEY_SOURCE, KEY_GUIDE, KEY_INFO

# Numbers
KEY_0, KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6, KEY_7, KEY_8, KEY_9

# Media Controls
KEY_PLAY, KEY_PAUSE, KEY_STOP, KEY_REWIND, KEY_FF
```

### App IDs for Popular Services
```python
APPS = {
    'Netflix': '11101200001',
    'YouTube': '111299001912',
    'Prime Video': '3201606009684',
    'Disney+': '3201901017640',
    'Hulu': '3201601007625',
    'HBO Max': '3201601007230',
    'Spotify': '3201606009684'
}
```

## 🐛 Troubleshooting

### Connection Issues

**Problem:** Can't connect to TV
```bash
# Solutions:
1. Ensure TV and computer are on same WiFi network
2. Check TV's IP address in TV settings
3. Make sure TV is powered on
4. Try restarting both TV and app
```

**Problem:** Connection request not appearing on TV
```bash
# Solutions:
1. Check if TV's "Smart Connect" is enabled
2. Try connecting from TV's network settings first
3. Restart the TV's network connection
```

### Network Discovery

**Find Samsung TVs on your network:**
```bash
# Using nmap (install with: brew install nmap)
nmap -sn 192.168.1.0/24 | grep -B2 "Samsung"

# Using arp (built-in)
arp -a | grep -i samsung
```

### Port Issues

**Problem:** Port already in use
```bash
# The app automatically finds a free port
# If issues persist, manually specify a port:
python3 samsung_tv_web_remote.py --port 8080
```

## 🔒 Security Notes

- The app runs locally on your machine
- No data is sent to external servers
- TV communication uses Samsung's official WebSocket API
- Web interface is only accessible from your local network

## 🤝 Contributing

Contributions are welcome! Here are some ideas:

### Planned Features
- [ ] Multiple TV support
- [ ] Custom app shortcuts
- [ ] Voice control integration
- [ ] Macro recording
- [ ] Dark/light theme toggle
- [ ] TV channel favorites
- [ ] Volume slider
- [ ] Screen mirroring controls

### How to Contribute
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [samsung-tv-ws-api](https://github.com/xchwarze/samsung-tv-ws-api) - Samsung TV WebSocket API library
- Samsung for providing the Smart TV API
- The open source community for inspiration and support

## 📞 Support

Having issues? Here's how to get help:

1. **Check the troubleshooting section above**
2. **Verify your TV model compatibility**
3. **Test with the basic connection script first**
4. **Open an issue with:**
   - Your TV model and year
   - Python version
   - Error messages
   - Network setup details

---

**Made with ❤️ for Samsung Smart TV users**

*Control your TV like a pro! 🎮*