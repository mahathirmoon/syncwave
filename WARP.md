# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start production server
npm start

# Start development server with auto-restart
npm run dev

# Install dependencies (alternative command)
npm run install-deps
```

### Development Workflow
```bash
# Start development environment
npm run dev

# Test the application (open browser)
# Navigate to http://localhost:3000

# Upload music files to test sync functionality
# Create rooms and test multi-client synchronization
```

### File Operations
```bash
# The application stores uploaded files temporarily in memory
# No build process is required - static files served directly
# Audio files are processed client-side using HTML5 Audio API
```

## Architecture Overview

### System Architecture
SyncWave is a **real-time music synchronization application** with a client-server architecture:

- **Server**: Express.js + Socket.IO for real-time communication
- **Client**: Vanilla JavaScript with HTML5 Audio API
- **Storage**: In-memory room state management (no persistent database)
- **Communication**: WebSocket-based real-time sync using Socket.IO

### Key Components

#### Server-Side (`server/server.js`)
- **SyncRoom Class**: Core room management with server-authoritative playback state
- **Socket.IO Event Handlers**: Real-time communication between clients
- **Express Routes**: Basic web server and API endpoints
- **Memory-Based Storage**: Active rooms stored in a Map() structure

#### Client-Side (`client/js/app.js`)
- **SyncWave Class**: Main application controller
- **Real-Time Sync Logic**: Handles playback synchronization across clients
- **File Upload Management**: Client-side audio file processing
- **DOM Manipulation**: UI updates and user interaction handling

### Real-Time Synchronization System

The synchronization architecture uses a **server-authoritative model**:

1. **Host Controls**: Only the room host can control playback (play/pause/seek/track change)
2. **Server State**: Server maintains authoritative playback state with timing calculations
3. **Client Sync**: Non-host clients receive sync updates and adjust their audio accordingly
4. **Host Migration**: Automatic host transfer when current host disconnects

#### Critical Sync Events
- `join-room`: Join or create a room
- `playback-control`: Host-only playback commands
- `sync-update`: Broadcast playback state to all clients
- `add-to-playlist`: Add tracks to shared playlist
- `request-sync`: Client requests current sync state

### File System Structure
```
syncwave/
├── client/                    # Frontend (served statically)
│   ├── index.html            # Single-page application
│   ├── css/styles.css        # Spotify-themed UI
│   └── js/app.js             # Main application logic
├── server/
│   └── server.js             # Express + Socket.IO server
├── shared/                   # Reserved for shared utilities
└── uploads/                  # Temporary file storage directory
```

## Development Patterns

### Room Management Pattern
```javascript
// Server-side room lifecycle
class SyncRoom {
  constructor(id) {
    this.members = new Set();
    this.host = null;
    this.currentTrack = null;
    this.isPlaying = false;
    // ... sync state management
  }
}
```

### Client Synchronization Pattern
```javascript
// Client-side sync handling
handleSyncUpdate(data) {
  if (this.isHost) return; // Host doesn't sync to others
  
  switch (data.action) {
    case 'play': this.loadAndSyncTrack(data.track, data.time, true); break;
    case 'pause': this.audioPlayer.pause(); break;
    // ... other sync actions
  }
}
```

### Audio File Handling
- Files are converted to Object URLs using `URL.createObjectURL()`
- No server-side file storage - files exist only in browser memory
- Audio metadata extracted using HTML5 Audio API
- Playback controlled through Web Audio API

## Testing and Debugging

### Local Testing Setup
1. Start the dev server: `npm run dev`
2. Open multiple browser tabs/windows to `http://localhost:3000`
3. Create a room in one tab, join from others using the room ID
4. Upload audio files and test synchronization

### Common Testing Scenarios
- **Host Controls**: Verify only host can control playback
- **Sync Accuracy**: Check timing synchronization across multiple clients
- **Host Migration**: Test automatic host transfer when host leaves
- **File Upload**: Test various audio formats (MP3, WAV, OGG, M4A, FLAC)
- **Network Issues**: Test reconnection and sync recovery

### Debug Information
- **Server Logs**: Console logs show room creation, member joins/leaves, and sync events
- **Client Console**: Browser dev tools show sync events and audio state changes
- **Network Tab**: Monitor Socket.IO WebSocket communications
- **API Endpoint**: `GET /api/rooms` returns current room states

## Environment Configuration

### Port Configuration
Default port is 3000, configurable via environment variable:
```bash
PORT=8080 npm start  # Run on port 8080
```

### Client-Server Communication
- **Development**: Client connects to `http://localhost:3000`
- **Production**: Ensure proper CORS configuration for your domain
- **WebSocket**: Socket.IO handles fallback protocols automatically

## Special Considerations

### Memory Management
- Rooms are deleted automatically when empty
- Audio Object URLs should be revoked to prevent memory leaks
- No persistent storage - all state is in-memory

### Browser Compatibility
- Requires HTML5 Audio API support
- Modern browsers with WebSocket support
- File API for local file uploading

### Performance Notes
- Server-authoritative timing calculations prevent drift
- Client-side audio decoding happens asynchronously
- Socket.IO provides efficient real-time communication
- No database queries - all operations are in-memory

### Security Considerations
- Room IDs are generated client-side (6-character alphanumeric)
- No user authentication system
- CORS enabled for all origins (development setting)
- File uploads are temporary and client-side only

## Integration Points

When extending or modifying SyncWave:

### Adding Persistent Storage
- Replace in-memory `rooms` Map with database storage
- Implement user accounts and room persistence
- Add file upload to cloud storage

### Adding Audio Processing
- Integrate Web Audio API for visualizations
- Implement audio normalization
- Add equalizer or audio effects

### Scaling Considerations
- Current architecture supports single-server deployment only
- For multi-server: implement Redis for shared room state
- Consider WebRTC for peer-to-peer audio streaming
