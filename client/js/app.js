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
        this.selectedFileIndex = -1; // Currently selected file index
        this.syncOffset = 0; // Sync offset in seconds
        
        // Subtitle properties
        this.fileSubtitles = {}; // Store parsed subtitles by file index
        this.subtitleDisplay = null; // Subtitle display element
        this.subtitleText = null; // Subtitle text element
        this.subtitleInterval = null; // Subtitle tracking interval
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectSocket();
        this.updateSyncOffsetDisplay();
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
        this.shareCode = document.getElementById('shareCode');
        this.copyCodeBtn = document.getElementById('copyCodeBtn');
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

        // Sync offset elements
        this.syncOffsetMinus = document.getElementById('syncOffsetMinus');
        this.syncOffsetPlus = document.getElementById('syncOffsetPlus');
        this.syncOffsetDisplay = document.getElementById('syncOffsetDisplay');
        
        // Subtitle elements
        this.subtitleDisplay = document.getElementById('subtitleDisplay');
        this.subtitleText = document.getElementById('subtitleText');
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
        this.copyCodeBtn.addEventListener('click', () => this.copyShareCode());
        this.copyLinkBtn.addEventListener('click', () => this.copyShareLink());
        this.shareModal.addEventListener('click', (e) => {
            if (e.target === this.shareModal) this.hideShareModal();
        });

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
        
        // Create bound functions to ensure proper cleanup
        const boundHandleProgressDrag = this.handleProgressDrag.bind(this);
        const boundMouseMoveHandler = (e) => boundHandleProgressDrag(e, true);
        const boundTouchMoveHandler = (e) => {
            e.preventDefault();
            boundHandleProgressDrag(e.touches[0], true);
        };
        
        const startDragging = (e) => {
            isDragging = true;
            this.handleProgressDrag(e, true); // Pass true to indicate dragging
            document.addEventListener('mousemove', boundMouseMoveHandler);
            document.addEventListener('mouseup', stopDragging);
            e.preventDefault();
        };
        
        const startTouchDragging = (e) => {
            isDragging = true;
            this.handleProgressDrag(e.touches[0], true); // Pass true to indicate dragging
            document.addEventListener('touchmove', boundTouchMoveHandler, { passive: false });
            document.addEventListener('touchend', stopDragging);
            e.preventDefault();
        };
        
        const stopDragging = () => {
            isDragging = false;
            document.removeEventListener('mousemove', boundMouseMoveHandler);
            document.removeEventListener('mouseup', stopDragging);
            document.removeEventListener('touchmove', boundTouchMoveHandler);
            document.removeEventListener('touchend', stopDragging);
        };
        
        // Mouse events for desktop
        progressBarContainer.addEventListener('mousedown', startDragging);
        progressBarContainer.addEventListener('click', (e) => {
            if (!isDragging) {
                this.handleProgressDrag(e, false); // Pass false to indicate click
            }
        });
        
        // Touch events for mobile
        progressBarContainer.addEventListener('touchstart', startTouchDragging, { passive: false });
        progressBarContainer.addEventListener('touchend', (e) => {
            if (!isDragging) {
                e.preventDefault();
                this.handleProgressDrag(e.changedTouches[0], false); // Pass false to indicate tap
            }
        });
        
        // Prevent default touch behaviors that might interfere
        progressBarContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }
    
    handleProgressDrag(event, isDragging = false) {
        if (this.currentFileIndex === -1 || !this.videoElement.duration || this.isSyncing) return;
        
        const rect = this.progressBar.parentElement.getBoundingClientRect();
        
        // Handle both mouse and touch events
        let clientX;
        if (event.touches && event.touches[0]) {
            // Touch event
            clientX = event.touches[0].clientX;
        } else if (event.changedTouches && event.changedTouches[0]) {
            // Touch end event
            clientX = event.changedTouches[0].clientX;
        } else {
            // Mouse event
            clientX = event.clientX;
        }
        
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const time = percent * this.videoElement.duration;
        
        // Update UI immediately for responsiveness
        this.progressFill.style.width = `${percent * 100}%`;
        this.progressHandle.style.left = `${percent * 100}%`;
        this.currentTime.textContent = this.formatTime(time);
        
        // Only send seek command if we're actually dragging or clicking/tapping
        // This prevents unnecessary seeks when just moving the mouse
        if (isDragging || event.type === 'click' || event.type === 'touchend') {
            // Add a small delay for mobile to ensure smooth seeking
            if (event.type === 'touchend') {
                setTimeout(() => {
                    this.socket.emit('playback-control', {
                        action: 'seek',
                        videoIndex: this.currentFileIndex,
                        time: time + this.syncOffset
                    });
                }, 50);
            } else {
                this.socket.emit('playback-control', {
                    action: 'seek',
                    videoIndex: this.currentFileIndex,
                    time: time + this.syncOffset
                });
            }
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
            time: newTime + this.syncOffset
        });
    }
    
    skipForward() {
        if (this.currentFileIndex === -1 || !this.videoElement.duration) return;
        
        const currentTime = this.videoElement.currentTime;
        const newTime = Math.min(this.videoElement.duration, currentTime + 10);
        
        this.socket.emit('playback-control', {
            action: 'seek',
            videoIndex: this.currentFileIndex,
            time: newTime + this.syncOffset
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
        
        this.socket.on('play-permission-granted', () => {
            console.log('Play permission granted - enabling play button');
            this.enablePlayButton();
            const action = this.isPlaying ? 'pause' : 'play';
            this.socket.emit('playback-control', {
                action: action,
                videoIndex: this.currentFileIndex,
                time: this.videoElement.currentTime + this.syncOffset
            });
        });
        
        this.socket.on('play-permission-denied', () => {
            console.log('Play permission denied - waiting for all clients to select files');
            this.updateStatus('Waiting for everyone to select a file');
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
                
                // Process existing files in the room
                if (response.roomState.playlist && response.roomState.playlist.length > 0) {
                    console.log('Received existing files from room:', response.roomState.playlist);
                    this.files = response.roomState.playlist;
                    this.updateFileCards();
                }
                
                // Process existing download sources
                if (response.roomState.downloadSources && Object.keys(response.roomState.downloadSources).length > 0) {
                    console.log('Received existing download sources:', response.roomState.downloadSources);
                    Object.keys(response.roomState.downloadSources).forEach(fileIndex => {
                        const input = this.fileCards.querySelector(`.download-source-input[data-file-index="${fileIndex}"]`);
                        if (input) {
                            input.value = response.roomState.downloadSources[fileIndex];
                        }
                    });
                }
                
                // Process existing torrent files
                if (response.roomState.torrentFiles && Object.keys(response.roomState.torrentFiles).length > 0) {
                    console.log('Received existing torrent files:', response.roomState.torrentFiles);
                    Object.keys(response.roomState.torrentFiles).forEach(fileIndex => {
                        const torrentData = response.roomState.torrentFiles[fileIndex];
                        const div = this.fileCards.querySelector(`.torrent-download[data-file-index="${fileIndex}"]`);
                        if (div && torrentData.torrentData) {
                            // Convert base64 to binary
                            const binaryString = atob(torrentData.torrentData.split(',')[1]); // Remove data:application/x-bittorrent;base64, prefix
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            
                            // Create download link
                            const blob = new Blob([bytes], { type: 'application/x-bittorrent' });
                            const url = URL.createObjectURL(blob);
                            div.innerHTML = `
                                <a href="${url}" download="${torrentData.torrentFileName}" class="torrent-download-link">
                                    📥 Download ${torrentData.torrentFileName}
                                </a>
                            `;
                        }
                    });
                }
                
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
        this.uploadBtn.style.display = 'block';
        
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

    updateDownloadSource(fileIndex, downloadSource) {
        console.log('Updating download source for file', fileIndex, ':', downloadSource);
        const input = this.fileCards.querySelector(`.download-source-input[data-file-index="${fileIndex}"]`);
        if (input) {
            input.value = downloadSource;
        }
    }

    updateTorrentFile(fileIndex, torrentData, torrentFileName) {
        console.log('Updating torrent file for file', fileIndex, ':', torrentFileName);
        const div = this.fileCards.querySelector(`.torrent-download[data-file-index="${fileIndex}"]`);
        if (div && torrentData) {
            // Convert base64 to binary
            const binaryString = atob(torrentData.split(',')[1]); // Remove data:application/x-bittorrent;base64, prefix
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create download link
            const blob = new Blob([bytes], { type: 'application/x-bittorrent' });
            const url = URL.createObjectURL(blob);
            div.innerHTML = `
                <a href="${url}" download="${torrentFileName}" class="torrent-download-link">
                    📥 Download ${torrentFileName}
                </a>
            `;
        }
    }

    updateFileCards() {
        console.log('Updating file cards, files count:', this.files.length);
        
        // Preserve existing data before regenerating cards
        const preservedData = this.preserveFileCardData();
        
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
            const isSelected = this.selectedFileIndex === index;
            
            const avatarsHTML = file.availableFor.map(memberId => {
                const isYou = memberId === this.socket.id;
                const initial = memberId.substring(0, 1).toUpperCase();
                return `<div class="user-avatar ${isYou ? 'you-tag' : ''}" title="${isYou ? 'You' : 'Member'}">${isYou ? 'You' : initial}</div>`;
            }).join('');

            return `
                <div class="file-card ${isActive ? 'active' : ''} ${!isAvailable ? 'missing' : ''} ${isSelected ? 'selected' : ''}" data-index="${index}">
                    <div class="file-card-header">
                        <div class="file-info">
                            <div class="file-name">${file.name} ${!isAvailable ? '(Not on your device)' : ''} ${isSelected ? '✓ SELECTED' : ''}</div>
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
                        ${!isAvailable ? '<div class="select-hint">Upload this file to select it</div>' : '<div class="select-hint">Click to select this file</div>'}
                    </div>
                    
                    <!-- Download source section -->
                    <div class="file-download-info">
                        <div class="download-source">
                            <label>Download Source:</label>
                            <textarea class="download-source-input" placeholder="Paste download links, sources, or instructions here..." data-file-index="${index}"></textarea>
                        </div>
                        
                        <!-- Torrent upload section -->
                        <div class="torrent-upload">
                            <label>Upload Torrent File:</label>
                            <div class="torrent-upload-controls">
                                <input type="file" class="torrent-file-input" accept=".torrent" data-file-index="${index}" style="display: none;">
                                <button class="upload-torrent-btn" data-file-index="${index}">Choose Torrent File</button>
                                <div class="torrent-download" data-file-index="${index}"></div>
                            </div>
                        </div>
                        
                        <!-- Subtitle upload section -->
                        <div class="subtitle-upload">
                            <label>Upload Subtitle:</label>
                            <div class="subtitle-upload-controls">
                                <input type="file" class="subtitle-file-input" accept=".srt,.vtt,.ass,.ssa" data-file-index="${index}" style="display: none;">
                                <button class="upload-subtitle-btn" data-file-index="${index}">Choose Subtitle File</button>
                                <div class="subtitle-info" data-file-index="${index}"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.fileCards.innerHTML = cardsHTML;
        this.fileCount.textContent = `${this.files.length} file${this.files.length !== 1 ? 's' : ''}`;

        // Restore preserved data
        this.restoreFileCardData(preservedData);

        // Add click listeners
        this.fileCards.querySelectorAll('.file-card').forEach(card => {
            card.addEventListener('click', (e) => {
                console.log('File card clicked:', e.target.tagName, e.target);
                
                // Don't trigger if clicking on input fields or buttons
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'LABEL') {
                    console.log('Click ignored - input/button/textarea/label');
                    return;
                }
                
                const index = parseInt(card.dataset.index);
                const file = this.files[index];
                const isAvailable = this.localFiles.has(file.fileName);
                
                // Only allow selection of locally available files
                if (!isAvailable) {
                    this.updateStatus('File not available locally. Upload the file first.');
                    return;
                }
                
                console.log('Selecting file index:', index);
                this.selectFile(index);
            });
        });

        // Add event listeners for download source and torrent upload
        this.fileCards.querySelectorAll('.download-source-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const fileIndex = parseInt(e.target.dataset.fileIndex);
                const downloadSource = e.target.value;
                console.log('Download source updated for file', fileIndex, ':', downloadSource);
                
                // Broadcast to server
                this.socket.emit('update-download-source', {
                    fileIndex: fileIndex,
                    downloadSource: downloadSource
                });
            });
        });

        this.fileCards.querySelectorAll('.upload-torrent-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileIndex = parseInt(e.target.dataset.fileIndex);
                const torrentInput = this.fileCards.querySelector(`.torrent-file-input[data-file-index="${fileIndex}"]`);
                torrentInput.click();
            });
        });

        this.fileCards.querySelectorAll('.torrent-file-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const fileIndex = parseInt(e.target.dataset.fileIndex);
                const file = e.target.files[0];
                
                if (file) {
                    console.log('Torrent file selected for file', fileIndex, ':', file.name);
                    
                    // Convert to base64 for transmission
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const torrentData = event.target.result;
                        console.log('Emitting torrent upload for file', fileIndex);
                        
                        // Broadcast to server
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

        // Subtitle upload event listeners
        this.fileCards.querySelectorAll('.upload-subtitle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileIndex = parseInt(e.target.dataset.fileIndex);
                const subtitleInput = this.fileCards.querySelector(`.subtitle-file-input[data-file-index="${fileIndex}"]`);
                subtitleInput.click();
            });
        });

        this.fileCards.querySelectorAll('.subtitle-file-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const fileIndex = parseInt(e.target.dataset.fileIndex);
                const file = e.target.files[0];
                
                if (file) {
                    console.log('Subtitle file selected for file', fileIndex, ':', file.name);
                    this.handleSubtitleUpload(fileIndex, file);
                }
            });
        });
    }

    selectFile(index) {
        if (index < 0 || index >= this.files.length) return;
        
        const file = this.files[index];
        const isLocallyAvailable = this.localFiles.has(file.fileName);
        
        console.log('Selecting file:', file.name, 'Locally available:', isLocallyAvailable);
        
        // Set as selected file
        this.selectedFileIndex = index;
        this.currentFileIndex = index;
        this.updateFileCards();
        
        this.updateStatus(`Selected: ${file.name}`);
        
        // Load the video immediately since we only allow locally available files
        if (isLocallyAvailable) {
            console.log('Loading local video:', file.name);
            this.loadLocalVideo(index);
        }
        
        // Notify server about file selection
        console.log('Emitting file-selected to server:', { fileIndex: index, fileName: file.name });
        this.socket.emit('file-selected', {
            fileIndex: index,
            fileName: file.name
        });
    }

    togglePlayPause() {
        if (this.selectedFileIndex === -1) {
            this.updateStatus('Please select a file first');
            return;
        }
        
        if (this.files.length === 0) {
            this.updateStatus('No files available');
            return;
        }

        // Check if all clients have selected files before allowing play/pause
        this.socket.emit('check-play-permission');
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
        
        // Apply sync offset to the received time
        const adjustedTime = Math.max(0, (data.time || 0) - this.syncOffset);
        this.videoElement.currentTime = adjustedTime;
        this.videoElement.play().catch(e => console.warn('Play failed:', e));
        this.isPlaying = true;
        this.updatePlayPauseButton();
        
        // Start subtitle tracking
        this.startSubtitleTracking();
    }

    syncPause(data) {
        if (data.videoIndex !== undefined && data.videoIndex !== this.currentFileIndex) {
            this.loadLocalVideo(data.videoIndex);
        }
        
        // Apply sync offset to the received time
        const adjustedTime = Math.max(0, (data.time || 0) - this.syncOffset);
        this.videoElement.currentTime = adjustedTime;
        this.videoElement.pause();
        this.isPlaying = false;
        this.updatePlayPauseButton();
    }

    syncSeek(data) {
        if (data.videoIndex !== undefined && data.videoIndex !== this.currentFileIndex) {
            this.loadLocalVideo(data.videoIndex);
        }
        
        // Apply sync offset to the received time
        const adjustedTime = Math.max(0, data.time - this.syncOffset);
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
        
        if (!videoUrl) {
            console.warn(`No local video files available`);
            this.showVideoOverlay();
            return;
        }
        
        this.currentFileIndex = index;
        this.videoElement.src = videoUrl;
        this.videoElement.load();
        
        this.updateVideoInfo(file);
        this.updateFileCards();
        this.hideVideoOverlay();
        
        // Start subtitle tracking for the new video
        this.startSubtitleTracking();
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
        this.shareCode.value = this.currentRoom;
        this.shareLink.value = shareUrl;
        this.shareModal.style.display = 'flex';
    }

    hideShareModal() {
        this.shareModal.style.display = 'none';
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

    enablePlayButton() {
        console.log('Enabling play button - making it glow green');
        console.log('Play button element:', this.playPauseBtn);
        
        // Make play button glow green
        this.playPauseBtn.style.boxShadow = '0 0 20px rgba(76, 175, 80, 0.8)';
        this.playPauseBtn.style.borderColor = '#4CAF50';
        this.playPauseBtn.style.background = 'rgba(76, 175, 80, 0.2)';
        
        console.log('Play button styles applied:', {
            boxShadow: this.playPauseBtn.style.boxShadow,
            borderColor: this.playPauseBtn.style.borderColor,
            background: this.playPauseBtn.style.background
        });
        
        // Reset after 3 seconds
        setTimeout(() => {
            this.playPauseBtn.style.boxShadow = '';
            this.playPauseBtn.style.borderColor = '';
            this.playPauseBtn.style.background = '';
        }, 3000);
    }

    updateDownloadSource(fileIndex, downloadSource) {
        const input = this.fileCards.querySelector(`.download-source-input[data-file-index="${fileIndex}"]`);
        if (input) {
            input.value = downloadSource;
        }
    }

    updateTorrentFile(fileIndex, torrentData, torrentFileName) {
        // Update the torrent file display for other clients
        const torrentDownload = this.fileCards.querySelector(`.torrent-download[data-file-index="${fileIndex}"]`);
        if (torrentDownload) {
            // Create a proper download link
            const link = document.createElement('a');
            link.href = torrentData;
            link.download = torrentFileName;
            link.textContent = `Download ${torrentFileName}`;
            link.className = 'torrent-download-link';
            
            torrentDownload.innerHTML = '';
            torrentDownload.appendChild(link);
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

    // Sync offset methods
    adjustSyncOffset(amount) {
        this.syncOffset += amount;
        // Clamp between -10 and 10 seconds
        this.syncOffset = Math.max(-10, Math.min(10, this.syncOffset));
        this.updateSyncOffsetDisplay();
        this.updateStatus(`Sync offset: ${this.syncOffset > 0 ? '+' : ''}${this.syncOffset.toFixed(1)}s`);
    }

    updateSyncOffsetDisplay() {
        this.syncOffsetDisplay.textContent = `${this.syncOffset > 0 ? '+' : ''}${this.syncOffset.toFixed(1)}s`;
    }

    // File card data preservation methods
    preserveFileCardData() {
        const preservedData = {
            downloadSources: {},
            torrentFiles: {},
            subtitleFiles: {}
        };

        // Preserve download sources
        this.fileCards.querySelectorAll('.download-source-input').forEach(input => {
            const fileIndex = parseInt(input.dataset.fileIndex);
            if (input.value.trim()) {
                preservedData.downloadSources[fileIndex] = input.value;
            }
        });

        // Preserve torrent files
        this.fileCards.querySelectorAll('.torrent-download').forEach(div => {
            const fileIndex = parseInt(div.dataset.fileIndex);
            if (div.innerHTML.trim()) {
                preservedData.torrentFiles[fileIndex] = div.innerHTML;
            }
        });

        // Preserve subtitle files
        this.fileCards.querySelectorAll('.upload-subtitle-btn').forEach(btn => {
            const fileIndex = parseInt(btn.dataset.fileIndex);
            if (btn.textContent !== 'Choose Subtitle File' && btn.textContent.includes('📄')) {
                preservedData.subtitleFiles[fileIndex] = {
                    text: btn.textContent,
                    style: btn.style.cssText
                };
            }
        });

        return preservedData;
    }

    restoreFileCardData(preservedData) {
        // Restore download sources
        Object.keys(preservedData.downloadSources).forEach(fileIndex => {
            const input = this.fileCards.querySelector(`.download-source-input[data-file-index="${fileIndex}"]`);
            if (input) {
                input.value = preservedData.downloadSources[fileIndex];
            }
        });

        // Restore torrent files
        Object.keys(preservedData.torrentFiles).forEach(fileIndex => {
            const div = this.fileCards.querySelector(`.torrent-download[data-file-index="${fileIndex}"]`);
            if (div) {
                div.innerHTML = preservedData.torrentFiles[fileIndex];
            }
        });

        // Restore subtitle files
        Object.keys(preservedData.subtitleFiles).forEach(fileIndex => {
            const btn = this.fileCards.querySelector(`.upload-subtitle-btn[data-file-index="${fileIndex}"]`);
            if (btn) {
                btn.textContent = preservedData.subtitleFiles[fileIndex].text;
                btn.style.cssText = preservedData.subtitleFiles[fileIndex].style;
            }
        });
    }

    // Subtitle methods
    handleSubtitleUpload(fileIndex, file) {
        console.log('Handling subtitle upload for file', fileIndex, ':', file.name);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            console.log('Subtitle file content loaded, parsing...');
            
            // Parse subtitle file based on extension
            const subtitles = this.parseSubtitleFile(content, file.name);
            if (subtitles && subtitles.length > 0) {
                this.fileSubtitles[fileIndex] = subtitles;
                console.log('Parsed', subtitles.length, 'subtitle entries for file', fileIndex);
                
                // Update the subtitle button to show filename
                const btn = this.fileCards.querySelector(`.upload-subtitle-btn[data-file-index="${fileIndex}"]`);
                if (btn) {
                    // Truncate filename if too long to keep it on one line
                    const maxLength = 25;
                    const displayName = file.name.length > maxLength 
                        ? file.name.substring(0, maxLength) + '...' 
                        : file.name;
                    btn.textContent = `📄 ${displayName}`;
                    btn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                    btn.style.color = 'white';
                    btn.style.whiteSpace = 'nowrap';
                    btn.style.overflow = 'hidden';
                    btn.style.textOverflow = 'ellipsis';
                }
                
                // Update subtitle info
                const info = this.fileCards.querySelector(`.subtitle-info[data-file-index="${fileIndex}"]`);
                if (info) {
                    info.innerHTML = `<small>Subtitle loaded: ${subtitles.length} entries</small>`;
                }
                
                this.updateStatus(`Subtitle loaded for ${this.files[fileIndex].name}: ${subtitles.length} entries`);
                
                // Start subtitle tracking if this is the current file
                if (fileIndex === this.currentFileIndex) {
                    this.startSubtitleTracking();
                }
            } else {
                this.updateStatus('Failed to parse subtitle file');
            }
        };
        reader.readAsText(file);
    }

    parseSubtitleFile(content, filename) {
        const extension = filename.toLowerCase().split('.').pop();
        console.log('Parsing subtitle file with extension:', extension);
        
        switch (extension) {
            case 'srt':
                return this.parseSRT(content);
            case 'vtt':
                return this.parseVTT(content);
            case 'ass':
            case 'ssa':
                return this.parseASS(content);
            default:
                console.warn('Unsupported subtitle format:', extension);
                return null;
        }
    }

    parseSRT(content) {
        const subtitles = [];
        const blocks = content.trim().split(/\n\s*\n/);
        
        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length >= 3) {
                const index = parseInt(lines[0]);
                const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
                
                if (timeMatch) {
                    const startTime = this.parseSRTTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
                    const endTime = this.parseSRTTime(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
                    const text = lines.slice(2).join('\n').replace(/<[^>]*>/g, ''); // Remove HTML tags
                    
                    subtitles.push({
                        start: startTime,
                        end: endTime,
                        text: text
                    });
                }
            }
        }
        
        return subtitles.sort((a, b) => a.start - b.start);
    }

    parseSRTTime(hours, minutes, seconds, milliseconds) {
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000;
    }

    parseVTT(content) {
        const subtitles = [];
        const lines = content.split('\n');
        let currentSubtitle = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.includes('-->')) {
                const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
                if (timeMatch) {
                    const startTime = this.parseVTTTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
                    const endTime = this.parseVTTTime(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
                    
                    currentSubtitle = {
                        start: startTime,
                        end: endTime,
                        text: ''
                    };
                }
            } else if (currentSubtitle && line && !line.includes('WEBVTT')) {
                currentSubtitle.text += (currentSubtitle.text ? '\n' : '') + line.replace(/<[^>]*>/g, '');
            } else if (currentSubtitle && !line) {
                if (currentSubtitle.text) {
                    subtitles.push(currentSubtitle);
                }
                currentSubtitle = null;
            }
        }
        
        if (currentSubtitle && currentSubtitle.text) {
            subtitles.push(currentSubtitle);
        }
        
        return subtitles.sort((a, b) => a.start - b.start);
    }

    parseVTTTime(hours, minutes, seconds, milliseconds) {
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000;
    }

    parseASS(content) {
        // Basic ASS/SSA parser - simplified version
        const subtitles = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('Dialogue:')) {
                const parts = line.split(',');
                if (parts.length >= 10) {
                    const startTime = this.parseASSTime(parts[1]);
                    const endTime = this.parseASSTime(parts[2]);
                    const text = parts.slice(9).join(',').replace(/\\N/g, '\n').replace(/<[^>]*>/g, '');
                    
                    if (text.trim()) {
                        subtitles.push({
                            start: startTime,
                            end: endTime,
                            text: text.trim()
                        });
                    }
                }
            }
        }
        
        return subtitles.sort((a, b) => a.start - b.start);
    }

    parseASSTime(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            const seconds = parseFloat(parts[2]);
            return hours * 3600 + minutes * 60 + seconds;
        }
        return 0;
    }

    startSubtitleTracking() {
        console.log('Starting subtitle tracking for file', this.currentFileIndex);
        
        // Clear existing interval
        if (this.subtitleInterval) {
            clearInterval(this.subtitleInterval);
        }
        
        // Start tracking
        this.subtitleInterval = setInterval(() => {
            this.updateSubtitleDisplay();
        }, 100); // Update every 100ms for smooth display
    }

    stopSubtitleTracking() {
        console.log('Stopping subtitle tracking');
        if (this.subtitleInterval) {
            clearInterval(this.subtitleInterval);
            this.subtitleInterval = null;
        }
        this.hideSubtitle();
    }

    updateSubtitleDisplay() {
        if (!this.videoElement || !this.subtitleDisplay || !this.subtitleText) return;
        
        const currentTime = this.videoElement.currentTime;
        const subtitles = this.fileSubtitles[this.currentFileIndex];
        
        if (!subtitles || subtitles.length === 0) {
            this.hideSubtitle();
            return;
        }
        
        // Find current subtitle
        const currentSubtitle = subtitles.find(sub => 
            currentTime >= sub.start && currentTime <= sub.end
        );
        
        if (currentSubtitle) {
            this.showSubtitle(currentSubtitle.text);
        } else {
            this.hideSubtitle();
        }
    }

    showSubtitle(text) {
        if (this.subtitleText) {
            this.subtitleText.textContent = text;
            this.subtitleDisplay.style.display = 'block';
        }
    }

    hideSubtitle() {
        if (this.subtitleDisplay) {
            this.subtitleDisplay.style.display = 'none';
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing SyncWave with server-authoritative sync...');
    window.syncWave = new SyncWave();
});