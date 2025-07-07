# 🎤 Fish Audio Voiceover Guide

This guide explains how to use the Fish Audio integration to generate voiceovers for your Claude-generated stories.

## 🚀 Quick Start

### 1. Fish Audio API Key Setup
**Option A: Use Hardcoded Key (Easiest)**
- The system has a hardcoded Fish Audio API key for testing
- Just use the `-v` flag - no additional setup needed!

**Option B: Use Your Own Key**
1. Visit [Fish Audio](https://fish.audio/)
2. Sign up for an account
3. Get your API key from the dashboard
4. Either:
   - Set environment variable: `export FISH_API_KEY="your_api_key_here"`
   - Or use `--fish-key "your_key"` in commands
   - Or replace the hardcoded key in `fish-audio.ts`

### 2. Basic Voiceover Generation

```bash
# Generate story with voiceover
npm run generate -- -p "My sister stole my wedding dress" -v

# Interactive mode with voiceover
npm run generate -- -i -v

# Save both story and audio to files
npm run generate -- -i -o my_story.txt -v
```

## 🎛️ Advanced Options

### Voice Models
Fish Audio offers several voice models:
- `speech-1.6` (default) - High quality, balanced
- `speech-1.5` - Good quality, faster
- `s1` - Premium model
- `s1-mini` - Lightweight model

```bash
npm run generate -- -p "Story prompt" -v --voice-model speech-1.5
```

### Audio Formats
Supported formats:
- `mp3` (default) - Good compression, widely supported
- `wav` - Uncompressed, high quality
- `opus` - Modern codec, excellent compression

```bash
npm run generate -- -p "Story prompt" -v --audio-format wav
```

### Speech Speed
Adjust speaking speed (0.5x to 2.0x):
- `0.5` - Very slow
- `1.0` - Normal speed (default)
- `1.2` - Slightly faster
- `1.5` - Fast
- `2.0` - Very fast

```bash
npm run generate -- -p "Story prompt" -v --speech-speed 1.2
```

## 📋 Complete Example

```bash
# Full workflow with all options
npm run generate -- \
  -i \
  -o "revenge_story.txt" \
  -v \
  --fish-key "your_fish_api_key" \
  --voice-model "speech-1.6" \
  --audio-format "mp3" \
  --speech-speed 1.1
```

This will:
1. Start interactive mode for story input
2. Generate a RAG-enhanced story using Claude
3. Save the story to `revenge_story.txt`
4. Generate voiceover using Fish Audio
5. Save audio to `revenge_story_voiceover.mp3`

## 🎯 Features

### Smart Text Processing
- **Long Text Handling**: Automatically splits long stories into chunks
- **Sentence Boundary Detection**: Splits at natural sentence breaks
- **Audio Concatenation**: Combines chunks into single audio file

### Quality Optimization
- **Chunk Size**: Optimal 2000-character chunks for best quality
- **Pause Handling**: Natural pauses between sentences
- **Error Recovery**: Continues processing if individual chunks fail

### File Management
- **Auto-naming**: Generates timestamped filenames
- **Output Directory**: Creates `./output/` folder automatically
- **Cleanup**: Removes temporary chunk files after processing

## 🔧 Troubleshooting

### Common Issues

**"Invalid Fish Audio API key"**
```bash
# Set environment variable
export FISH_API_KEY="your_actual_api_key"

# Or pass directly
npm run generate -- -p "Story" -v --fish-key "your_api_key"
```

**"Insufficient credits"**
- Check your Fish Audio account balance
- Long stories consume more credits
- Consider shorter prompts or chunked processing

**"Rate limit exceeded"**
- Wait a few minutes before retrying
- Fish Audio has rate limits for API calls
- Consider upgrading your Fish Audio plan

### Performance Tips

**For Long Stories (8000+ words):**
```bash
# Use faster model for long content
npm run generate -- -p "Long story prompt" -v --voice-model speech-1.5

# Increase speech speed to reduce file size
npm run generate -- -p "Long story prompt" -v --speech-speed 1.3
```

**For High Quality:**
```bash
# Use premium model with WAV format
npm run generate -- -p "Story prompt" -v --voice-model s1 --audio-format wav
```

## 📊 Output Information

The CLI provides detailed information about generated audio:

```
🎉 Voiceover generation completed in 45.2s!
🎵 Audio file: /path/to/output/voiceover_2024-01-15T10-30-45-123Z.mp3
📊 File size: 12.34 MB
⏱️  Duration: ~8 minutes
🎚️  Format: MP3
```

## 🎬 Workflow Integration

### Story + Voiceover Pipeline
1. **Interactive Input**: Type your story prompt
2. **RAG Enhancement**: System finds relevant examples from Data.txt
3. **Claude Generation**: Creates 6000-8000 word story
4. **Text Processing**: Splits into optimal chunks
5. **Voice Synthesis**: Generates high-quality audio
6. **File Output**: Saves both text and audio files

### Batch Processing
```bash
# Process multiple prompts
for prompt in "Story 1" "Story 2" "Story 3"; do
  npm run generate -- -p "$prompt" -v -o "story_$(date +%s).txt"
done
```

## 🌟 Best Practices

1. **API Key Security**: Use environment variables, not command-line arguments
2. **File Organization**: Use the `-o` option to organize output files
3. **Quality vs Speed**: Choose appropriate models based on your needs
4. **Credit Management**: Monitor your Fish Audio usage for long stories
5. **Format Selection**: Use MP3 for sharing, WAV for editing

## 🔗 Related Links

- [Fish Audio Documentation](https://docs.fish.audio/)
- [Fish Audio Playground](https://fish.audio/playground)
- [Voice Model Comparison](https://fish.audio/models)

---

**Need Help?** Check the main CLI help with `npm run generate -- --help` 