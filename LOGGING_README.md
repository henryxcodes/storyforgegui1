# 📋 StoryForge Activity Logging

A simple, lightweight logging system that tracks user activity in your StoryForge application.

## 🎯 What It Tracks

**The system focuses on PROMPT CHANGES** (your main interest) plus basic activity:

### 📝 Prompt Activity
- **Prompt Loading**: When default or custom prompts are loaded
- **Prompt Saving**: When users save custom prompts
- **Prompt Changes**: Detailed analysis of what changed (word count, type of edit, etc.)
- **Prompt Switching**: Between default and custom prompts

### 🚀 Other Activity
- Story generations (start/success/failure)
- Navigation between steps
- Audio generations
- Story saves to database

## 📊 What You Get

### For Prompt Changes:
- **Change Type**: `CREATED`, `MODIFIED`, `MAJOR_REWRITE`, `SIGNIFICANT_EDIT`, etc.
- **Word Count Analysis**: Before/after word counts and differences
- **Change Summary**: "Major rewrite (+150 words)", "Minor changes (+5 words)", etc.
- **Content Analysis**: Detects system prompts, placeholders, prompt length categories
- **Significance Rating**: Whether the change is considered significant

### Example Log Entry:
```
[2025-01-07T10:30:15.123Z] PROMPT_SAVE: Custom prompt saved | Data: {
  "changeType": "SIGNIFICANT_EDIT",
  "summary": "Significant changes (+47 words)",
  "wordCount": { "old": 234, "new": 281, "diff": 47 },
  "significantChange": true,
  "hasSystemPrompt": true,
  "lengthCategory": "MEDIUM"
}
```

## 🔧 How to Use

### View Logs:
```bash
# View recent activity
node view-logs.js

# View only prompt-related activity (your main interest)
node view-logs.js --prompts

# View all logs
node view-logs.js --all

# Clear log file
node view-logs.js --clear
```

### Log File Location:
- **File**: `activity.log` (in project root)
- **Format**: Plain text with timestamps
- **Size**: Automatically managed, no cleanup needed

## 🎨 Log Categories

When viewing logs, entries are color-coded:
- 🎯 **PROMPT_** - Prompt-related activity (your focus)
- 🚀 **GENERATION_** - Story generation activity
- 📍 **NAVIGATION** - Step navigation
- 📝 **Other** - General activity

## 🛠️ Technical Details

### Server-Side Logging:
- Tracks story saves, audio generations
- Logs to `activity.log` file
- Uses ES modules, lightweight

### Client-Side Logging:
- Tracks prompt changes, navigation, generation starts
- Stores in localStorage (backup)
- Also logs to console for debugging

### Privacy:
- **No prompt content** is logged (only metadata)
- **No personal data** is stored
- **No external services** used
- All logs stay on your machine

## 🚀 Quick Start

1. Use your StoryForge app normally
2. Change prompts, generate stories, navigate around
3. Check logs: `node view-logs.js --prompts`
4. Focus on prompt changes as needed

## 🔍 Prompt Change Analysis

The system automatically detects:
- **Major rewrites** (200+ word changes)
- **Significant edits** (50+ word changes)
- **Minor changes** (10+ word changes)
- **Small edits** (under 10 words)

Plus content analysis:
- System prompt detection
- User story placeholder detection
- Prompt length categorization (SHORT/MEDIUM/LONG)

Perfect for understanding how users interact with and modify your prompts! 