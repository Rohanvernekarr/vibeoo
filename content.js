class YouTubeSummarizer {
    constructor() {
      this.isInjected = false;
      this.currentVideoId = null;
      this.summaryButton = null;
      this.init();
    }
  
    init() {
      // Wait for YouTube to load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.checkForVideo());
      } else {
        this.checkForVideo();
      }
  
      // Listen for navigation changes (YouTube is SPA)
      this.observeUrlChanges();
    }
  
    observeUrlChanges() {
      let lastUrl = location.href;
      new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          setTimeout(() => this.checkForVideo(), 1000); // Delay for YouTube to load
        }
      }).observe(document, { subtree: true, childList: true });
    }
  
    checkForVideo() {
      const videoId = this.extractVideoId();
      if (videoId && videoId !== this.currentVideoId) {
        this.currentVideoId = videoId;
        this.injectSummaryButton();
      }
    }
  
    extractVideoId() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('v');
    }
  
    injectSummaryButton() {
      // Remove existing button if present
      if (this.summaryButton) {
        this.summaryButton.remove();
      }
  
      // Wait for video player controls to load
      const checkForControls = setInterval(() => {
        const controls = document.querySelector('#above-the-fold #top-row');
        if (controls) {
          clearInterval(checkForControls);
          this.createSummaryButton(controls);
        }
      }, 500);
    }
  
    createSummaryButton(parentElement) {
      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.id = 'yt-summarizer-container';
      buttonContainer.innerHTML = `
        <button id="yt-summarizer-btn" class="yt-summarizer-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
          Summarize Video
        </button>
        <div id="yt-summarizer-popup" class="yt-summarizer-popup" style="display: none;">
          <div class="popup-content">
            <div class="popup-header">
              <h3>Video Summary</h3>
              <button id="close-popup" class="close-btn">&times;</button>
            </div>
            <div id="summary-content" class="summary-content">
              <div class="loading">
                <div class="spinner"></div>
                <p>Analyzing video content...</p>
              </div>
            </div>
          </div>
        </div>
      `;
  
      // Insert after video title
      const titleElement = parentElement.querySelector('#container h1');
      if (titleElement) {
        titleElement.parentNode.insertBefore(buttonContainer, titleElement.nextSibling);
      }
  
      this.summaryButton = buttonContainer;
      this.attachEventListeners();
    }
  
    attachEventListeners() {
      const summarizeBtn = document.getElementById('yt-summarizer-btn');
      const popup = document.getElementById('yt-summarizer-popup');
      const closeBtn = document.getElementById('close-popup');
  
      summarizeBtn.addEventListener('click', () => {
        popup.style.display = 'block';
        this.generateSummary();
      });
  
      closeBtn.addEventListener('click', () => {
        popup.style.display = 'none';
      });
  
      // Close popup when clicking outside
      popup.addEventListener('click', (e) => {
        if (e.target === popup) {
          popup.style.display = 'none';
        }
      });
    }
  
    async generateSummary() {
      const summaryContent = document.getElementById('summary-content');
      const videoData = this.extractVideoData();
      
      try {
        // Show loading state
        summaryContent.innerHTML = `
          <div class="loading">
            <div class="spinner"></div>
            <p>Analyzing video content...</p>
          </div>
        `;
  
        // Send message to background script
        const response = await chrome.runtime.sendMessage({
          action: 'summarizeVideo',
          videoData: videoData
        });
  
        if (response.success) {
          this.displaySummary(response.data);
        } else {
          throw new Error(response.error);
        }
      } catch (error) {
        summaryContent.innerHTML = `
          <div class="error">
            <p>Error generating summary: ${error.message}</p>
            <button onclick="location.reload()" class="retry-btn">Try Again</button>
          </div>
        `;
      }
    }
  
    extractVideoData() {
      const title = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent || '';
      const description = document.querySelector('#description-text')?.textContent || '';
      const duration = document.querySelector('.ytp-time-duration')?.textContent || '';
      const channelName = document.querySelector('#channel-name a')?.textContent || '';
      
      return {
        videoId: this.currentVideoId,
        title: title.trim(),
        description: description.trim(),
        duration: duration,
        channelName: channelName.trim(),
        url: window.location.href
      };
    }
  
    displaySummary(data) {
      const summaryContent = document.getElementById('summary-content');
      summaryContent.innerHTML = `
        <div class="summary-section">
          <h4>📋 Summary</h4>
          <p>${data.summary}</p>
        </div>
        
        <div class="summary-section">
          <h4>🔑 Key Points</h4>
          <ul>
            ${data.keyPoints.map(point => `<li>${point}</li>`).join('')}
          </ul>
        </div>
  
        <div class="summary-section">
          <h4>🎯 Related Videos</h4>
          <div class="related-videos">
            ${data.relatedVideos.map(video => `
              <div class="related-video">
                <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
                <div class="video-info">
                  <h5><a href="${video.url}" target="_blank">${video.title}</a></h5>
                  <p class="channel-name">${video.channel}</p>
                  <p class="video-duration">${video.duration}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
  
        <div class="summary-actions">
          <button onclick="navigator.clipboard.writeText(document.querySelector('.summary-section p').textContent)" class="action-btn">
            Copy Summary
          </button>
          <button onclick="window.print()" class="action-btn">
            Export PDF
          </button>
        </div>
      `;
    }
  }
  
  // Initialize when page loads
  new YouTubeSummarizer();