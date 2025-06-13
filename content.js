// content.js - Injects into YouTube pages
class YouTubeSummarizer {
    constructor() {
      this.isInjected = false;
      this.currentVideoId = null;
      this.summaryButton = null;
      this.init();
    }
  
    init() {
      console.log('YouTube Summarizer initializing...'); // Debug log
      
      // Wait for YouTube to load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          console.log('DOM loaded, checking for video...'); // Debug log
          setTimeout(() => this.checkForVideo(), 1000);
        });
      } else {
        console.log('DOM already loaded, checking for video...'); // Debug log
        setTimeout(() => this.checkForVideo(), 1000);
      }
  
      // Listen for navigation changes (YouTube is SPA)
      this.observeUrlChanges();
      
      // Also listen for any dynamic content changes
      this.observePageChanges();
    }
  
    observeUrlChanges() {
      let lastUrl = location.href;
      new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          console.log('URL changed to:', url); // Debug log
          setTimeout(() => this.checkForVideo(), 2000); // Increased delay
        }
      }).observe(document, { subtree: true, childList: true });
    }
  
    observePageChanges() {
      // Watch for YouTube's dynamic content loading
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            // Check if video title or main content has loaded
            const hasVideoTitle = document.querySelector('h1.ytd-video-primary-info-renderer');
            const hasVideoPlayer = document.querySelector('#movie_player');
            
            if (hasVideoTitle && hasVideoPlayer && !this.summaryButton) {
              console.log('Video content detected, injecting button...'); // Debug log
              setTimeout(() => this.checkForVideo(), 500);
            }
          }
        });
      });
  
      // Observe the main content area
      const mainContent = document.querySelector('#content') || document.body;
      observer.observe(mainContent, {
        childList: true,
        subtree: true
      });
    }
  
    checkForVideo() {
      const videoId = this.extractVideoId();
      console.log('Checking for video, ID:', videoId); // Debug log
      if (videoId && videoId !== this.currentVideoId) {
        this.currentVideoId = videoId;
        console.log('New video detected, injecting button'); // Debug log
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
  
      console.log('Attempting to inject button...'); // Debug log
  
      // Multiple strategies to find the right place to inject
      const strategies = [
        // Strategy 1: Modern YouTube layout
        () => document.querySelector('#above-the-fold #top-row'),
        // Strategy 2: Alternative selector
        () => document.querySelector('#primary-inner #above-the-fold'),
        // Strategy 3: Video title area
        () => document.querySelector('#container h1')?.parentElement,
        // Strategy 4: Actions area
        () => document.querySelector('#actions'),
        // Strategy 5: Fallback - any primary content area
        () => document.querySelector('#primary #container')
      ];
  
      let targetElement = null;
      for (const strategy of strategies) {
        try {
          targetElement = strategy();
          if (targetElement) {
            console.log('Found target element using strategy'); // Debug log
            break;
          }
        } catch (e) {
          console.warn('Strategy failed:', e);
        }
      }
  
      if (!targetElement) {
        console.warn('Could not find target element, retrying...'); // Debug log
        // Retry after a longer delay
        setTimeout(() => this.injectSummaryButton(), 2000);
        return;
      }
  
      this.createSummaryButton(targetElement);
    }
  
    createSummaryButton(parentElement) {
      console.log('Creating summary button...'); // Debug log
      
      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.id = 'yt-summarizer-container';
      buttonContainer.style.cssText = `
        margin: 12px 0;
        display: flex;
        align-items: center;
        z-index: 1000;
      `;
      
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
  
      // Try different insertion strategies
      try {
        // Strategy 1: Insert after the element
        parentElement.insertAdjacentElement('afterend', buttonContainer);
      } catch (e) {
        try {
          // Strategy 2: Append to the element
          parentElement.appendChild(buttonContainer);
        } catch (e2) {
          try {
            // Strategy 3: Insert at the beginning
            parentElement.insertAdjacentElement('afterbegin', buttonContainer);
          } catch (e3) {
            console.error('All insertion strategies failed:', e3);
            return;
          }
        }
      }
  
      this.summaryButton = buttonContainer;
      console.log('Button created and inserted successfully!'); // Debug log
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