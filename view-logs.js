import fs from 'fs';
import path from 'path';

// Simple log viewer script focused on prompt changes
const logFile = path.join(process.cwd(), 'activity.log');

function viewLogs() {
    console.log('📋 StoryForge Activity Log Viewer');
    console.log('=' + '='.repeat(50));
    
    try {
        if (!fs.existsSync(logFile)) {
            console.log('❌ No activity log found yet. Use the app to generate some activity!');
            return;
        }
        
        const logContent = fs.readFileSync(logFile, 'utf8');
        const lines = logContent.split('\n').filter(line => line.trim());
        
        if (lines.length <= 1) {
            console.log('📄 Log file exists but no activity recorded yet.');
            return;
        }
        
        console.log(`📊 Found ${lines.length - 1} log entries\n`);
        
        // Show recent entries (last 20)
        const recentEntries = lines.slice(-20);
        
        console.log('🔍 Recent Activity:');
        console.log('-'.repeat(80));
        
        recentEntries.forEach((line, index) => {
            if (line.trim() && !line.startsWith('===')) {
                // Highlight prompt-related entries
                if (line.includes('PROMPT_')) {
                    console.log(`🎯 ${line}`);
                } else if (line.includes('GENERATION_')) {
                    console.log(`🚀 ${line}`);
                } else if (line.includes('NAVIGATION')) {
                    console.log(`📍 ${line}`);
                } else {
                    console.log(`📝 ${line}`);
                }
            }
        });
        
        console.log('\n' + '='.repeat(80));
        
        // Show prompt-specific summary
        const promptLines = lines.filter(line => line.includes('PROMPT_'));
        if (promptLines.length > 0) {
            console.log(`\n🎯 PROMPT ACTIVITY SUMMARY (${promptLines.length} entries):`);
            console.log('-'.repeat(50));
            promptLines.forEach(line => {
                console.log(`   ${line}`);
            });
        }
        
        console.log(`\n💡 Full log available at: ${logFile}`);
        
    } catch (error) {
        console.error('❌ Error reading log file:', error.message);
    }
}

// Show help
function showHelp() {
    console.log(`
📋 StoryForge Log Viewer

Usage: node view-logs.js [option]

Options:
  (no args)  - Show recent activity
  --help     - Show this help
  --all      - Show all logs
  --prompts  - Show only prompt-related activity
  --clear    - Clear the log file

Examples:
  node view-logs.js
  node view-logs.js --prompts
  node view-logs.js --clear
`);
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case '--help':
        showHelp();
        break;
    case '--all':
        viewLogs();
        break;
    case '--prompts':
        console.log('🎯 Showing only prompt-related activity...');
        try {
            const logContent = fs.readFileSync(logFile, 'utf8');
            const promptLines = logContent.split('\n').filter(line => line.includes('PROMPT_'));
            console.log('='.repeat(80));
            promptLines.forEach(line => {
                if (line.trim()) console.log(line);
            });
            console.log('='.repeat(80));
            console.log(`Found ${promptLines.length} prompt-related entries`);
        } catch (error) {
            console.error('❌ Error reading log file:', error.message);
        }
        break;
    case '--clear':
        try {
            fs.writeFileSync(logFile, '=== StoryForge Activity Log ===\n\n');
            console.log('✅ Log file cleared');
        } catch (error) {
            console.error('❌ Error clearing log file:', error.message);
        }
        break;
    default:
        viewLogs();
} 