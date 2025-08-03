# Samsung Smart TV Controller Setup

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Make sure your Samsung Smart TV and computer are on the same network

3. Enable "Smart View" or "Screen Mirroring" on your TV (usually in Settings > General > External Device Manager)

4. Run the application:
```bash
python samsung_tv_controller.py
```

## Features

- Auto-discovery of Samsung TVs on local network
- Full remote control functionality
- Power, volume, channel controls
- Navigation (up, down, left, right, enter)
- Smart TV functions (home, menu, source, guide)
- Color buttons (red, green, yellow, blue)

## Troubleshooting

- If no TVs are found, ensure both devices are on same WiFi network
- Some newer Samsung TVs may require pairing - check TV screen for prompts
- If connection fails, try restarting the TV's network connection
- Firewall may block discovery - temporarily disable if needed

## Supported Models

Works with most Samsung Smart TVs from 2016 onwards that support the SmartThings API.
