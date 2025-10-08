const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Store active rooms and their sync state
const rooms = new Map();

// Room class to manage sync state
class SyncRoom {
  constructor(id) {
    this.id = id;
    this.host = null;
    this.members = new Map(); // Store member info including files
    this.currentTrack = null;
    this.currentTime = 0;
    this.isPlaying = false;
    this.lastUpdate = Date.now();
    this.playlist = []; // Available files with member info
    this.currentIndex = -1;
    this.currentVideoName = null;
    this.currentFileName = null;
    this.syncDelay = 500; // 500ms sync delay
    this.lastAction = null;
    this.actionTimestamp = null;
    this.downloadSources = new Map(); // Store download sources by file index
    this.torrentFiles = new Map(); // Store torrent files by file index
  }

  addMember(socketId, isHost = false) {
    this.members.set(socketId, {
      id: socketId,
      files: [],
      joinedAt: Date.now()
    });
    if (isHost || !this.host) {
      this.host = socketId;
    }
  }

  removeMember(socketId) {
    this.members.delete(socketId);
    if (this.host === socketId && this.members.size > 0) {
      this.host = this.members.keys().next().value;
    }
    // Remove files uploaded by this member
    this.playlist = this.playlist.filter(file => file.uploadedBy !== socketId);
  }

  updatePlaybackState(track, time, playing) {
    this.currentTrack = track;
    this.currentTime = time;
    this.isPlaying = playing;
    this.lastUpdate = Date.now();
  }
  
  setPlaybackAction(action, data) {
    this.lastAction = action;
    this.actionTimestamp = Date.now();
    
    switch (action) {
      case 'play':
        this.updatePlaybackState(this.currentTrack, data.time || this.currentTime, true);
        break;
      case 'pause':
        this.updatePlaybackState(this.currentTrack, data.time || this.currentTime, false);
        break;
      case 'seek':
        this.updatePlaybackState(this.currentTrack, data.time, this.isPlaying);
        break;
      case 'load-video':
        this.currentIndex = data.videoIndex;
        this.currentVideoName = data.videoName;
        this.currentFileName = data.fileName;
        this.updatePlaybackState(null, 0, false);
        break;
    }
  }

  getCurrentTime() {
    if (!this.isPlaying) return this.currentTime;
    const timeDiff = (Date.now() - this.lastUpdate) / 1000;
    return this.currentTime + timeDiff;
  }

  getState() {
    return {
      id: this.id,
      host: this.host,
      memberCount: this.members.size,
      currentTrack: this.currentTrack,
      currentTime: this.getCurrentTime(),
      isPlaying: this.isPlaying,
      playlist: this.playlist,
      currentIndex: this.currentIndex,
      currentVideoName: this.currentVideoName,
      currentFileName: this.currentFileName,
      downloadSources: Object.fromEntries(this.downloadSources),
      torrentFiles: Object.fromEntries(this.torrentFiles)
    };
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join or create a room
  socket.on('join-room', (roomId, callback) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new SyncRoom(roomId));
    }

    const room = rooms.get(roomId);
    const isHost = room.members.size === 0;
    
    room.addMember(socket.id, isHost);
    socket.join(roomId);
    socket.roomId = roomId;

    console.log(`User ${socket.id} joined room ${roomId} as ${isHost ? 'host' : 'member'}`);

    callback({
      success: true,
      isHost,
      roomState: room.getState()
    });

    // Notify other members
    socket.to(roomId).emit('member-joined', {
      memberId: socket.id,
      memberCount: room.members.size
    });
  });

  // File selection handler
  socket.on('file-selected', (data) => {
    if (!socket.roomId) return;

    const room = rooms.get(socket.roomId);
    if (!room) return;

    console.log(`File selected by ${socket.id}:`, data);

    // Store the selected file for this client
    const member = room.members.get(socket.id);
    if (member) {
      member.selectedFileIndex = data.fileIndex;
      member.selectedFileName = data.fileName;
      console.log(`Updated member ${socket.id} with selected file: ${data.fileName}`);
    }
  });

  // Check play permission handler
  socket.on('check-play-permission', () => {
    if (!socket.roomId) return;

    const room = rooms.get(socket.roomId);
    if (!room) return;

    // Check if all clients have selected files
    const allMembers = Array.from(room.members.values());
    const allSelected = allMembers.every(member => member.selectedFileIndex !== undefined);
    
    console.log(`Play permission check: ${allMembers.length} members, all selected: ${allSelected}`);
    
    if (allSelected && allMembers.length >= 1) {
      // All clients have selected files, grant permission
      console.log('Granting play permission to all clients');
      io.to(socket.roomId).emit('play-permission-granted');
    } else {
      // Not all clients have selected files, deny permission
      console.log('Denying play permission - not all clients have selected files');
      socket.emit('play-permission-denied');
    }
  });

  // Download source update handler
  socket.on('update-download-source', (data) => {
    if (!socket.roomId) return;

    const room = rooms.get(socket.roomId);
    if (!room) return;

    console.log(`Download source updated for file ${data.fileIndex}:`, data.downloadSource);
    
    // Broadcast to all clients in the room
    io.to(socket.roomId).emit('download-source-updated', {
      fileIndex: data.fileIndex,
      downloadSource: data.downloadSource
    });
  });

  // Torrent upload handler
  socket.on('upload-torrent', (data) => {
    if (!socket.roomId) return;

    const room = rooms.get(socket.roomId);
    if (!room) return;

    console.log(`Torrent file uploaded for file ${data.fileIndex}:`, data.torrentFileName);
    
    // Broadcast to all clients in the room
    io.to(socket.roomId).emit('torrent-uploaded', {
      fileIndex: data.fileIndex,
      torrentData: data.torrentData,
      torrentFileName: data.torrentFileName
    });
  });

  // Playback control - server authoritative with sync delay
  socket.on('playback-control', (data) => {
    if (!socket.roomId) return;

    const room = rooms.get(socket.roomId);
    if (!room) return;

    const { action, videoIndex, videoName, fileName, time } = data;
    
    console.log(`Playback control: ${action} from ${socket.id}`);
    
    // Server processes and authorizes the action
    room.setPlaybackAction(action, {
      videoIndex,
      videoName,
      fileName,
      time
    });
    
    // Calculate sync timestamp with delay for coordination
    const syncTimestamp = Date.now() + room.syncDelay;
    
    // Broadcast to ALL members (including sender) for server authority
    io.to(socket.roomId).emit('sync-command', {
      action,
      videoIndex: room.currentIndex,
      videoName: room.currentVideoName,
      fileName: room.currentFileName,
      time: room.getCurrentTime(),
      isPlaying: room.isPlaying,
      executeAt: syncTimestamp,
      serverTimestamp: Date.now()
    });
  });

  // Add file to member's files and update room playlist
  socket.on('add-file', (fileData) => {
    if (!socket.roomId) return;

    const room = rooms.get(socket.roomId);
    if (!room) return;

    const member = room.members.get(socket.id);
    if (!member) return;
    
    // Add to member's files
    member.files.push({
      id: uuidv4(),
      ...fileData,
      uploadedAt: Date.now()
    });
    
    // Update room playlist with file availability
    const existingFile = room.playlist.find(f => f.fileName === fileData.fileName);
    if (existingFile) {
      // Add this member to the file's availability
      if (!existingFile.availableFor.includes(socket.id)) {
        existingFile.availableFor.push(socket.id);
      }
    } else {
      // Create new file entry
      room.playlist.push({
        id: uuidv4(),
        ...fileData,
        uploadedBy: socket.id,
        availableFor: [socket.id],
        addedAt: Date.now()
      });
    }

    // Broadcast updated file availability
    io.to(socket.roomId).emit('files-updated', {
      files: room.playlist,
      members: Array.from(room.members.entries()).map(([id, member]) => ({
        id,
        fileCount: member.files.length
      }))
    });
  });

  // Request sync state
  socket.on('request-sync', () => {
    if (!socket.roomId) return;

    const room = rooms.get(socket.roomId);
    if (!room) return;

    socket.emit('sync-update', {
      action: 'sync',
      videoIndex: room.currentIndex,
      videoName: room.currentVideoName,
      fileName: room.currentFileName,
      time: room.getCurrentTime(),
      isPlaying: room.isPlaying,
      timestamp: Date.now()
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        room.removeMember(socket.id);

        if (room.members.size === 0) {
          rooms.delete(socket.roomId);
          console.log(`Room ${socket.roomId} deleted (no members)`);
        } else {
          // Notify remaining members
          socket.to(socket.roomId).emit('member-left', {
            memberId: socket.id,
            memberCount: room.members.size,
            newHost: room.host
          });
        }
      }
    }
  });

  // Download source update handler
  socket.on('update-download-source', (data) => {
    if (!socket.roomId) return;

    const room = rooms.get(socket.roomId);
    if (!room) return;

    console.log(`Download source updated for file ${data.fileIndex}:`, data.downloadSource);
    
    // Store download source in room
    room.downloadSources.set(data.fileIndex, data.downloadSource);
    
    // Broadcast to all clients in the room
    socket.to(socket.roomId).emit('download-source-updated', {
      fileIndex: data.fileIndex,
      downloadSource: data.downloadSource
    });
  });

  // Torrent file upload handler
  socket.on('upload-torrent', (data) => {
    if (!socket.roomId) return;

    const room = rooms.get(socket.roomId);
    if (!room) return;

    console.log(`Torrent file uploaded for file ${data.fileIndex}:`, data.torrentFileName);
    
    // Store torrent file in room
    room.torrentFiles.set(data.fileIndex, {
      torrentData: data.torrentData,
      torrentFileName: data.torrentFileName
    });
    
    // Broadcast to all clients in the room
    socket.to(socket.roomId).emit('torrent-uploaded', {
      fileIndex: data.fileIndex,
      torrentData: data.torrentData,
      torrentFileName: data.torrentFileName
    });
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/room/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// API endpoints
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    memberCount: room.members.size,
    currentTrack: room.currentTrack?.name || 'No track',
    isPlaying: room.isPlaying
  }));

  res.json(roomList);
});

// For local development
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`🎵 SyncWave server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} to start syncing!`);
});

module.exports = app;
