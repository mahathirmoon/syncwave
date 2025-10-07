class SyncWave {
    constructor() {
        this.socket = null;
        this.videoElement = null;
        this.currentRoom = null;
        this.isHost = false;
        this.files = [];
        this.currentFileIndex = -1;
        this.isPlaying = false;
        this.isSyncing = false;
        this.localFiles = new Map(); // Store local file URLs by filename
        this.syncOffset = 0; // Sync offset in seconds
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectSocket();
    }

    initializeElements() {
        // Room elements
        this.roomSection = document.getElementById('roomSection');
        this.playerSection = document.getElementById('playerSection');
        this.createRoomBtn = document.getElementById('createRoomBtn');
        this.joinRoomBtn = document.getElementById('joinRoomBtn');
        this.roomIdInput = document.getElementById('roomIdInput');
        this.shareRoomBtn = document.getElementById('shareRoomBtn');
        this.shareModal = document.getElementById('shareModal');
        this.closeShareModal = document.getElementById('closeShareModal');
        this.shareLink = document.getElementById('shareLink');
        this.copyLinkBtn = document.getElementById('copyLinkBtn');

        // Video player elements
        this.videoElement = document.getElementById('videoElement');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.videoControls = document.getElementById('videoControls');
        this.videoOverlay = document.getElementById('videoOverlay');
        this.syncStatus = document.getElementById('syncStatus');
        
        // Controls
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.progressHandle = document.getElementById('progressHandle');
        this.currentTime = document.getElementById('currentTime');
        this.totalTime = document.getElementById('totalTime');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        
        // Sync offset elements
        this.syncOffsetMinus = document.getElementById('syncOffsetMinus');
        this.syncOffsetPlus = document.getElementById('syncOffsetPlus');
        this.syncOffsetDisplay = document.getElementById('syncOffsetDisplay');
        
        // Seeking popup elements
        this.seekingPopup = document.getElementById('seekingPopup');
        this.seekingTime = document.getElementById('seekingTime');
        this.seekingPreview = document.getElementById('seekingPreview');
        
        // File selection modal elements
        this.fileSelectionModal = document.getElementById('fileSelectionModal');
        this.closeFileSelectionModal = document.getElementById('closeFileSelectionModal');
        this.fileSelectionOptions = document.getElementById('fileSelectionOptions');
        
        // Sync selection modal elements
        this.syncSelectionModal = document.getElementById('syncSelectionModal');
        this.closeSyncSelectionModal = document.getElementById('closeSyncSelectionModal');
        this.syncFileOptions = document.getElementById('syncFileOptions');
        this.startSyncBtn = document.getElementById('startSyncBtn');
        this.syncStatus = document.getElementById('syncStatus');
        
        // Share modal elements
        this.shareCode = document.getElementById('shareCode');
        this.copyCodeBtn = document.getElementById('copyCodeBtn');

        // File elements
        this.uploadBtn = document.getElementById('uploadBtn');
        this.fileInput = document.getElementById('fileInput');
        this.fileCards = document.getElementById('fileCards');
        this.fileCount = document.getElementById('fileCount');

        // Video info
        this.videoTitle = document.getElementById('videoTitle');
        this.videoDetails = document.getElementById('videoDetails');

        // Status elements
        this.statusText = document.getElementById('statusText');
        this.connectionIndicator = document.getElementById('connectionIndicator');
        this.roomInfo = document.getElementById('roomInfo');
        this.currentRoomId = document.getElementById('currentRoomId');
        this.memberCount = document.getElementById('memberCount');
        this.hostIndicator = document.getElementById('hostIndicator');
    }

    setupEventListeners() {
        // Room management
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.roomIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        // Share functionality
        this.shareRoomBtn.addEventListener('click', () => this.showShareModal());
        this.closeShareModal.addEventListener('click', () => this.hideShareModal());
        this.copyLinkBtn.addEventListener('click', () => this.copyShareLink());
        this.shareModal.addEventListener('click', (e) => {
            if (e.target === this.shareModal) this.hideShareModal();
        });
        
        // File selection modal
        this.closeFileSelectionModal.addEventListener('click', () => this.hideFileSelectionModal());
        this.fileSelectionModal.addEventListener('click', (e) => {
            if (e.target === this.fileSelectionModal) this.hideFileSelectionModal();
        });
        
        // Sync selection modal
        this.closeSyncSelectionModal.addEventListener('click', () => this.hideSyncSelectionModal());
        this.syncSelectionModal.addEventListener('click', (e) => {
            if (e.target === this.syncSelectionModal) this.hideSyncSelectionModal();
        });
        this.startSyncBtn.addEventListener('click', () => this.startSync());
        
        // Share modal
        this.copyCodeBtn.addEventListener('click', () => this.copyShareCode());
        
        // Sync selection button
        this.selectSyncBtn = document.getElementById('selectSyncBtn');
        this.selectSyncBtn.addEventListener('click', () => this.showSyncSelectionModal());

        // File upload
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Custom video controls
        this.setupVideoControls();

        // URL handling for direct room links
        this.handleURLRoomId();
    }

    setupVideoControls() {
        // Get all control elements
        this.skipBackBtn = document.getElementById('skipBackBtn');
        this.skipForwardBtn = document.getElementById('skipForwardBtn');
        this.volumeBtn = document.getElementById('volumeBtn');
        
        // Play/Pause button
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        
        // Skip buttons
        this.skipBackBtn.addEventListener('click', () => this.skipBackward());
        this.skipForwardBtn.addEventListener('click', () => this.skipForward());
        
        // Progress bar - enable dragging
        this.setupProgressBarDragging();
        
        // Volume control - fix functionality
        this.setupVolumeControl();
        
        // Fullscreen button
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // Sync offset controls
        this.syncOffsetMinus.addEventListener('click', () => this.adjustSyncOffset(-0.5));
        this.syncOffsetPlus.addEventListener('click', () => this.adjustSyncOffset(0.5));
        
        // Video element events
        this.videoElement.addEventListener('loadedmetadata', () => this.updateVideoInfo());
        this.videoElement.addEventListener('timeupdate', () => this.updateProgress());
        this.videoElement.addEventListener('ended', () => this.handleVideoEnd());
        
        // Hide controls after inactivity
        this.setupControlsAutoHide();
        
        // Click video to play/pause
        this.videoElement.addEventListener('click', () => this.togglePlayPause());
    }
    
    setupProgressBarDragging() {
        let isDragging = false;
        let progressBarContainer = this.progressBar.parentElement;
        
        const startDragging = (e) => {
            if (this.isSyncing) return;
            isDragging = true;
            this.handleProgressDrag(e, true);
            e.preventDefault();
        };
        
        const handleMouseMove = (e) => {
            if (!isDragging || this.isSyncing) return;
            this.handleProgressDrag(e, true);
        };
        
        const stopDragging = (e) => {
            if (!isDragging) return;
            isDragging = false;
            // Send final seek command
            this.handleProgressDrag(e, true);
        };
        
        // Click to seek
        progressBarContainer.addEventListener('click', (e) => {
            if (this.isSyncing) return;
            this.handleProgressDrag(e, false);
        });
        
        // Drag to seek
        progressBarContainer.addEventListener('mousedown', startDragging);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopDragging);
    }
    
    handleProgressDrag(event, isDragging = false) {
        if (this.currentFileIndex === -1 || !this.videoElement.duration || this.isSyncing) return;
        
        const rect = this.progressBar.parentElement.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const time = percent * this.videoElement.duration;
        
        // Update UI immediately for responsiveness
        this.progressFill.style.width = `${percent * 100}%`;
        this.progressHandle.style.left = `${percent * 100}%`;
        this.currentTime.textContent = this.formatTime(time);
        
        // Show seeking popup when dragging
        if (isDragging) {
            this.showSeekingPopup(event, time);
        } else {
            this.hideSeekingPopup();
        }
        
        // Only send seek command on click or when dragging ends
        if (event.type === 'click' || (isDragging && event.type === 'mouseup')) {
            this.socket.emit('playback-control', {
                action: 'seek',
                videoIndex: this.currentFileIndex,
                time: time
            });
            this.hideSeekingPopup();
        }
    }
    
    setupVolumeControl() {
        // Volume slider
        this.volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.videoElement.volume = volume;
            this.updateVolumeIcon(volume);
        });
        
        // Volume button (mute toggle)
        this.volumeBtn.addEventListener('click', () => {
            const isMuted = this.videoElement.muted || this.videoElement.volume === 0;
            if (isMuted) {
                this.videoElement.muted = false;
                this.videoElement.volume = this.volumeSlider.value / 100;
            } else {
                this.videoElement.muted = true;
            }
            this.updateVolumeIcon(this.videoElement.muted ? 0 : this.videoElement.volume);
        });
        
        // Initialize volume
        this.videoElement.volume = 0.7;
        this.updateVolumeIcon(0.7);
    }
    
    updateVolumeIcon(volume) {
        const volumeHigh = this.volumeBtn.querySelector('.volume-high');
        const volumeMuted = this.volumeBtn.querySelector('.volume-muted');
        
        if (volume === 0 || this.videoElement.muted) {
            volumeHigh.style.display = 'none';
            volumeMuted.style.display = 'block';
        } else {
            volumeHigh.style.display = 'block';
            volumeMuted.style.display = 'none';
        }
    }
    
    adjustSyncOffset(amount) {
        this.syncOffset += amount;
        // Clamp sync offset between -5 and 5 seconds
        this.syncOffset = Math.max(-5, Math.min(5, this.syncOffset));
        this.updateSyncOffsetDisplay();
        
        // Apply the offset immediately
        if (this.videoElement.duration) {
            const currentTime = this.videoElement.currentTime;
            const newTime = Math.max(0, Math.min(this.videoElement.duration, currentTime + amount));
            this.videoElement.currentTime = newTime;
        }
    }
    
    updateSyncOffsetDisplay() {
        this.syncOffsetDisplay.textContent = `${this.syncOffset >= 0 ? '+' : ''}${this.syncOffset.toFixed(1)}s`;
    }
    
    showSeekingPopup(event, time) {
        const rect = this.progressBar.parentElement.getBoundingClientRect();
        const popup = this.seekingPopup;
        const timeDisplay = this.seekingTime;
        
        // Position popup above the progress bar
        const x = event.clientX - rect.left;
        popup.style.left = `${x}px`;
        popup.style.display = 'block';
        popup.style.position = 'absolute';
        popup.style.bottom = '100%';
        popup.style.marginBottom = '8px';
        popup.style.transform = 'translateX(-50%)';
        popup.style.zIndex = '1000';
        
        // Update time display
        timeDisplay.textContent = this.formatTime(time);
        
        // Create a simple preview placeholder
        this.seekingPreview.innerHTML = `
            <div style="width: 120px; height: 68px; background: #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px;">
                ${this.formatTime(time)}
            </div>
        `;
    }
    
    hideSeekingPopup() {
        this.seekingPopup.style.display = 'none';
    }
    
    showFileSelectionModal(availableFiles) {
        this.fileSelectionOptions.innerHTML = '';
        
        availableFiles.forEach((file, index) => {
            const option = document.createElement('div');
            option.className = 'file-selection-option';
            option.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">${file.type} • ${file.size}</div>
                </div>
                <button class="btn btn-primary select-file-btn" data-index="${index}">Select</button>
            `;
            
            option.querySelector('.select-file-btn').addEventListener('click', () => {
                this.selectFileFromModal(index);
            });
            
            this.fileSelectionOptions.appendChild(option);
        });
        
        this.fileSelectionModal.style.display = 'flex';
    }
    
    hideFileSelectionModal() {
        this.fileSelectionModal.style.display = 'none';
    }
    
    selectFileFromModal(index) {
        this.hideFileSelectionModal();
        this.selectFile(index);
    }
    
    setupControlsAutoHide() {
        let controlsTimer;
        const showControls = () => {
            this.videoControls.style.opacity = '1';
            clearTimeout(controlsTimer);
            controlsTimer = setTimeout(() => {
                if (!this.videoElement.paused) {
                    this.videoControls.style.opacity = '0';
                }
            }, 3000);
        };
        
        this.videoPlayer.addEventListener('mousemove', showControls);
        this.videoPlayer.addEventListener('mouseleave', () => {
            if (!this.videoElement.paused) {
                this.videoControls.style.opacity = '0';
            }
        });
        
        // Show controls when paused
        this.videoElement.addEventListener('pause', () => {
            this.videoControls.style.opacity = '1';
        });
    }
    
    skipBackward() {
        if (this.currentFileIndex === -1) return;
        
        const currentTime = this.videoElement.currentTime;
        const newTime = Math.max(0, currentTime - 10);
        
        this.socket.emit('playback-control', {
            action: 'seek',
            videoIndex: this.currentFileIndex,
            time: newTime
        });
    }
    
    skipForward() {
        if (this.currentFileIndex === -1 || !this.videoElement.duration) return;
        
        const currentTime = this.videoElement.currentTime;
        const newTime = Math.min(this.videoElement.duration, currentTime + 10);
        
        this.socket.emit('playback-control', {
            action: 'seek',
            videoIndex: this.currentFileIndex,
            time: newTime
        });
    }

    connectSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
            this.updateStatus('Connected to SyncWave server');
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
            this.updateStatus('Disconnected from server');
        });

        // Server-authoritative sync commands
        this.socket.on('sync-command', (data) => {
            this.handleSyncCommand(data);
        });

        this.socket.on('member-joined', (data) => {
            this.updateMemberCount(data.memberCount);
            this.updateStatus('New member joined the room');
        });

        this.socket.on('member-left', (data) => {
            this.updateMemberCount(data.memberCount);
            if (data.newHost === this.socket.id) {
                this.isHost = true;
                this.hostIndicator.style.display = 'inline-block';
                this.updateStatus('You are now the host');
            }
        });

        this.socket.on('files-updated', (data) => {
            this.updateFiles(data);
        });
        
        this.socket.on('download-source-updated', (data) => {
            this.updateDownloadSource(data.fileIndex, data.downloadSource);
        });
        
        this.socket.on('torrent-uploaded', (data) => {
            this.updateTorrentFile(data.fileIndex, data.torrentData, data.torrentFileName);
        });
        
        this.socket.on('sync-started', (data) => {
            this.updateStatus('Sync started! All clients will sync to selected files.');
        });
    }

    createRoom() {
        const roomId = this.generateRoomId();
        this.joinRoom(roomId);
    }

    joinRoom(roomId = null) {
        if (!roomId) {
            roomId = this.roomIdInput.value.trim().toUpperCase();
        }

        if (!roomId) {
            this.showError('Please enter a room ID');
            return;
        }

        this.updateStatus('Joining room...');

        this.socket.emit('join-room', roomId, (response) => {
            if (response.success) {
                this.currentRoom = roomId;
                this.isHost = response.isHost;
                this.showPlayerSection();
                this.updateRoomInfo(roomId, response.roomState.memberCount);
                this.updateStatus(`Joined room ${roomId} as ${this.isHost ? 'host' : 'member'}`);
                
                // Update URL without page reload
                window.history.pushState({}, '', `/room/${roomId}`);
            } else {
                this.showError('Failed to join room');
            }
        });
    }

    generateRoomId() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    showPlayerSection() {
        this.roomSection.style.display = 'none';
        this.playerSection.style.display = 'flex';
        this.shareRoomBtn.style.display = 'block';
        this.roomInfo.style.display = 'flex';
        
        if (this.isHost) {
            this.hostIndicator.style.display = 'inline-block';
        }
    }

    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        console.log('Files selected:', files);
        
        if (files.length === 0) {
            this.showError('No files selected');
            return;
        }

        files.forEach(file => this.addFile(file));
        this.fileInput.value = '';
    }

    addFile(file) {
        console.log('Adding file:', file);
        
        if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
            this.showError(`Invalid file type: ${file.type}. Please select video or audio files.`);
            return;
        }

        const fileUrl = URL.createObjectURL(file);
        const fileData = {
            name: file.name.replace(/\.[^/.]+$/, ""),
            fileName: file.name,
            type: file.type.startsWith('video/') ? 'video' : 'audio',
            size: this.formatFileSize(file.size)
        };

        // Store local file URL
        this.localFiles.set(file.name, fileUrl);

        // Send file metadata to server
        if (this.currentRoom && this.socket.connected) {
            console.log('Sending file metadata to server...');
            this.socket.emit('add-file', fileData);
        }

        this.updateStatus(`Added "${fileData.name}" to available files`);
    }

    updateFiles(data) {
        console.log('Received files update:', data);
        this.files = data.files || [];
        this.updateFileCards();
    }

    updateFileCards() {
        console.log('Updating file cards, files count:', this.files.length);
        
        if (this.files.length === 0) {
            this.fileCards.innerHTML = `
                <div class="no-files">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" fill="currentColor"/>
                    </svg>
                    <p>No files uploaded</p>
                    <p>Upload videos to start watching together</p>
                </div>
            `;
            this.fileCount.textContent = '0 files';
            return;
        }

        const cardsHTML = this.files.map((file, index) => {
            const isAvailable = this.localFiles.has(file.fileName);
            const isActive = index === this.currentFileIndex;
            
            const avatarsHTML = file.availableFor.map(memberId => {
                const isYou = memberId === this.socket.id;
                const initial = memberId.substring(0, 1).toUpperCase();
                return `<div class="user-avatar ${isYou ? 'you-tag' : ''}" title="${isYou ? 'You' : 'Member'}">${isYou ? 'You' : initial}</div>`;
            }).join('');

            return `
                <div class="file-card ${isActive ? 'active' : ''} ${!isAvailable ? 'missing' : ''}" data-index="${index}">
                    <div class="file-card-header">
                        <div class="file-info">
                            <div class="file-name">${file.name} ${!isAvailable ? '(Not on your device)' : ''}</div>
                            <div class="file-meta">
                                <span>${file.type}</span>
                                <span>${file.size}</span>
                            </div>
                        </div>
                        <div class="file-icon">📹</div>
                    </div>
                    <div class="availability">
                        <div class="availability-title">Available for (${file.availableFor.length}):</div>
                        <div class="user-avatars">
                            ${avatarsHTML}
                        </div>
                        ${!isAvailable ? '<div class="select-hint">Click to select - others will sync with you</div>' : ''}
                    </div>
                        <div class="file-download-info">
                            <div class="download-source">
                                <label>Download Source:</label>
                                <textarea class="download-source-input" placeholder="Where did you download this file? (e.g., YouTube, Netflix, etc.)" data-file-index="${index}" rows="2"></textarea>
                            </div>
                            <div class="torrent-upload">
                                <label>Torrent File:</label>
                                <input type="file" class="torrent-file-input" accept=".torrent" data-file-index="${index}">
                                <button class="upload-torrent-btn" data-file-index="${index}">Upload Torrent</button>
                            </div>
                        </div>
                </div>
            `;
        }).join('');

        this.fileCards.innerHTML = cardsHTML;
        this.fileCount.textContent = `${this.files.length} file${this.files.length !== 1 ? 's' : ''}`;
        
        // Show sync button if there are files available
        const hasAvailableFiles = this.files.some(file => this.localFiles.has(file.fileName));
        this.selectSyncBtn.style.display = hasAvailableFiles ? 'flex' : 'none';

        // Add click listeners
        this.fileCards.querySelectorAll('.file-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on input fields or buttons
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                
                const index = parseInt(card.dataset.index);
                // Allow selection regardless of local availability
                // Each client will play what they have
                this.selectFile(index);
            });
        });
        
        // Add event listeners for download info and torrent upload
        this.fileCards.querySelectorAll('.download-source-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const fileIndex = parseInt(e.target.dataset.fileIndex);
                const source = e.target.value;
                console.log(`Download source for file ${fileIndex}: ${source}`);
                
                // Send download source to server to share with other clients
                this.socket.emit('update-download-source', {
                    fileIndex: fileIndex,
                    downloadSource: source
                });
            });
        });
        
        this.fileCards.querySelectorAll('.torrent-file-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const fileIndex = parseInt(e.target.dataset.fileIndex);
                const file = e.target.files[0];
                if (file) {
                    console.log(`Torrent file uploaded for file ${fileIndex}:`, file.name);
                    
                    // Read the torrent file and send to server
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const torrentData = event.target.result;
                        this.socket.emit('upload-torrent', {
                            fileIndex: fileIndex,
                            torrentData: torrentData,
                            torrentFileName: file.name
                        });
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
        
        this.fileCards.querySelectorAll('.upload-torrent-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileIndex = parseInt(e.target.dataset.fileIndex);
                const torrentInput = document.querySelector(`.torrent-file-input[data-file-index="${fileIndex}"]`);
                torrentInput.click();
            });
        });
    }

    selectFile(index) {
        if (index < 0 || index >= this.files.length) return;
        
        const file = this.files[index];
        console.log('Selecting file:', file.name);
        
        // Send playback control to server (don't check if file exists locally)
        // Let each client try to play whatever they have
        this.socket.emit('playback-control', {
            action: 'load-video',
            videoIndex: index,
            videoName: file.name,
            fileName: file.fileName,
            time: 0
        });
    }

    togglePlayPause() {
        if (this.currentFileIndex === -1 || this.files.length === 0) {
            this.showError('No file selected');
            return;
        }

        const action = this.isPlaying ? 'pause' : 'play';
        
        this.socket.emit('playback-control', {
            action: action,
            videoIndex: this.currentFileIndex,
            time: this.videoElement.currentTime
        });
    }


    handleSyncCommand(data) {
        console.log('Received sync command:', data);
        
        // Show sync status
        this.showSyncStatus();
        
        // Calculate delay until execution
        const delay = Math.max(0, data.executeAt - Date.now());
        
        setTimeout(() => {
            this.executeSyncCommand(data);
            this.hideSyncStatus();
        }, delay);
    }

    executeSyncCommand(data) {
        this.isSyncing = true;
        
        switch (data.action) {
            case 'play':
                this.syncPlay(data);
                break;
            case 'pause':
                this.syncPause(data);
                break;
            case 'seek':
                this.syncSeek(data);
                break;
            case 'load-video':
                this.syncLoadVideo(data);
                break;
        }
        
        this.isSyncing = false;
    }

    syncPlay(data) {
        if (data.videoIndex !== undefined && data.videoIndex !== this.currentFileIndex) {
            this.loadLocalVideo(data.videoIndex);
        }
        
        // Apply sync offset
        const adjustedTime = Math.max(0, (data.time || 0) + this.syncOffset);
        this.videoElement.currentTime = adjustedTime;
        this.videoElement.play().catch(e => console.warn('Play failed:', e));
        this.isPlaying = true;
        this.updatePlayPauseButton();
    }

    syncPause(data) {
        if (data.videoIndex !== undefined && data.videoIndex !== this.currentFileIndex) {
            this.loadLocalVideo(data.videoIndex);
        }
        
        // Apply sync offset
        const adjustedTime = Math.max(0, (data.time || 0) + this.syncOffset);
        this.videoElement.currentTime = adjustedTime;
        this.videoElement.pause();
        this.isPlaying = false;
        this.updatePlayPauseButton();
    }

    syncSeek(data) {
        if (data.videoIndex !== undefined && data.videoIndex !== this.currentFileIndex) {
            this.loadLocalVideo(data.videoIndex);
        }
        
        // Apply sync offset
        const adjustedTime = Math.max(0, data.time + this.syncOffset);
        this.videoElement.currentTime = adjustedTime;
    }

    syncLoadVideo(data) {
        if (data.videoIndex !== undefined) {
            this.loadLocalVideo(data.videoIndex);
        }
    }

    loadLocalVideo(index) {
        if (index < 0 || index >= this.files.length) return;
        
        const file = this.files[index];
        const localUrl = this.localFiles.get(file.fileName);
        
        // Try to find any local file if exact match not found
        let videoUrl = localUrl;
        if (!videoUrl && this.localFiles.size > 0) {
            // If the exact file isn't available, use the first available local file
            const availableFiles = Array.from(this.localFiles.entries());
            if (availableFiles.length > 0) {
                videoUrl = availableFiles[0][1];
                console.log(`Exact file not found, playing: ${availableFiles[0][0]} instead of ${file.fileName}`);
            }
        }
        
        // Always update the current file index and video info to show the selected file
        this.currentFileIndex = index;
        this.updateVideoInfo(file);
        this.updateFileCards();
        
        if (!videoUrl) {
            console.warn(`No local video files available`);
            this.showVideoOverlay();
            return;
        }
        
        this.videoElement.src = videoUrl;
        this.videoElement.load();
        this.hideVideoOverlay();
    }

    updatePlayPauseButton() {
        const playIcon = this.playPauseBtn.querySelector('.play-icon');
        const pauseIcon = this.playPauseBtn.querySelector('.pause-icon');
        
        if (this.isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    updateProgress() {
        if (this.isSyncing) return;
        
        const currentTime = this.videoElement.currentTime;
        const duration = this.videoElement.duration || 0;
        const progress = duration ? (currentTime / duration) * 100 : 0;
        
        this.progressFill.style.width = `${progress}%`;
        this.progressHandle.style.left = `${progress}%`;
        this.currentTime.textContent = this.formatTime(currentTime);
    }

    updateVideoInfo(file = null) {
        if (file) {
            this.videoTitle.textContent = file.name;
            this.videoDetails.textContent = `${file.type} • ${file.size}`;
        } else if (this.currentFileIndex >= 0 && this.files[this.currentFileIndex]) {
            const currentFile = this.files[this.currentFileIndex];
            this.videoTitle.textContent = currentFile.name;
            this.videoDetails.textContent = `${currentFile.type} • ${currentFile.size}`;
        }
        
        const duration = this.videoElement.duration || 0;
        this.totalTime.textContent = this.formatTime(duration);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.videoPlayer.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    showSyncStatus() {
        this.syncStatus.style.display = 'block';
    }

    hideSyncStatus() {
        this.syncStatus.style.display = 'none';
    }

    hideVideoOverlay() {
        this.videoOverlay.style.display = 'none';
    }

    showVideoOverlay() {
        this.videoOverlay.style.display = 'flex';
    }

    handleVideoEnd() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        // Auto-play next video if available
        if (this.currentFileIndex < this.files.length - 1) {
            setTimeout(() => {
                this.selectFile(this.currentFileIndex + 1);
            }, 1000);
        }
    }

    // Rest of the methods remain similar...
    updateRoomInfo(roomId, memberCount) {
        this.currentRoomId.textContent = roomId;
        this.memberCount.textContent = memberCount;
    }

    updateMemberCount(count) {
        this.memberCount.textContent = count;
    }

    showShareModal() {
        const shareUrl = `${window.location.origin}/room/${this.currentRoom}`;
        this.shareLink.value = shareUrl;
        this.shareCode.value = this.currentRoom;
        this.shareModal.style.display = 'flex';
    }

    hideShareModal() {
        this.shareModal.style.display = 'none';
    }

    async copyShareLink() {
        try {
            await navigator.clipboard.writeText(this.shareLink.value);
            this.copyLinkBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.copyLinkBtn.textContent = 'Copy Link';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
            this.shareLink.select();
            document.execCommand('copy');
            this.copyLinkBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.copyLinkBtn.textContent = 'Copy Link';
            }, 2000);
        }
    }
    
    async copyShareCode() {
        try {
            await navigator.clipboard.writeText(this.shareCode.value);
            this.copyCodeBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.copyCodeBtn.textContent = 'Copy Code';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
            this.shareCode.select();
            document.execCommand('copy');
            this.copyCodeBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.copyCodeBtn.textContent = 'Copy Code';
            }, 2000);
        }
    }
    
    showSyncSelectionModal() {
        this.syncFileOptions.innerHTML = '';
        this.selectedFiles = [];
        
        // Show only files that are available locally
        const availableFiles = this.files.filter((file, index) => this.localFiles.has(file.fileName));
        
        availableFiles.forEach((file, index) => {
            const option = document.createElement('div');
            option.className = 'sync-file-option';
            option.innerHTML = `
                <label class="sync-file-checkbox">
                    <input type="checkbox" class="file-checkbox" data-file-index="${index}">
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">${file.type} • ${file.size}</div>
                    </div>
                </label>
            `;
            
            option.querySelector('.file-checkbox').addEventListener('change', (e) => {
                this.updateSelectedFiles();
            });
            
            this.syncFileOptions.appendChild(option);
        });
        
        this.syncSelectionModal.style.display = 'flex';
    }
    
    hideSyncSelectionModal() {
        this.syncSelectionModal.style.display = 'none';
    }
    
    updateSelectedFiles() {
        const checkboxes = this.syncFileOptions.querySelectorAll('.file-checkbox');
        this.selectedFiles = [];
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                this.selectedFiles.push(parseInt(checkbox.dataset.fileIndex));
            }
        });
        
        this.startSyncBtn.disabled = this.selectedFiles.length === 0;
        this.syncStatus.textContent = this.selectedFiles.length > 0 
            ? `Selected ${this.selectedFiles.length} file(s) - Ready to sync!`
            : 'Select files to start syncing';
    }
    
    startSync() {
        if (this.selectedFiles.length === 0) return;
        
        // Send sync request to server
        this.socket.emit('start-sync', {
            selectedFiles: this.selectedFiles
        });
        
        this.hideSyncSelectionModal();
        this.updateStatus('Sync started! All clients will sync to selected files.');
    }
    
    updateDownloadSource(fileIndex, downloadSource) {
        const input = this.fileCards.querySelector(`[data-file-index="${fileIndex}"]`);
        if (input) {
            input.value = downloadSource;
        }
    }
    
    updateTorrentFile(fileIndex, torrentData, torrentFileName) {
        // Update the torrent file display for other clients
        const fileCard = this.fileCards.querySelector(`[data-index="${fileIndex}"]`);
        if (fileCard) {
            let torrentSection = fileCard.querySelector('.torrent-download');
            if (!torrentSection) {
                torrentSection = document.createElement('div');
                torrentSection.className = 'torrent-download';
                fileCard.querySelector('.torrent-upload').appendChild(torrentSection);
            }
            torrentSection.innerHTML = `<a href="${torrentData}" download="${torrentFileName}">Download Torrent</a>`;
        }
    }

    handleURLRoomId() {
        const path = window.location.pathname;
        const roomMatch = path.match(/^\/room\/([A-Z0-9]{6})$/);
        if (roomMatch) {
            const roomId = roomMatch[1];
            this.roomIdInput.value = roomId;
            setTimeout(() => {
                this.joinRoom(roomId);
            }, 1000);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds === 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    updateStatus(message) {
        console.log('Status:', message);
        this.statusText.textContent = message;
        setTimeout(() => {
            this.statusText.textContent = 'Ready to stream';
        }, 3000);
    }

    updateConnectionStatus(connected) {
        const indicator = this.connectionIndicator;
        const dot = indicator.querySelector('.indicator-dot');
        const text = indicator.querySelector('span');

        if (connected) {
            dot.classList.remove('disconnected');
            dot.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            dot.classList.remove('connected');
            dot.classList.add('disconnected');
            text.textContent = 'Disconnected';
        }
    }

    showError(message) {
        console.error('Error:', message);
        this.updateStatus(`Error: ${message}`);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing SyncWave with server-authoritative sync...');
    window.syncWave = new SyncWave();
});