# YouTube Video Summarizer & Timestamps Extension

A powerful Chrome extension that summarizes YouTube videos and provides clickable timestamps for efficient viewing using Gemini AI and YouTube API.

## Features

- 🎯 **AI-Powered Summaries**: Generate comprehensive video summaries using Google's Gemini AI
- ⏰ **Smart Timestamps**: Extract and display clickable timestamps from video content
- 🔑 **Key Points**: Get main takeaways and important moments from videos
- 🎬 **Related Videos**: Discover related content automatically
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🌙 **Dark Mode Support**: Automatic dark mode detection
- 🖱️ **Click-to-Seek**: Click any timestamp to jump to that moment in the video

## Setup Instructions

### 1. Get API Keys

#### Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

#### YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the YouTube Data API v3
4. Go to "Credentials" and create an API key
5. Copy the generated API key

### 2. Configure the Extension

1. Open `config.js` in the extension folder
2. Replace the placeholder values with your actual API keys:
   ```javascript
   GEMINI_API_KEY: 'your_actual_gemini_api_key_here',
   YOUTUBE_API_KEY: 'your_actual_youtube_api_key_here',
   ```

### 3. Install the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the folder containing the extension files
5. The extension should now appear in your extensions list

### 4. Usage

1. Navigate to any YouTube video
2. Look for the "Summarize Video" button below the video title
3. Click the button to generate a summary
4. View the summary, key points, and timestamps
5. Click any timestamp to jump to that moment in the video

## File Structure

```
vibeoo/
├── manifest.json          # Extension configuration
├── config.js             # API keys and settings
├── background.js         # Service worker for API calls
├── content.js           # Content script for YouTube integration
├── styles.css           # Extension styling
├── icons/               # Extension icons
│   └── icon1.png
└── README.md            # This file
```

## Features in Detail

### AI Summary Generation
- Uses Gemini AI to analyze video content
- Provides concise summaries and key takeaways
- Identifies main topics and themes
- Handles various video types and languages

### Timestamp Extraction
- Automatically extracts timestamps from video transcripts
- Filters and deduplicates timestamps
- Provides clickable navigation to specific moments
- Highlights important timestamps with descriptions

### Related Videos
- Finds related content using YouTube API
- Displays thumbnails and channel information
- Direct links to related videos

### User Interface
- Modern, responsive design
- Smooth animations and transitions
- Dark mode support
- Mobile-friendly layout

## API Usage

### Gemini API
- Used for generating video summaries
- Processes video transcripts and descriptions
- Generates structured JSON responses
- Handles fallback scenarios gracefully

### YouTube API
- Fetches video metadata and descriptions
- Retrieves video captions/transcripts
- Searches for related videos
- Handles API rate limits and errors

## Error Handling

The extension includes comprehensive error handling:
- API key validation
- Network error recovery
- Fallback content generation
- User-friendly error messages
- Retry mechanisms

## Browser Compatibility

- Chrome 88+
- Edge 88+
- Other Chromium-based browsers

## Privacy & Security

- API keys are stored locally in the extension
- No data is sent to third-party servers (except Google APIs)
- All processing happens in the browser
- No user data is collected or stored

## Troubleshooting

### Common Issues

1. **"Error generating summary"**
   - Check your API keys in `config.js`
   - Ensure you have sufficient API quota
   - Verify internet connection

2. **Button not appearing**
   - Refresh the YouTube page
   - Check browser console for errors
   - Ensure extension is enabled

3. **Timestamps not working**
   - Video may not have captions
   - Try refreshing the page
   - Check if video is still available

### API Quota Limits

- **Gemini API**: 15 requests per minute (free tier)
- **YouTube API**: 10,000 requests per day (free tier)

## Contributing

Feel free to contribute to this project by:
- Reporting bugs
- Suggesting new features
- Improving the UI/UX
- Optimizing performance

## License

This project is open source and available under the MIT License.

## Support

For support or questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure your API keys are correctly configured
4. Verify that the video has available captions

---

**Note**: This extension requires valid API keys to function. Make sure to keep your API keys secure and never share them publicly. 