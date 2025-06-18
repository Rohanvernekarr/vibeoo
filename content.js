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
              <h3>Video Summary & Timestamps</h3>
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
      const videoData = await this.extractVideoData();
      
      try {
        // Show loading state
        summaryContent.innerHTML = `
          <div class="loading">
            <div class="spinner"></div>
            <p>Analyzing video content and extracting timestamps...</p>
          </div>
        `;

        console.log('Sending video data to background script:', videoData);

        // Send message to background script
        const response = await chrome.runtime.sendMessage({
          action: 'summarizeVideo',
          videoData: videoData
        });

        console.log('Received response from background script:', response);

        if (response.success) {
          this.displaySummary(response.data);
        } else {
          throw new Error(response.error || 'Unknown error occurred');
        }
      } catch (error) {
        console.error('Error in generateSummary:', error);
        summaryContent.innerHTML = `
          <div class="error">
            <p>Error generating summary: ${error.message}</p>
            <p>Please check the browser console for more details.</p>
            <button onclick="location.reload()" class="retry-btn">Try Again</button>
          </div>
        `;
      }
    }
  
    async extractVideoData() {
      const title = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent || '';
      const description = document.querySelector('#description-text')?.textContent || '';
      const duration = document.querySelector('.ytp-time-duration')?.textContent || '';
      const channelName = document.querySelector('#channel-name a')?.textContent || '';
      
      // Extract actual video transcript from the page
      const transcript = await this.extractVideoTranscript();
      
      return {
        videoId: this.currentVideoId,
        title: title.trim(),
        description: description.trim(),
        duration: duration,
        channelName: channelName.trim(),
        url: window.location.href,
        transcript: transcript
      };
    }
  
    async extractVideoTranscript() {
      let transcript = '';
      
      // First, try to open the transcript panel if it's not already open
      await this.ensureTranscriptPanelOpen();
      
      // Method 1: Try to get from YouTube's transcript panel (multiple selectors)
      try {
        // Try different transcript panel selectors
        const transcriptSelectors = [
          '#transcript',
          'ytd-transcript-renderer',
          '[data-target-id="transcript"]',
          '.ytd-transcript-renderer',
          '#transcript-container'
        ];
        
        let transcriptPanel = null;
        for (const selector of transcriptSelectors) {
          transcriptPanel = document.querySelector(selector);
          if (transcriptPanel) break;
        }
        
        if (transcriptPanel) {
          // Try different transcript item selectors
          const itemSelectors = [
            '.ytd-transcript-segment-renderer',
            '[data-target-id="transcript-segment"]',
            '.transcript-segment',
            '.ytd-transcript-segment-renderer #content-text'
          ];
          
          let transcriptItems = [];
          for (const selector of itemSelectors) {
            transcriptItems = transcriptPanel.querySelectorAll(selector);
            if (transcriptItems.length > 0) break;
          }
          
          transcriptItems.forEach(item => {
            const timeElement = item.querySelector('[id*="timestamp"], .timestamp, [data-target-id*="timestamp"]');
            const textElement = item.querySelector('[id*="content"], .content, [data-target-id*="content"], #content-text');
            
            if (timeElement && textElement) {
              const time = timeElement.textContent.trim();
              const text = textElement.textContent.trim();
              if (text.length > 0) {
                transcript += `${time} ${text}\n`;
              }
            } else if (textElement) {
              // If no timestamp, just get the text
              const text = textElement.textContent.trim();
              if (text.length > 0) {
                transcript += `${text}\n`;
              }
            }
          });
        }
      } catch (error) {
        console.warn('Could not extract from transcript panel:', error);
      }
      
      // Method 2: Try to get from description and comments
      if (!transcript || transcript.length < 100) {
        try {
          // Get expanded description
          const expandButton = document.querySelector('#expand, [aria-label*="Show more"], .ytd-expandable-video-description-body');
          if (expandButton) {
            expandButton.click();
            // Wait a bit for expansion
            await new Promise(resolve => setTimeout(resolve, 1000));
            const fullDescription = document.querySelector('#description-text, .ytd-video-secondary-info-renderer #description')?.textContent || '';
            if (fullDescription.length > 50) {
              transcript += `\nDescription: ${fullDescription}\n`;
            }
          } else {
            // Try to get description without expansion
            const description = document.querySelector('#description-text, .ytd-video-secondary-info-renderer #description')?.textContent || '';
            if (description.length > 50) {
              transcript += `\nDescription: ${description}\n`;
            }
          }
          
          // Get some comments
          const commentSelectors = [
            '#content-text',
            '.ytd-comment-renderer #content-text',
            '[data-target-id="comment-content"]'
          ];
          
          let comments = [];
          for (const selector of commentSelectors) {
            comments = document.querySelectorAll(selector);
            if (comments.length > 0) break;
          }
          
          let commentText = '';
          comments.forEach((comment, index) => {
            if (index < 5) { // Get first 5 comments
              const text = comment.textContent.trim();
              if (text.length > 10) {
                commentText += text + '\n';
              }
            }
          });
          
          if (commentText.length > 0) {
            transcript += `\nComments: ${commentText}\n`;
          }
        } catch (error) {
          console.warn('Could not extract from description/comments:', error);
        }
      }
      
      // Method 3: Try to get from video metadata and page content
      if (!transcript || transcript.length < 50) {
        try {
          // Get tags from meta tags
          const tags = document.querySelectorAll('meta[property="og:video:tag"], meta[name="keywords"]');
          const tagText = Array.from(tags).map(tag => tag.getAttribute('content')).filter(Boolean).join(', ');
          if (tagText.length > 0) {
            transcript += `\nTags: ${tagText}\n`;
          }
          
          // Get category
          const category = document.querySelector('meta[property="og:video:category"], meta[name="category"]');
          if (category) {
            transcript += `Category: ${category.getAttribute('content')}\n`;
          }
          
          // Get any additional text from the page that might be relevant
          const additionalText = document.querySelector('.ytd-video-primary-info-renderer, .ytd-video-secondary-info-renderer')?.textContent || '';
          if (additionalText.length > 100) {
            transcript += `\nAdditional Info: ${additionalText.substring(0, 500)}\n`;
          }
        } catch (error) {
          console.warn('Could not extract metadata:', error);
        }
      }
      
      console.log('Extracted transcript length:', transcript.length);
      console.log('Transcript preview:', transcript.substring(0, 200));
      return transcript;
    }
  
    async ensureTranscriptPanelOpen() {
      try {
        // Look for the transcript button
        const transcriptButton = document.querySelector('[aria-label*="transcript"], [aria-label*="Transcript"], button[aria-label*="Show transcript"]');
        
        if (transcriptButton) {
          // Check if transcript panel is already open
          const transcriptPanel = document.querySelector('#transcript, ytd-transcript-renderer');
          
          if (!transcriptPanel) {
            console.log('Opening transcript panel...');
            transcriptButton.click();
            // Wait for panel to load
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (error) {
        console.warn('Could not open transcript panel:', error);
      }
    }
  
    displaySummary(data) {
      const summaryContent = document.getElementById('summary-content');
      
      // Add debug information
      const debugInfo = `
        <div class="debug-info" style="background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; font-size: 12px;">
          <strong>Debug Info:</strong><br>
          Transcript Length: ${data.transcriptLength || 0} characters<br>
          Transcript Source: ${data.transcriptSource || 'unknown'}<br>
          Timestamps Found: ${data.timestamps ? data.timestamps.length : 0}<br>
          Processing Time: ${new Date().toLocaleTimeString()}
        </div>
      `;
      
      summaryContent.innerHTML = debugInfo + `
        <div class="summary-container">
          <div class="summary-section">
            <h4>📝 Summary</h4>
            <p>${data.summary || 'Summary not available'}</p>
          </div>

          <div class="summary-section">
            <h4>🎯 Key Points</h4>
            <ul>
              ${(data.keyPoints || []).map(point => `<li>${point}</li>`).join('')}
            </ul>
          </div>

          <div class="summary-section">
            <h4>⏰ Detailed Timestamps</h4>
            <div class="timestamps-list">
              ${(data.detailedTimestamps || []).map(timestamp => `
                <div class="timestamp-item">
                  <span class="timestamp-time">${timestamp.time}</span>
                  <div class="timestamp-content">
                    <strong>${timestamp.title}</strong>
                    <p>${timestamp.description}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="summary-section">
            <h4>📚 Topics Covered</h4>
            <div class="topics-list">
              ${(data.topics || []).map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
            </div>
          </div>

          <div class="summary-section">
            <h4>🏗️ Video Structure</h4>
            <p>${data.videoStructure || 'Structure not available'}</p>
          </div>

          <div class="summary-section">
            <h4>💡 Key Takeaways</h4>
            <ul>
              ${(data.keyTakeaways || []).map(takeaway => `<li>${takeaway}</li>`).join('')}
            </ul>
          </div>

          <div class="summary-section">
            <h4>🎬 Related Videos</h4>
            <div class="related-videos">
              ${(data.relatedVideos || []).map(video => `
                <div class="related-video">
                  <img src="${video.thumbnail}" alt="${video.title}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiB2aWV3Qm94PSIwIDAgMTIwIDkwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iOTAiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4='">
                  <div class="video-info">
                    <h5>${video.title}</h5>
                    <p>${video.channel}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
  
    attachTimestampEvents() {
      // Attach click events to timestamp items
      const timestampItems = document.querySelectorAll('.timestamp-item, .detailed-timestamp-item');
      timestampItems.forEach(item => {
        item.addEventListener('click', () => {
          const time = item.getAttribute('data-time');
          if (time) {
            this.seekToTime(parseInt(time));
          }
        });
      });
    }
  
    seekToTime(seconds) {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = seconds;
        video.play();
      } else {
        // Fallback: try to use YouTube's seek function
        const player = document.querySelector('#movie_player');
        if (player && player.seekTo) {
          player.seekTo(seconds);
        }
      }
    }
  
    parseTimeToSeconds(timeString) {
      const parts = timeString.split(':');
      if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      } else if (parts.length === 3) {
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      }
      return 0;
    }

    getSourceDescription(source) {
      switch (source) {
        case 'captions':
          return 'Video Captions/Transcript';
        case 'description':
          return 'Video Description';
        case 'metadata':
          return 'Video Metadata Only';
        case 'fallback':
          return 'Basic Analysis';
        case 'error':
          return 'API Configuration Error';
        default:
          return 'Unknown Source';
      }
    }
  }
  
  // Initialize when page loads
  new YouTubeSummarizer();