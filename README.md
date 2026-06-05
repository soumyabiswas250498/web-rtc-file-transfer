# RTC File Transfer

A browser-based peer-to-peer file transfer app built with React and WebRTC.
Files travel directly between two devices over an `RTCDataChannel`; there is no
file upload or signaling server.

## Features

- Direct peer-to-peer file transfer
- Manual WebRTC offer/answer signaling
- QR codes for sharing and scanning signaling data
- Chunked transfer with sender backpressure and receiver acknowledgements
- Direct-to-disk writing on the receiving device
- Send and receive progress indicators

## Requirements

- Node.js 20.19+ or 22.12+ (required by Vite 7)
- Two devices on the same Wi-Fi or LAN
- A Chromium-based browser such as Chrome or Edge on the receiving device
- A secure browser context for QR scanning and direct-to-disk saving

The receiver uses the File System Access API (`showSaveFilePicker`), which is
not supported by every browser. Camera access also requires HTTPS, except on
`localhost`.

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```env
VITE_CHUNK_SIZE_KB=256
VITE_MAX_IN_FLIGHT_CHUNKS=256
```

Start the development server:

```bash
npm run dev
```

Vite listens on all network interfaces. Open the displayed local URL on the
host device and the network URL on the second device.

When accessing the app from another device, serve it over HTTPS so camera
scanning and direct-to-disk saving are available. The Vite configuration allows
`*.trycloudflare.com` hosts for use with a Cloudflare Tunnel.

## How to Transfer a File

1. Open the app on both devices.
2. On the device with the file, select **Send**.
3. On the receiving device, select **Receive**.
4. Share the sender's offer with the receiver by scanning its QR code or
   copying and pasting the local code.
5. On the receiver, select **Create answer** and share the generated answer
   back with the sender.
6. On the sender, scan or paste the answer and select **Accept answer**.
7. After both devices show a connected status, select a file and choose
   **Send file**.
8. On the receiver, choose a save location. The transfer starts after the save
   location is approved.

Use **Reset** on both devices to start a new connection or recover from a failed
connection.

## Configuration

| Variable | Description |
| --- | --- |
| `VITE_CHUNK_SIZE_KB` | Size of each file chunk sent over the data channel, in KiB |
| `VITE_MAX_IN_FLIGHT_CHUNKS` | Maximum number of sent chunks that may be awaiting receiver write acknowledgements |

Both values must be positive integers. Larger values can improve throughput but
increase memory use and buffering pressure.

## Available Scripts

```bash
npm run dev      # Start the Vite development server
npm run build    # Type-check and create a production build
npm run preview  # Preview the production build
```

## How It Works

The sender creates a WebRTC offer and the receiver creates an answer. Because
the app has no signaling service, these descriptions are exchanged manually as
text or QR codes after ICE gathering completes.

After the data channel opens, the transfer protocol is:

```text
metadata -> receiver ready -> binary chunks + write acknowledgements -> done
```

The receiver writes chunks directly to the selected file in order. The sender
limits buffered data and waits for acknowledgements so it does not outrun the
receiver's disk writes.

## Limitations

- There is no signaling server; offer and answer codes must be exchanged
  manually.
- No STUN or TURN servers are configured. The app is intended for devices on
  the same local network and may not connect across the internet, VPNs, guest
  networks, or restrictive firewalls.
- Direct-to-disk receiving requires a Chromium-based browser.
- Only one file is transferred at a time.
- Reloading or resetting either device ends the current connection.

## Tech Stack

- React 19
- TypeScript
- Vite
- WebRTC
- `html5-qrcode`
- `qrcode.react`
- Lucide React
