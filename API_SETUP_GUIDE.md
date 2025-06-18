# YouTube API Setup Guide

## 🔧 Fixing the "API keys are not supported" Error

The error you're seeing indicates that your YouTube API key is not properly configured. Here's how to fix it:

### **Step 1: Create a New YouTube API Key**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select an existing one
3. **Enable the YouTube Data API v3**:
   - Go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click on it and press "Enable"

### **Step 2: Create API Credentials**

1. **Go to "APIs & Services" → "Credentials"**
2. **Click "Create Credentials" → "API Key"**
3. **Copy the new API key**

### **Step 3: Configure API Key Restrictions (Recommended)**

1. **Click on your API key** to edit it
2. **Under "Application restrictions"**: Select "HTTP referrers"
3. **Add these referrers**:
   ```
   https://www.youtube.com/*
   https://youtube.com/*
   https://*.youtube.com/*
   ```
4. **Under "API restrictions"**: Select "Restrict key"
5. **Select "YouTube Data API v3"**
6. **Click "Save"**

### **Step 4: Update Your Extension**

1. **Open `background.js`** in your extension folder
2. **Replace the YouTube API key**:
   ```javascript
   YOUTUBE_API_KEY: 'YOUR_NEW_API_KEY_HERE',
   ```
3. **Save the file**

### **Step 5: Reload the Extension**

1. **Go to `chrome://extensions/`**
2. **Find your extension**
3. **Click the refresh/reload button**

### **Step 6: Test the Extension**

1. **Go to any YouTube video**
2. **Click "Summarize Video"**
3. **You should now see proper analysis without API errors**

## 🔍 Alternative: Use Only Gemini API

If you continue having issues with YouTube API, you can modify the extension to use only Gemini API for analysis:

1. **Open `background.js`**
2. **Comment out YouTube API calls** or set them to return empty data
3. **The extension will still work** but with limited content analysis

## 📋 Troubleshooting

### **Common Issues:**

1. **"API keys are not supported"**
   - Solution: Create a new API key following the steps above

2. **"Quota exceeded"**
   - Solution: Wait for quota reset or upgrade your Google Cloud plan

3. **"API not enabled"**
   - Solution: Enable YouTube Data API v3 in Google Cloud Console

4. **"Invalid API key"**
   - Solution: Check that you copied the API key correctly

### **Testing Your API Key:**

You can test your API key by visiting this URL (replace YOUR_API_KEY):
```
https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=YOUR_API_KEY
```

If it returns video data, your API key is working correctly.

## 🎯 Expected Results After Fix

Once the API key is properly configured, you should see:

- ✅ **Full video analysis** based on actual content
- ✅ **Detailed timestamps** with specific descriptions
- ✅ **Relevant key points** extracted from video content
- ✅ **Quality indicators** showing "Full transcript available"
- ✅ **No more API errors**

The extension will then provide the comprehensive video analysis you requested! 