# 🎵 SyncWave

**Real-time Music Synchronizer for Local Files**

SyncWave is a modern, real-time media synchronization application that allows multiple users to listen to music together in perfect sync, just like Spotify Jam but for your own music collection. Built with JavaScript, Socket.IO, and a beautiful Spotify-inspired dark UI.

![SyncWave Preview](https://via.placeholder.com/800x400/1db954/000000?text=SyncWave)

## ✨ Features

### 🎧 Real-Time Synchronization
- **Server-Authoritative Sync**: Ensures perfect synchronization across all connected devices
- **Host-Controlled Playback**: Room host controls play, pause, seek, and track changes
- **Automatic Sync Recovery**: Automatically syncs new members with current playback state
- **Low-Latency Communication**: Built on Socket.IO for instant real-time updates

### 🎨 Modern UI/UX
- **Spotify-Themed Design**: Dark, transparent UI with Spotify's signature green accents
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile devices
- **Smooth Animations**: Polished transitions and hover effects
- **Intuitive Controls**: Familiar media player interface

### 🎵 Music Management
- **Local File Support**: Upload and sync your own music files
- **Playlist Management**: Create and manage synchronized playlists
- **Track Information**: Display track names, artists, and duration
- **Progress Tracking**: Real-time progress bar with seek functionality

### 👥 Room System
- **Easy Room Creation**: Generate shareable room codes instantly
- **Simple Joining**: Join rooms with a 6-character code
- **Member Management**: See who's in your room and member count
- **Host Migration**: Automatic host transfer when the current host leaves

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn**

### Installation

1. **Clone or download** the project
2. **Navigate** to the project directory:
   ```bash
   cd syncwave
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. **Open your browser** and go to:
   ```
   http://localhost:3000
   ```

### Development Mode

For development with auto-restart:
```bash
npm run dev
```

## 🎮 How to Use

### Creating a Room

1. **Click "Create Room"** on the home screen
2. **Upload your music** using the "Upload Music" button
3. **Share the room link** with friends using the "Share Room" button
4. **Control playback** as the host - play, pause, seek, and change tracks
5. **Enjoy synchronized music** with your friends!

### Joining a Room

1. **Get a room code** from your friend
2. **Enter the code** in the "Join Room" section
3. **Click "Join"** to enter the synchronized session
4. **Enjoy the music** - only the host can control playback

### Controls Overview

| Control | Description |
|---------|-------------|
| ⏯️ Play/Pause | Start or stop playback (Host only) |
| ⏮️ Previous | Go to previous track (Host only) |
| ⏭️ Next | Go to next track (Host only) |
| 🔊 Volume | Adjust your local volume |
| 📤 Upload | Add music files to the room |
| 🔗 Share | Get shareable room link |

## 🏗️ Project Structure

```
syncwave/
├── client/                 # Frontend application
│   ├── index.html         # Main HTML file
│   ├── css/
│   │   └── styles.css     # Spotify-themed CSS
│   ├── js/
│   │   └── app.js         # Client-side application logic
│   └── assets/            # Static assets
├── server/
│   └── server.js          # Express + Socket.IO server
├── shared/                # Shared utilities (future use)
├── uploads/               # Uploaded files directory
├── package.json           # Project dependencies
└── README.md             # This file
```

## 🛠️ Technical Architecture

### Server-Side
- **Express.js**: Web server and API endpoints
- **Socket.IO**: Real-time bidirectional communication
- **Node.js**: Runtime environment
- **Room Management**: In-memory room state management

### Client-Side
- **Vanilla JavaScript**: Clean, modern ES6+ code
- **Socket.IO Client**: Real-time communication
- **HTML5 Audio API**: Media playback control
- **CSS Grid & Flexbox**: Responsive layout

### Key Components

#### SyncRoom Class
Manages room state including:
- Member tracking
- Playback synchronization
- Host management
- Playlist coordination

#### Real-Time Events
- `join-room`: Join or create a room
- `playback-control`: Host controls (play/pause/seek)
- `sync-update`: Broadcast playback state
- `add-to-playlist`: Add tracks to room playlist
- `member-joined/left`: Member management

## 🔧 Configuration

### Environment Variables
```bash
PORT=3000  # Server port (default: 3000)
```

### File Upload Limits
- **Supported formats**: MP3, WAV, OGG, M4A, FLAC
- **Max file size**: Limited by browser capabilities
- **Storage**: Temporary in-memory storage

## 🎯 Roadmap

### Planned Features
- [ ] **Persistent Playlists**: Save and load playlists
- [ ] **User Profiles**: Create and manage user accounts
- [ ] **Chat System**: In-room text chat
- [ ] **Visualizations**: Audio visualizations during playback
- [ ] **Queue System**: Advanced playlist queuing
- [ ] **Mobile App**: Native mobile applications

### Technical Improvements
- [ ] **Database Integration**: Persistent data storage
- [ ] **File Upload**: Proper file storage system
- [ ] **Audio Processing**: Normalize audio levels
- [ ] **Caching**: Improve performance with caching
- [ ] **Analytics**: Usage statistics and insights

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Test your changes thoroughly
- Update documentation as needed
- Keep commits focused and descriptive

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Troubleshooting

**Connection Issues**
- Check if port 3000 is available
- Ensure firewall allows Node.js connections
- Try refreshing the browser

**Audio Issues**
- Verify audio files are in supported formats
- Check browser audio permissions
- Ensure audio files aren't corrupted

**Sync Issues**
- Refresh the page to reconnect
- Check internet connection stability
- Ensure all members are in the same room

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/yourrepo/syncwave/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourrepo/syncwave/discussions)

## 🙏 Acknowledgments

- **Spotify** for design inspiration
- **Socket.IO** team for excellent real-time communication tools
- **Express.js** community for the robust web framework
- **Contributors** who help make SyncWave better

---

**Made with ❤️ for music lovers everywhere**

*Sync your vibe, share the moment* 🎵