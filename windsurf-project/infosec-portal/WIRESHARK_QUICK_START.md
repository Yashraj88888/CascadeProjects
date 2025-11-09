# 📡 Wireshark Live Capture - Quick Start

## What's New?

Wireshark tool now supports **real-time traffic capture** for any website URL!

## Quick Test (2 Minutes)

### 1. Open Wireshark Page
- Navigate to: http://localhost:3000
- Click: **"Wireshark"** in menu

### 2. Start Live Capture
```
URL: https://www.google.com
Duration: 20 seconds
Click: "🎬 Start Capture"
```

### 3. Watch Real-Time Status
- **Red pulsing dot** = capturing
- **Packet count** updating live
- **Progress bar** showing time left

### 4. View Results (after 20 seconds)
- **Total packets** captured
- **Protocol breakdown** (TCP, UDP, DNS, etc.)
- **Top source IPs**
- **Top destination IPs**

## Features

- ✅ **URL-based capture** - Enter any website
- ✅ **Real-time monitoring** - See packets as they arrive
- ✅ **Smart analysis** - Protocol distribution & IP tracking
- ✅ **Stop anytime** - Don't want to wait? Stop early!
- ✅ **Beautiful UI** - Purple-themed with animations

## Requirements

**Server needs `tshark`:**
```bash
sudo apt install tshark -y
```

**For non-root capture:**
```bash
sudo dpkg-reconfigure wireshark-common  # Select "Yes"
sudo usermod -a -G wireshark $USER
# Log out and back in
```

## Test URLs

Safe sites to test:
- `https://www.google.com`
- `https://example.com`
- `http://testphp.vulnweb.com`
- `https://jsonplaceholder.typicode.com`

## How It Works

1. **You enter URL** → Backend extracts hostname
2. **Capture starts** → tshark filters for that host
3. **Packets flow** → Stored in PCAP file
4. **Analysis runs** → Protocols, IPs, stats
5. **Results display** → Beautiful visualizations

## UI Preview

```
┌────────────────────────────────────┐
│  🔴 Live Traffic Capture           │
│                                    │
│  [ https://google.com ] [30s]     │
│  [ 🎬 Start Capture ]             │
└────────────────────────────────────┘

↓ (After starting)

┌────────────────────────────────────┐
│  📊 Capture Status    🔴 CAPTURING │
│                                    │
│  Target: google.com                │
│  Status: Running                   │
│  Elapsed: 8s / 20s                 │
│  Packets: 127                      │
│  [========>    ]                   │
└────────────────────────────────────┘

↓ (After completion)

┌────────────────────────────────────┐
│  📦 Packet Analysis                │
│                                    │
│  284     8      3      5           │
│  Packets Proto  Src    Dst         │
│                                    │
│  🔷 Protocol Distribution          │
│  tcp  180 (63.4%)                  │
│  udp   68 (23.9%)                  │
│  dns   24 (8.5%)                   │
│                                    │
│  📤 Top Source IPs                 │
│  192.168.1.100  125 packets        │
│                                    │
│  📥 Top Destination IPs            │
│  172.217.14.206  98 packets        │
└────────────────────────────────────┘
```

## Troubleshooting

### "tshark not found"
```bash
sudo apt install tshark -y
```

### "Permission denied"
```bash
sudo usermod -a -G wireshark $USER
# Log out and log back in
```

### "No packets captured"
- Try different URL
- Increase duration
- Check network connectivity
- Verify tshark installation

## More Info

- **Full Guide**: `WIRESHARK_LIVE_CAPTURE_GUIDE.md`
- **API Documentation**: In guide
- **Security Notes**: In guide

---

**Ready to capture some traffic?** 
Visit http://localhost:3000 → Wireshark 📡
