import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SimpleLogger {
    constructor() {
        this.logFile = path.join(__dirname, 'activity.log');
        this.ensureLogFile();
    }

    ensureLogFile() {
        if (!fs.existsSync(this.logFile)) {
            fs.writeFileSync(this.logFile, '=== StoryForge Activity Log ===\n\n');
        }
    }

    log(type, message, data = null) {
        const timestamp = new Date().toISOString();
        let logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        
        if (data) {
            logEntry += ` | Data: ${JSON.stringify(data)}`;
        }
        
        logEntry += '\n';
        
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    // Log navigation/location changes
    logNavigation(step, stepName) {
        this.log('NAVIGATION', `User moved to step ${step} (${stepName})`);
    }

    // Log story generations
    logGeneration(prompt, wordCount) {
        this.log('GENERATION', `Story generated with ${wordCount} words`, {
            promptLength: prompt.length,
            promptPreview: prompt.substring(0, 100) + '...'
        });
    }

    // Log prompt changes with detailed tracking
    logPromptChange(oldPrompt, newPrompt, changeType = 'MODIFIED') {
        const changes = this.analyzePromptChanges(oldPrompt, newPrompt);
        
        this.log('PROMPT_CHANGE', `Prompt ${changeType.toLowerCase()}`, {
            changeType,
            oldLength: oldPrompt.length,
            newLength: newPrompt.length,
            changed: oldPrompt !== newPrompt,
            lengthDiff: newPrompt.length - oldPrompt.length,
            ...changes
        });
    }
    
    // Analyze what specifically changed in the prompt
    analyzePromptChanges(oldPrompt, newPrompt) {
        if (!oldPrompt && newPrompt) {
            return { changeType: 'CREATED', summary: 'New prompt created' };
        }
        
        if (oldPrompt && !newPrompt) {
            return { changeType: 'DELETED', summary: 'Prompt deleted' };
        }
        
        if (oldPrompt === newPrompt) {
            return { changeType: 'NO_CHANGE', summary: 'No changes detected' };
        }
        
        // Rough analysis of changes
        const oldWords = oldPrompt.split(/\s+/).length;
        const newWords = newPrompt.split(/\s+/).length;
        const wordDiff = newWords - oldWords;
        
        let summary = '';
        if (Math.abs(wordDiff) > 100) {
            summary = `Major rewrite (${wordDiff > 0 ? '+' : ''}${wordDiff} words)`;
        } else if (Math.abs(wordDiff) > 20) {
            summary = `Significant changes (${wordDiff > 0 ? '+' : ''}${wordDiff} words)`;
        } else if (Math.abs(wordDiff) > 5) {
            summary = `Minor changes (${wordDiff > 0 ? '+' : ''}${wordDiff} words)`;
        } else {
            summary = `Small edits (${wordDiff > 0 ? '+' : ''}${wordDiff} words)`;
        }
        
        return {
            changeType: 'MODIFIED',
            summary,
            wordCount: { old: oldWords, new: newWords, diff: wordDiff },
            significantChange: Math.abs(wordDiff) > 20
        };
    }
    
    // Log prompt loading/selection
    logPromptLoad(promptType, promptSource) {
        this.log('PROMPT_LOAD', `Prompt loaded: ${promptType}`, {
            promptType,
            source: promptSource,
            timestamp: new Date().toISOString()
        });
    }

    // Log audio generation
    logAudioGeneration(provider, duration) {
        this.log('AUDIO', `Audio generated with ${provider}`, {
            provider,
            duration: duration || 'unknown'
        });
    }

    // Log story saves
    logStorySave(wordCount, hasAudio) {
        this.log('SAVE', `Story saved to database`, {
            wordCount,
            hasAudio
        });
    }

    // Log general activity
    logActivity(action, details) {
        this.log('ACTIVITY', action, details);
    }
}

export default new SimpleLogger(); 