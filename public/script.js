// StoryForge GUI - Interactive Story Generation Interface
class StoryForgeGUI {
    constructor() {
        this.currentStep = 1;
        this.isGenerating = false;
        this.originalStory = '';
        this.storyHistory = [];
        this.storyHistoryIndex = -1;
        this.audioResults = {};
        this.knowledgeStats = null;
        this.editHistory = [];
        this.editIndex = -1;
        
        // Default silence cutting settings
        this.silenceSettings = {
            elevenlabs: {
                removeSilence: true,
                threshold: -40,
                minDuration: 500,
                buffer: 100
            },
            fish: {
                removeSilence: true,
                threshold: -40,
                minDuration: 500,
                buffer: 100
            }
        };
        
        // Initialize default prompt text immediately in constructor
        this.defaultPromptText = `You are a professional YouTube story expander specializing in Reddit-style narratives. Your goal is to expand scripts that are 2-3 minutes long into 75-90 minute long scripts (MINIMUM 14,000 words, target 15,000-16,000 words).

CRITICAL INSTRUCTIONS:
- Study the reference examples above carefully - they show the EXACT style, pacing, and structure expected
- Use the first 200 words of the input story exactly as written, then expand from there, make sure crux of story isnt given away
- Follow the narrative patterns shown in the knowledge base examples
- Maintain the same emotional intensity and detailed storytelling approach
- Include EXTENSIVE character development, deep psychological exploration, and complex plot progression
- Develop multiple subplots and character arcs that interweave naturally
- Build tension through careful pacing, realistic consequences, and layered conflicts
- Create engaging cliffhangers and emotional hooks throughout
- Add rich backstory, detailed world-building, and immersive scene descriptions
- Include meaningful dialogue that reveals character depth and advances the plot
- Explore themes, motivations, and emotional complexity at a deeper level
- Target audience: 15-25 year olds seeking dramatic, relatable, and deeply engaging content

MANDATORY REALISM REQUIREMENTS:
- Characters must behave in psychologically realistic ways with believable motivations
- Include genuine human reactions: hesitation, doubt, conflicted emotions, realistic decision-making
- Show realistic consequences for actions (legal, social, financial, emotional)
- Include mundane details that ground the story in reality (work schedules, financial concerns, family obligations)
- Characters should have realistic flaws, limitations, and inconsistencies
- Dialogue must sound natural and age-appropriate, avoiding overly dramatic or theatrical language
- Include realistic timelines - major life changes don't happen overnight
- Show gradual character development rather than sudden personality shifts
- Include realistic obstacles: bureaucracy, miscommunication, practical limitations
- Characters should research, plan, and sometimes fail in realistic ways
- Include realistic relationship dynamics with complexity, misunderstandings, and gradual trust-building
- Show characters dealing with everyday concerns alongside major plot events
- Include realistic emotional processing time - people need time to process trauma, betrayal, etc.
- Avoid unrealistic coincidences - events should flow logically from character actions
- Include realistic social dynamics, workplace politics, and family complications
- Characters should have realistic knowledge limitations and make believable mistakes
- Show realistic financial constraints and practical considerations affecting decisions
- Include genuine human vulnerabilities and moments of uncertainty

MANDATORY PERSPECTIVE REQUIREMENT:
- The story MUST be told from a MALE perspective (first person "I" narrative)
- If the original story uses a female perspective, adapt it to be from a male narrator's viewpoint
- All experiences, emotions, and situations should be written as if experienced by a male protagonist
- Ensure pronouns, reactions, and character interactions reflect a male narrator throughout

USER PROMPT:
{{STORY_PROMPT}}

Continue writing a unique Reddit-style story targeted at a 15–25-year-old audience. The story must be emotionally engaging, relatable, and designed to hold the viewer's attention all the way through. Use the first 200 words of the input story exactly as written to begin your script. After that, develop the plot with strong character arcs, emotional twists, and moments of suspense or tension that match the tone and pacing of the opening.

CRITICAL WORD COUNT REQUIREMENT - MINIMUM 14,000 WORDS:
This is absolutely mandatory. The story must reach AT LEAST 14,000 words (preferably 15,000-16,000). This is about 90 minutes of spoken content. DO NOT finish early. Keep expanding the narrative until you reach this target.

WORD COUNT CHECKPOINTS:
- At 3,000 words: You should just be establishing the main conflict, DO NOT giveaway the crux of the story here, just build
- At 6,000 words: Character development and subplots should be deepening  
- At 9,000 words: Major plot complications and turning points
- At 12,000 words: Building toward climax with multiple storylines converging
- At 14,000+ words: Resolution and conclusion

IMPORTANT: Do not explain anything—just write the story. Structure it for a social media audience, with immersive pacing and cliffhangers that keep people watching.

FINAL VERIFICATION: Before concluding, ensure the story has reached AT LEAST 14,000 words. If not, continue expanding with additional plot developments, character interactions, and narrative depth.`;
        
        console.log('Default prompt text initialized:', this.defaultPromptText ? 'Success' : 'Failed');
        
        this.init();
    }

    // Simple client-side logging function
    logClientActivity(type, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type,
            message,
            data
        };
        
        // Store in localStorage for persistence
        const logs = JSON.parse(localStorage.getItem('storyforge_logs') || '[]');
        logs.push(logEntry);
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.shift();
        }
        
        localStorage.setItem('storyforge_logs', JSON.stringify(logs));
        
        // Also log to console for debugging
        console.log(`[${timestamp}] ${type}: ${message}`, data || '');
    }
    
    // Analyze prompt changes for detailed tracking
    analyzePromptChanges(oldPrompt, newPrompt) {
        if (!oldPrompt && newPrompt) {
            return { changeType: 'CREATED', summary: 'New prompt created', significantChange: true };
        }
        
        if (oldPrompt && !newPrompt) {
            return { changeType: 'DELETED', summary: 'Prompt deleted', significantChange: true };
        }
        
        if (oldPrompt === newPrompt) {
            return { changeType: 'NO_CHANGE', summary: 'No changes detected', significantChange: false };
        }
        
        // Analyze word count changes
        const oldWords = oldPrompt.split(/\s+/).filter(w => w.length > 0).length;
        const newWords = newPrompt.split(/\s+/).filter(w => w.length > 0).length;
        const wordDiff = newWords - oldWords;
        
        // Detect specific types of changes
        const containsSystemPrompt = newPrompt.toLowerCase().includes('you are a professional') || 
                                   newPrompt.toLowerCase().includes('system:') ||
                                   newPrompt.toLowerCase().includes('instructions:');
        
        const containsUserStory = newPrompt.toLowerCase().includes('{{story_prompt}}') ||
                                newPrompt.toLowerCase().includes('user prompt:');
        
        let summary = '';
        let changeType = 'MODIFIED';
        
        if (Math.abs(wordDiff) > 200) {
            summary = `Major rewrite (${wordDiff > 0 ? '+' : ''}${wordDiff} words)`;
            changeType = 'MAJOR_REWRITE';
        } else if (Math.abs(wordDiff) > 50) {
            summary = `Significant changes (${wordDiff > 0 ? '+' : ''}${wordDiff} words)`;
            changeType = 'SIGNIFICANT_EDIT';
        } else if (Math.abs(wordDiff) > 10) {
            summary = `Minor changes (${wordDiff > 0 ? '+' : ''}${wordDiff} words)`;
            changeType = 'MINOR_EDIT';
        } else {
            summary = `Small edits (${wordDiff > 0 ? '+' : ''}${wordDiff} words)`;
            changeType = 'SMALL_EDIT';
        }
        
        return {
            changeType,
            summary,
            wordCount: { old: oldWords, new: newWords, diff: wordDiff },
            significantChange: Math.abs(wordDiff) > 20,
            hasSystemPrompt: containsSystemPrompt,
            hasUserStoryPlaceholder: containsUserStory,
            lengthCategory: newPrompt.length > 5000 ? 'LONG' : newPrompt.length > 2000 ? 'MEDIUM' : 'SHORT'
        };
    }

    init() {
        this.setupEventListeners();
        this.loadSilenceSettings();
        this.updateSilenceSettingsUI();
        this.setupNotifications();
        this.initAnimations();
        this.setupCharacterCounters();
        this.setupEditHistory();
        this.initBackgroundAnimation();
        this.loadSavedStory();
        this.setupMemoryManagement();
        this.setupPromptEditor();
        this.setupApiKeyManagement();
        
        // Clear any existing custom profile flag on first load to ensure original prompt loads
        localStorage.removeItem('customPromptProfile');
        
        // Force load the original prompt immediately and repeatedly until it sticks
        this.ensureDefaultPromptLoaded();
        
        setTimeout(() => {
            this.ensureDefaultPromptLoaded();
        }, 100);
        
        setTimeout(() => {
            this.ensureDefaultPromptLoaded();
        }, 500);
        
        setTimeout(() => {
            this.ensureDefaultPromptLoaded();
        }, 1000);
        
        // Extra setup for silence cutting button with multiple retries
        this.setupSilenceCuttingButton();
    }
    
    setupSilenceCuttingButton() {
        const attemptSetup = (attemptNum = 1) => {
            console.log(`Attempting to setup silence cutting button (attempt ${attemptNum})`);
            
            const button = document.getElementById('silenceSettingsBtn');
            const modal = document.getElementById('silenceSettingsModal');
            
            console.log('Found button:', button);
            console.log('Found modal:', modal);
            
            if (button && modal) {
                // Remove any existing event listeners first
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // Add fresh event listener
                newButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Silence cutting button clicked!');
                    this.showNotification('🔧 Opening silence settings modal...', 'info', 1500);
                    
                    // Force modal to show
                    modal.style.display = 'block';
                    modal.style.zIndex = '1000';
                    
                    // Update UI
                    this.updateSilenceSettingsUI();
                    
                    console.log('Modal should now be visible');
                    console.log('Modal display:', modal.style.display);
                    console.log('Modal z-index:', modal.style.zIndex);
                });
                
                // Setup modal close functionality
                const closeBtn = modal.querySelector('.close-modal');
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.closeModal();
                    });
                }
                
                // Close modal when clicking outside
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal();
                    }
                });
                
                // Setup save and reset buttons
                const saveBtn = document.getElementById('saveSettingsBtn');
                const resetBtn = document.getElementById('resetSettingsBtn');
                
                if (saveBtn) {
                    saveBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.saveSilenceSettings();
                        this.closeModal();
                    });
                }
                
                if (resetBtn) {
                    resetBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.resetSilenceSettings();
                    });
                }
                
                console.log('✅ Silence cutting button setup completed successfully');
                return true;
            } else {
                console.log(`❌ Button or modal not found (attempt ${attemptNum})`);
                
                if (attemptNum < 5) {
                    setTimeout(() => attemptSetup(attemptNum + 1), 200 * attemptNum);
                } else {
                    console.error('Failed to setup silence cutting button after 5 attempts');
                    this.showNotification('❌ Could not setup silence cutting button', 'error', 3000);
                }
                return false;
            }
        };
        
        // Start setup attempts
        attemptSetup();
    }
    
    initAnimations() {
        // Add smooth animations when elements appear
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);
        
        // Observe all sections and cards
        document.querySelectorAll('.section, .card-section, .audio-section').forEach(el => {
            observer.observe(el);
        });
        
        // Add loading animation class
        this.addLoadingAnimation();
    }
    
    addLoadingAnimation() {
        const generateBtn = document.querySelector('.generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                generateBtn.classList.add('loading-pulse');
                setTimeout(() => {
                    generateBtn.classList.remove('loading-pulse');
                }, 3000);
            });
        }
    }
    
    setupPromptEditor() {
        // Initialize profiles and prompt editor
        this.profiles = {};
        this.currentProfile = 'default';
        
        this.setupPromptEventListeners();
        
        // Ensure default prompt is loaded after a short delay to make sure DOM is ready
        setTimeout(() => {
            this.ensureDefaultPromptLoaded();
        }, 100);
    }
    
    setupPromptEventListeners() {
        // Use a timeout to ensure DOM is fully loaded
        setTimeout(() => {
            // Navigation buttons
            const goToPromptEditorBtn = document.getElementById('goToPromptEditorBtn');
            if (goToPromptEditorBtn) {
                goToPromptEditorBtn.addEventListener('click', () => {
                    this.goToStep(2);
                    // Ensure prompt is loaded when navigating to editor
                    setTimeout(() => this.ensureDefaultPromptLoaded(), 100);
                });
            }
            
            const changeStyleBtn = document.getElementById('changeStyleBtn');
            if (changeStyleBtn) {
                changeStyleBtn.addEventListener('click', () => {
                    this.goToStep(2);
                    // Ensure prompt is loaded when navigating to editor
                    setTimeout(() => this.ensureDefaultPromptLoaded(), 100);
                });
            }
        }, 100);
    }

    // API Key Management Functions
    setupApiKeyManagement() {
        this.apiKeys = {
            anthropic: '',
            elevenlabs: '',
            fish: ''
        };
        
        // Load saved API keys from session storage
        this.loadApiKeys();
        
        // Setup event listeners for API key inputs
        setTimeout(() => {
            this.setupApiKeyEventListeners();
        }, 100);
        
        // Update button states based on current keys
        this.updateVoiceoverButtonStates();
    }
    
    setupApiKeyEventListeners() {
        // Validate keys button
        const validateBtn = document.getElementById('validateKeysBtn');
        if (validateBtn) {
            validateBtn.addEventListener('click', () => {
                this.validateApiKeys();
            });
        }
        
        // Clear keys button
        const clearBtn = document.getElementById('clearKeysBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearApiKeys();
            });
        }
        
        // Toggle visibility buttons
        document.querySelectorAll('.toggle-visibility').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                const icon = btn.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });
        
        // Auto-save keys when typing (with debounce)
        ['anthropicKey', 'elevenlabsKey', 'fishKey'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', this.debounce(() => {
                    this.saveApiKeys();
                    this.updateVoiceoverButtonStates();
                }, 500));
            }
        });
    }
    
    loadApiKeys() {
        try {
            const saved = sessionStorage.getItem('storyforge_api_keys');
            if (saved) {
                this.apiKeys = JSON.parse(saved);
                
                // Populate the input fields
                setTimeout(() => {
                    const anthropicInput = document.getElementById('anthropicKey');
                    const elevenlabsInput = document.getElementById('elevenlabsKey');
                    const fishInput = document.getElementById('fishKey');
                    
                    if (anthropicInput) anthropicInput.value = this.apiKeys.anthropic || '';
                    if (elevenlabsInput) elevenlabsInput.value = this.apiKeys.elevenlabs || '';
                    if (fishInput) fishInput.value = this.apiKeys.fish || '';
                }, 100);
            }
        } catch (error) {
            console.error('Error loading API keys:', error);
        }
    }
    
    saveApiKeys() {
        try {
            // Get current values from inputs
            const anthropicInput = document.getElementById('anthropicKey');
            const elevenlabsInput = document.getElementById('elevenlabsKey');
            const fishInput = document.getElementById('fishKey');
            
            if (anthropicInput) this.apiKeys.anthropic = anthropicInput.value.trim();
            if (elevenlabsInput) this.apiKeys.elevenlabs = elevenlabsInput.value.trim();
            if (fishInput) this.apiKeys.fish = fishInput.value.trim();
            
            // Save to session storage (not localStorage for security)
            sessionStorage.setItem('storyforge_api_keys', JSON.stringify(this.apiKeys));
            
            // Count saved keys
            const savedKeys = [];
            if (this.apiKeys.anthropic) savedKeys.push('Anthropic');
            if (this.apiKeys.elevenlabs) savedKeys.push('ElevenLabs');
            if (this.apiKeys.fish) savedKeys.push('Fish Audio');
            
            // Show notification
            if (savedKeys.length > 0) {
                this.showNotification(`🔑 API keys saved: ${savedKeys.join(', ')}`, 'success', 3000);
            } else {
                this.showNotification('🔑 API keys cleared', 'warning', 3000);
            }
            
            // Trigger server validation for console confirmation
            this.validateKeysForConsoleConfirmation();
            
            this.logClientActivity('API_KEYS', 'API keys updated', {
                hasAnthropic: !!this.apiKeys.anthropic,
                hasElevenlabs: !!this.apiKeys.elevenlabs,
                hasFish: !!this.apiKeys.fish,
                savedKeys: savedKeys
            });
        } catch (error) {
            console.error('Error saving API keys:', error);
            this.showNotification('❌ Error saving API keys: ' + error.message, 'error');
        }
    }
    
    // Silent validation for console confirmation (doesn't show UI messages)
    async validateKeysForConsoleConfirmation() {
        try {
            // Only validate if at least one key is provided
            const hasAnyKey = this.apiKeys.anthropic || this.apiKeys.elevenlabs || this.apiKeys.fish;
            if (!hasAnyKey) return;
            
            await fetch('/validate-api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.apiKeys)
            });
            
            // The server will log the confirmation in the console
            // We don't need to handle the response here as this is just for server-side logging
        } catch (error) {
            // Silent fail - this is just for console confirmation
            console.debug('Console confirmation validation failed:', error);
        }
    }
    
    clearApiKeys() {
        this.apiKeys = { anthropic: '', elevenlabs: '', fish: '' };
        
        // Clear input fields
        const anthropicInput = document.getElementById('anthropicKey');
        const elevenlabsInput = document.getElementById('elevenlabsKey');
        const fishInput = document.getElementById('fishKey');
        
        if (anthropicInput) anthropicInput.value = '';
        if (elevenlabsInput) elevenlabsInput.value = '';
        if (fishInput) fishInput.value = '';
        
        // Clear session storage
        sessionStorage.removeItem('storyforge_api_keys');
        
        // Update status and buttons
        this.showApiKeyStatus('🗑️ All API keys cleared', 'warning');
        this.updateVoiceoverButtonStates();
        
        // Show notification
        this.showNotification('🗑️ All API keys cleared', 'warning', 3000);
        
        this.logClientActivity('API_KEYS', 'All API keys cleared', {});
    }
    
    async validateApiKeys() {
        const statusDiv = document.getElementById('apiKeyStatus');
        this.showApiKeyStatus('🔍 Validating API keys...', 'warning');
        
        // Save current keys
        this.saveApiKeys();
        
        try {
            const response = await fetch('/validate-api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.apiKeys)
            });
            
            const result = await response.json();
            
            if (result.success) {
                const validKeys = Object.values(result.validation).filter(v => v.valid).length;
                const totalKeys = Object.keys(result.validation).length;
                
                this.showApiKeyStatus(
                    `✅ Validation complete: ${validKeys}/${totalKeys} keys are valid`,
                    validKeys === totalKeys ? 'success' : 'warning'
                );
                
                // Update button states
                this.updateVoiceoverButtonStates();
                
                this.logClientActivity('API_KEYS', 'API keys validated', {
                    validKeys,
                    totalKeys,
                    validation: result.validation
                });
            } else {
                this.showApiKeyStatus('❌ Failed to validate API keys', 'error');
            }
        } catch (error) {
            console.error('API key validation error:', error);
            this.showApiKeyStatus('❌ Error validating API keys', 'error');
        }
    }
    
    showApiKeyStatus(message, type) {
        const statusDiv = document.getElementById('apiKeyStatus');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `api-key-status ${type}`;
        }
    }
    
    updateVoiceoverButtonStates() {
        const elevenlabsBtn = document.getElementById('generateElevenLabsBtn');
        const fishBtn = document.getElementById('generateFishAudioBtn');
        const bothBtn = document.getElementById('generateBothBtn');
        
        const hasAnthropic = !!this.apiKeys.anthropic;
        const hasElevenlabs = !!this.apiKeys.elevenlabs;
        const hasFish = !!this.apiKeys.fish;
        
        // ElevenLabs requires both Anthropic and ElevenLabs keys
        if (elevenlabsBtn) {
            elevenlabsBtn.disabled = !(hasAnthropic && hasElevenlabs);
            elevenlabsBtn.title = !(hasAnthropic && hasElevenlabs) ? 
                'Requires Anthropic and ElevenLabs API keys' : '';
        }
        
        // Fish Audio requires both Anthropic and Fish keys
        if (fishBtn) {
            fishBtn.disabled = !(hasAnthropic && hasFish);
            fishBtn.title = !(hasAnthropic && hasFish) ? 
                'Requires Anthropic and Fish Audio API keys' : '';
        }
        
        // Both requires all three keys
        if (bothBtn) {
            bothBtn.disabled = !(hasAnthropic && hasElevenlabs && hasFish);
            bothBtn.title = !(hasAnthropic && hasElevenlabs && hasFish) ? 
                'Requires all three API keys' : '';
        }
    }
    
    getApiKeys() {
        return {
            anthropic_api_key: this.apiKeys.anthropic,
            elevenlabs_api_key: this.apiKeys.elevenlabs,
            fish_api_key: this.apiKeys.fish
        };
    }

    setupEventListeners() {
        setTimeout(() => {
            const backToInputBtn = document.getElementById('backToInputBtn');
            if (backToInputBtn) {
                backToInputBtn.addEventListener('click', () => {
                    this.goToStep(1);
                });
            }
            
            const goToStoryEditorBtn = document.getElementById('goToStoryEditorBtn');
            if (goToStoryEditorBtn) {
                goToStoryEditorBtn.addEventListener('click', () => {
                    this.goToStep(3);
                });
            }
            
            // Simplified prompt editor buttons
            const copyPromptBtn = document.getElementById('copyPromptBtn');
            if (copyPromptBtn) {
                copyPromptBtn.addEventListener('click', () => {
                    console.log('Copy prompt button clicked');
                    this.copyPrompt();
                });
            } else {
                console.error('copyPromptBtn not found');
            }
            
            const savePromptBtn = document.getElementById('savePromptBtn');
            if (savePromptBtn) {
                savePromptBtn.addEventListener('click', () => {
                    console.log('Save prompt button clicked');
                    this.savePrompt();
                });
            } else {
                console.error('savePromptBtn not found');
            }
            
            // Auto-update preview when editing the prompt editor
            const promptEditor = document.getElementById('fullPromptEditor');
            if (promptEditor) {
                // Force load the prompt immediately when setting up the editor
                promptEditor.value = this.defaultPromptText;
                console.log('Force loaded prompt during setup');
                
                promptEditor.addEventListener('input', () => {
                    this.updatePromptLength();
                    
                    // Mark as custom profile when user starts editing
                    const currentValue = promptEditor.value.trim();
                    const isOriginalPrompt = currentValue === this.defaultPromptText.trim();
                    
                    if (!isOriginalPrompt && currentValue.length > 100) {
                        localStorage.setItem('customPromptProfile', 'true');
                        console.log('Marked as custom profile due to editing');
                    }
                });
            }
        }, 100);
    }
    
    // Load appropriate prompt (custom or default)
    ensureDefaultPromptLoaded() {
        const promptEditor = document.getElementById('fullPromptEditor');
        if (promptEditor) {
            const currentValue = promptEditor.value.trim();
            const isCustomProfile = localStorage.getItem('customPromptProfile') === 'true';
            const savedCustomPrompt = localStorage.getItem('customPrompt');
            
            // Check if the current value is just placeholder text
            const isPlaceholderText = currentValue.includes('Your comprehensive story prompt will load here') ||
                                    currentValue.includes('placeholder') ||
                                    currentValue === '' ||
                                    currentValue === 'undefined';
            
            // Load custom prompt if it exists and we're in custom mode, otherwise load default
            if (isCustomProfile && savedCustomPrompt && !isPlaceholderText) {
                promptEditor.value = savedCustomPrompt;
                
                // Log custom prompt loading
                this.logClientActivity('PROMPT_LOAD', 'Custom prompt auto-loaded', {
                    promptType: 'CUSTOM',
                    source: 'localStorage',
                    length: savedCustomPrompt.length,
                    wordCount: savedCustomPrompt.split(/\s+/).filter(w => w.length > 0).length,
                    context: 'auto_load_on_init'
                });
                
                console.log('Auto-loaded custom prompt');
            } else if (this.defaultPromptText && (isPlaceholderText || !isCustomProfile)) {
                promptEditor.value = this.defaultPromptText;
                
                // Log default prompt loading
                this.logClientActivity('PROMPT_LOAD', 'Default prompt auto-loaded', {
                    promptType: 'DEFAULT',
                    source: 'builtin',
                    length: this.defaultPromptText.length,
                    wordCount: this.defaultPromptText.split(/\s+/).filter(w => w.length > 0).length,
                    context: 'auto_load_on_init',
                    reason: !isCustomProfile ? 'custom_disabled' : 'no_custom_found'
                });
                
                console.log('Auto-loaded default prompt');
            }
            
            this.updatePromptLength();
        } else if (!this.defaultPromptText) {
            console.error('Default prompt text is not defined in ensureDefaultPromptLoaded');
        }
    }
    

    

    
    // RAG context is now handled automatically on the backend
    
    buildFullPrompt() {
        const storyPrompt = document.getElementById('storyPrompt').value || "[Your story prompt will appear here]";
        const currentPromptText = document.getElementById('fullPromptEditor').value || '';
        
        // Replace story prompt placeholder (RAG context handled on backend)
        const finalPrompt = currentPromptText.replace(/\{\{STORY_PROMPT\}\}/g, storyPrompt);
        
        return finalPrompt;
    }
    
    updatePromptLength() {
        const fullPrompt = this.buildFullPrompt();
        const length = fullPrompt.length;
        document.getElementById('promptLength').textContent = `${length.toLocaleString()} characters`;
    }
    


    
    // Simplified copy prompt method
    async copyPrompt() {
        const promptText = document.getElementById('fullPromptEditor').value;
        
        if (!promptText.trim()) {
            this.showNotification('⚠️ No prompt text to copy!', 'warning', 3000);
            return;
        }
        
        try {
            await navigator.clipboard.writeText(promptText);
            const charCount = promptText.length;
            this.showNotification(`📋 Prompt copied to clipboard! (${charCount.toLocaleString()} characters)`, 'success', 3000);
            } catch (error) {
            console.error('Error copying prompt:', error);
            this.showNotification('❌ Failed to copy prompt to clipboard', 'error', 3000);
        }
    }
    
    // Save prompt method
    savePrompt() {
        const promptText = document.getElementById('fullPromptEditor').value;
        
        if (!promptText.trim()) {
            this.showNotification('⚠️ No prompt text to save!', 'warning', 3000);
                return;
            }
            
        try {
            // Get the previous prompt for comparison
            const previousPrompt = localStorage.getItem('customPrompt') || '';
            
            // Save to localStorage as custom prompt
            localStorage.setItem('customPrompt', promptText);
            localStorage.setItem('customPromptProfile', 'true');
            
            const charCount = promptText.length;
            
            // Analyze and log the prompt change
            const changes = this.analyzePromptChanges(previousPrompt, promptText);
            this.logClientActivity('PROMPT_SAVE', 'Custom prompt saved', {
                previousLength: previousPrompt.length,
                newLength: charCount,
                wasModified: previousPrompt !== promptText,
                lengthDiff: charCount - previousPrompt.length,
                changeType: changes.changeType,
                summary: changes.summary,
                significantChange: changes.significantChange
            });
            
            this.showNotification(`💾 Prompt saved successfully! (${charCount.toLocaleString()} characters)`, 'success', 3000);
        } catch (error) {
            console.error('Error saving prompt:', error);
            this.logClientActivity('PROMPT_ERROR', 'Failed to save prompt', { error: error.message });
            this.showNotification('❌ Failed to save prompt', 'error', 3000);
        }
    }
    

    

    
    async loadSavedStory() {
        // Clean up expired stories first
        this.cleanupExpiredStories();
        
        try {
            // First try to load from server if we have a storyId
            const storyId = localStorage.getItem('storyId');
            let storyData = null;
            
            if (storyId && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                try {
                    // Try to fetch from server
                    const serverStory = await this.loadStoryFromServer(storyId);
                    if (serverStory && serverStory.story) {
                        storyData = typeof serverStory.story === 'string' ? 
                            JSON.parse(serverStory.story) : serverStory.story;
                    }
                } catch (serverError) {
                    console.error('Failed to load story from server:', serverError);
                    // Fall back to local storage
                }
            }
            
            // If server load failed or we're in local development, try localStorage
            if (!storyData) {
                const savedStory = localStorage.getItem('savedStory');
                if (savedStory) {
                    storyData = JSON.parse(savedStory);
                }
            }
            
            // If we have story data from either source, validate and use it
            if (this.validateStoredData(storyData)) {
                // Calculate time remaining before expiration
                const hoursRemaining = Math.round((storyData.expiresAt - Date.now()) / (60 * 60 * 1000));
                
                // Show notification about loaded story
                this.showNotification(`Loaded your saved story. It will expire in approximately ${hoursRemaining} hours.`);
                
                // If we're on the editor page, populate it
                const editor = document.getElementById('storyEditor');
                if (editor) {
                    editor.value = storyData.content;
                    this.updateStoryMeta(storyData.content);
                }
            }
        } catch (error) {
            console.error('Error loading saved story:', error);
            // If there's an error parsing, remove the corrupted data
            try {
                localStorage.removeItem('savedStory');
                localStorage.removeItem('storyId');
            } catch (storageError) {
                console.error('Failed to remove corrupted data:', storageError);
            }
            // Show user-friendly error message
            this.showNotification('Failed to load saved story. Storage may be corrupted and has been cleared.', 'error');
        }
    }
    
    async loadStoryFromServer(storyId) {
        try {
            // Call the Vercel API endpoint to get the story
            const response = await fetch(`/api/stories?id=${storyId}`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Story loaded from server:', result);
            return result;
        } catch (error) {
            console.error('Failed to load story from server:', error);
            throw error;
        }
    }
    
    setupNotifications() {
        // Setup notification close button
        document.getElementById('notificationClose').addEventListener('click', () => {
            this.hideNotification();
        });
    }
    
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.getElementById('notification');
        const messageEl = document.getElementById('notificationMessage');
        
        // Set the message
        messageEl.textContent = message;
        
        // Remove existing type classes
        notification.classList.remove('notification-error', 'notification-warning', 'notification-success');
        
        // Add type-specific class
        if (type === 'error') {
            notification.classList.add('notification-error');
        } else if (type === 'warning') {
            notification.classList.add('notification-warning');
        } else if (type === 'success') {
            notification.classList.add('notification-success');
        }
        
        // Show the notification
        notification.classList.add('show');
        
        // Auto-hide after duration (longer for errors)
        const actualDuration = type === 'error' ? Math.max(duration, 8000) : duration;
        if (actualDuration > 0) {
            this.notificationTimeout = setTimeout(() => {
                this.hideNotification();
            }, actualDuration);
        }
    }
    
    hideNotification() {
        const notification = document.getElementById('notification');
        notification.classList.remove('show');
        
        // Clear any existing timeout
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
            this.notificationTimeout = null;
        }
    }
    
    loadSilenceSettings() {
        // Load saved settings from localStorage if available
        const savedSettings = localStorage.getItem('silenceSettings');
        if (savedSettings) {
            try {
                this.silenceSettings = JSON.parse(savedSettings);
                console.log('Loaded silence settings:', this.silenceSettings);
            } catch (error) {
                console.error('Error loading silence settings:', error);
                // Remove corrupted data
                try {
                    localStorage.removeItem('silenceSettings');
                } catch (storageError) {
                    console.error('Failed to remove corrupted settings:', storageError);
                }
            }
        }
        
        // Update UI with loaded settings
        setTimeout(() => this.updateSilenceSettingsUI(), 100);
    }
    
    updateSilenceSettingsUI() {
        // Update ElevenLabs settings
        const elevenSettings = this.silenceSettings.elevenlabs;
        document.getElementById('elevenLabsThreshold').value = elevenSettings.threshold;
        document.getElementById('elevenLabsDuration').value = elevenSettings.minDuration;
        document.getElementById('elevenLabsBuffer').value = elevenSettings.buffer;
        
        // Update Fish Audio settings
        const fishSettings = this.silenceSettings.fish;
        document.getElementById('fishThreshold').value = fishSettings.threshold;
        document.getElementById('fishDuration').value = fishSettings.minDuration;
        document.getElementById('fishBuffer').value = fishSettings.buffer;
    }
    
    saveSilenceSettings() {
        // Get current values from UI - removeSilence is always true
        this.silenceSettings.elevenlabs.removeSilence = true;
        this.silenceSettings.elevenlabs.threshold = parseInt(document.getElementById('elevenLabsThreshold').value);
        this.silenceSettings.elevenlabs.minDuration = parseInt(document.getElementById('elevenLabsDuration').value);
        this.silenceSettings.elevenlabs.buffer = parseInt(document.getElementById('elevenLabsBuffer').value);
        
        this.silenceSettings.fish.removeSilence = true;
        this.silenceSettings.fish.threshold = parseInt(document.getElementById('fishThreshold').value);
        this.silenceSettings.fish.minDuration = parseInt(document.getElementById('fishDuration').value);
        this.silenceSettings.fish.buffer = parseInt(document.getElementById('fishBuffer').value);
        
        // Save to localStorage with quota handling
        try {
            localStorage.setItem('silenceSettings', JSON.stringify(this.silenceSettings));
            console.log('Saved silence settings:', this.silenceSettings);
            
            // Show feedback
            const saveBtn = document.getElementById('saveSettingsBtn');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
            saveBtn.classList.add('btn-success');
            
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.classList.remove('btn-success');
            }, 2000);
            
            // Close modal
            this.closeModal();
            
        } catch (error) {
            console.error('Error saving silence settings:', error);
            
            // Handle storage quota exceeded error
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                this.showNotification('Storage quota exceeded. Please clear some browser data and try again.', 'error');
                // Try to free up space by removing expired stories
                this.cleanupExpiredStories();
                this.cleanupAudioResults();
            } else {
                this.showNotification('Failed to save settings: ' + error.message, 'error');
            }
        }
    }
    
    resetSilenceSettings() {
        // Reset to defaults
        this.silenceSettings = {
            elevenlabs: {
                removeSilence: true,
                threshold: -40,
                minDuration: 500,
                buffer: 100
            },
            fish: {
                removeSilence: true,
                threshold: -40,
                minDuration: 500,
                buffer: 100
            }
        };
        
        // Update UI
        this.updateSilenceSettingsUI();
        
        // Save to localStorage
        localStorage.removeItem('silenceSettings');
        console.log('Reset silence settings to defaults');
        
        // Show feedback
        const resetBtn = document.getElementById('resetSettingsBtn');
        const originalText = resetBtn.innerHTML;
        resetBtn.innerHTML = '<i class="fas fa-check"></i> Reset!';
        resetBtn.classList.add('btn-success');
        
        setTimeout(() => {
            resetBtn.innerHTML = originalText;
            resetBtn.classList.remove('btn-success');
        }, 2000);
    }
    
    // Modal functionality
    openModal() {
        const modal = document.getElementById('silenceSettingsModal');
        console.log('Opening modal, element found:', modal);
        console.log('Modal current display style:', modal ? modal.style.display : 'N/A');
        
        if (modal) {
        modal.style.display = 'block';
            this.updateSilenceSettingsUI(); // Update the UI with current values
            console.log('Modal opened successfully, new display style:', modal.style.display);
            this.showNotification('⚙️ Silence settings opened', 'success', 1500);
            
            // Additional debugging - check computed styles
            const computedStyle = window.getComputedStyle(modal);
            console.log('Modal computed display:', computedStyle.display);
            console.log('Modal computed z-index:', computedStyle.zIndex);
            console.log('Modal computed position:', computedStyle.position);
        } else {
            console.error('Modal element not found');
            this.showNotification('❌ Could not open silence settings - modal not found', 'error', 3000);
        }
    }
    
    closeModal() {
        const modal = document.getElementById('silenceSettingsModal');
        console.log('Closing modal, element found:', modal);
        if (modal) {
        modal.style.display = 'none';
            console.log('Modal closed successfully');
            this.showNotification('✅ Silence settings closed', 'success', 1500);
        } else {
            console.error('Modal element not found');
        }
    }
    
    // Initialize the interactive background animation
    initBackgroundAnimation() {
        const bgAnimation = document.getElementById('bgAnimation');
        const particles = [];
        const glows = [];
        
        // Determine animation complexity based on device performance and screen size
        const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isSmallScreen = window.innerWidth < 768;
        const isLowPerformance = isReducedMotion || isSmallScreen;
        
        // Set number of elements based on performance capability
        const particleCount = isLowPerformance ? 3 : 7;
        const glowCount = isLowPerformance ? 2 : 4;
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random size between 50px and 200px
            const size = Math.floor(Math.random() * 150) + 50;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // Random position
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            
            // Random animation delay and duration
            const duration = Math.random() * 10 + 15;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${Math.random() * 5}s`;
            
            // Store reference
            particles.push(particle);
            bgAnimation.appendChild(particle);
        }
        
        // Create glow effects
        for (let i = 0; i < glowCount; i++) {
            const glow = document.createElement('div');
            glow.className = 'glow';
            
            // Random size
            const size = Math.floor(Math.random() * 200) + 200;
            glow.style.width = `${size}px`;
            glow.style.height = `${size}px`;
            
            // Random position
            glow.style.left = `${Math.random() * 100}%`;
            glow.style.top = `${Math.random() * 100}%`;
            
            // Random animation delay
            glow.style.animationDelay = `${Math.random() * 3}s`;
            
            // Store reference
            glows.push(glow);
            bgAnimation.appendChild(glow);
        }
        
        // Create a special glow that follows the mouse
        const mouseGlow = document.createElement('div');
        mouseGlow.className = 'mouse-glow';
        bgAnimation.appendChild(mouseGlow);
        
        // Add mouse interaction effects
        document.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            // Move the mouse glow
            mouseGlow.style.left = `${mouseX - 150}px`;
            mouseGlow.style.top = `${mouseY - 150}px`;
            
            // Skip intensive particle interactions on low-performance devices
            if (!isLowPerformance) {
                // Subtle particle interaction
                particles.forEach((particle, index) => {
                    const particleRect = particle.getBoundingClientRect();
                    const particleX = particleRect.left + particleRect.width / 2;
                    const particleY = particleRect.top + particleRect.height / 2;
                    
                    const dx = mouseX - particleX;
                    const dy = mouseY - particleY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // If mouse is close to particle, add a subtle transform
                    if (distance < 300) {
                        const angle = Math.atan2(dy, dx);
                        const push = 1 - distance / 300; // Closer = stronger push
                        const moveX = Math.cos(angle) * push * -20;
                        const moveY = Math.sin(angle) * push * -20;
                        
                        particle.style.transform = `translate(${moveX}px, ${moveY}px) scale(${1 + push * 0.2})`;
                    } else {
                        particle.style.transform = '';
                    }
                });
            }
        });
        
        // Add click effect
        document.addEventListener('click', (e) => {
            // Skip ripple effect on low-performance devices
            if (isLowPerformance) return;
            
            const clickX = e.clientX;
            const clickY = e.clientY;
            
            // Create ripple effect
            const ripple = document.createElement('div');
            ripple.className = 'ripple';
            ripple.style.left = `${clickX - 50}px`;
            ripple.style.top = `${clickY - 50}px`;
            bgAnimation.appendChild(ripple);
            
            // Remove after animation completes
            setTimeout(() => {
                ripple.remove();
            }, 1000);
        });
        
        // Add resize handler to adjust animation complexity on window resize
        window.addEventListener('resize', this.debounce(() => {
            // Remove all existing elements
            while (bgAnimation.firstChild) {
                bgAnimation.removeChild(bgAnimation.firstChild);
            }
            
            // Reinitialize with new screen size
            this.initBackgroundAnimation();
        }, 250));
    }
    
    // Helper function for debouncing resize events
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Load knowledge base statistics
    async loadKnowledgeStats() {
        try {
            const response = await fetch('/knowledge-stats');
            const data = await response.json();
            
            if (data.success) {
                this.knowledgeStats = data.knowledge_base;
                this.updateKnowledgeDisplay();
            }
        } catch (error) {
            console.error('Error loading knowledge stats:', error);
            // Add error status to action buttons
            const stepSections = document.querySelectorAll('.step-section .action-buttons');
            stepSections.forEach(section => {
                const toolStatus = document.createElement('div');
                toolStatus.className = 'tool-status';
                toolStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i>Tool ready (knowledge base unavailable)`;
                section.appendChild(toolStatus);
            });
        }
    }

    updateKnowledgeDisplay() {
        // Add subtle tool status indicators to each step section
        const stepSections = document.querySelectorAll('.step-section .action-buttons');
        
        if (this.knowledgeStats) {
            stepSections.forEach(section => {
                // Remove any existing tool status
                const existingStatus = section.querySelector('.tool-status');
                if (existingStatus) {
                    existingStatus.remove();
                }
                
                // Create new tool status element
                const toolStatus = document.createElement('div');
                toolStatus.className = 'tool-status';
                toolStatus.innerHTML = `<i class="fas fa-bolt"></i>Ready to generate`;
                
                // Add to the section
                section.appendChild(toolStatus);
            });
        }
    }
    
    setupEventListeners() {
        // Navigation menu
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const step = parseInt(e.target.dataset.step);
                this.goToStep(step);
            });
        });
        
        // Generate story button
                    document.getElementById('generateStoryBtn').addEventListener('click', () => {
                // Auto-detect if we're using a custom prompt
                const isCustomProfile = localStorage.getItem('customPromptProfile') === 'true';
                const customPrompt = document.getElementById('fullPromptEditor').value;
                const useCustomPrompt = isCustomProfile && customPrompt && customPrompt.trim() !== this.defaultPromptText.trim();
                
                this.generateStory(useCustomPrompt);
            });
        
        // Step navigation buttons
        document.getElementById('backToPromptBtn').addEventListener('click', () => this.goToStep(1));
        document.getElementById('clearStoryBtn').addEventListener('click', () => this.clearStory());
        document.getElementById('saveStoryBtn').addEventListener('click', () => this.saveStory());
        document.getElementById('goToVoiceoverBtn').addEventListener('click', () => this.goToVoiceover());
        document.getElementById('backToStoryBtn')?.addEventListener('click', () => this.goToStep(3));
        document.getElementById('proceedToVoiceoverBtn')?.addEventListener('click', () => this.goToStep(4));
        document.getElementById('generateElevenLabsBtn').addEventListener('click', () => this.generateVoiceover('elevenlabs'));
        document.getElementById('generateFishAudioBtn').addEventListener('click', () => this.generateVoiceover('fish'));
        document.getElementById('generateBothBtn').addEventListener('click', () => this.generateVoiceover('both'));
        document.getElementById('startOverBtn').addEventListener('click', () => this.startOver());
        
        // Database functionality
        document.getElementById('saveToStoryDatabaseBtn')?.addEventListener('click', () => this.saveToDatabase());
        document.getElementById('viewDatabaseBtn')?.addEventListener('click', () => this.goToStep(6));

        // Editor functionality
        document.getElementById('storyEditor').addEventListener('input', (e) => this.onStoryEdit(e));
        document.getElementById('undoBtn')?.addEventListener('click', () => this.undo());
        document.getElementById('redoBtn')?.addEventListener('click', () => this.redo());
        document.getElementById('resetBtn')?.addEventListener('click', () => this.resetStory());
        document.getElementById('copyBtn')?.addEventListener('click', () => this.copyToClipboard());

        // Download functionality
        document.getElementById('downloadStoryBtn')?.addEventListener('click', () => this.downloadStory());
        document.getElementById('downloadAudioBtn')?.addEventListener('click', () => this.downloadAudio());
        
        // Silence settings functionality with enhanced setup
        const setupSilenceButton = () => {
            const silenceSettingsBtn = document.getElementById('silenceSettingsBtn');
            console.log('Setting up silence settings button, found element:', silenceSettingsBtn);
            if (silenceSettingsBtn) {
                // Remove any existing listeners first
                silenceSettingsBtn.removeEventListener('click', this.handleSilenceSettingsClick);
                
                // Add new listener
                silenceSettingsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Silence settings button clicked');
                    this.showNotification('🔧 Opening silence settings...', 'info', 2000);
                    this.openModal();
                });
                console.log('Silence settings button event listener attached successfully');
                
                // Test the button immediately
                console.log('Button element details:', {
                    id: silenceSettingsBtn.id,
                    className: silenceSettingsBtn.className,
                    textContent: silenceSettingsBtn.textContent,
                    disabled: silenceSettingsBtn.disabled,
                    style: silenceSettingsBtn.style.cssText
                });
                
                return true;
            } else {
                console.error('silenceSettingsBtn element not found in DOM');
                return false;
            }
        };
        
        // Try to set up the button immediately
        if (!setupSilenceButton()) {
            // If it fails, try again after a short delay
            setTimeout(() => {
                if (!setupSilenceButton()) {
                    console.error('Failed to set up silence settings button after retry');
                }
            }, 500);
        }
        
        // Also add event delegation as a fallback
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'silenceSettingsBtn') {
                e.preventDefault();
                e.stopPropagation();
                console.log('Silence settings button clicked via event delegation');
                this.showNotification('🔧 Opening silence settings...', 'info', 2000);
                this.openModal();
            }
        });
        
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveSilenceSettings();
            });
        }
        
        const resetSettingsBtn = document.getElementById('resetSettingsBtn');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetSilenceSettings();
            });
        }
        
        // Modal close functionality
        const closeModalBtn = document.querySelector('.close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }
        
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('silenceSettingsModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        // Silence removal is always enabled - no checkbox needed
        
        // Input fields for ElevenLabs (replaced sliders with number inputs)
        const elevenLabsThreshold = document.getElementById('elevenLabsThreshold');
        if (elevenLabsThreshold) {
            elevenLabsThreshold.addEventListener('input', (e) => {
                // Just update the value directly since we're using number inputs now
                console.log('ElevenLabs threshold changed to:', e.target.value);
            });
        }
        
        const elevenLabsDuration = document.getElementById('elevenLabsDuration');
        if (elevenLabsDuration) {
            elevenLabsDuration.addEventListener('input', (e) => {
                console.log('ElevenLabs duration changed to:', e.target.value);
            });
        }
        
        const elevenLabsBuffer = document.getElementById('elevenLabsBuffer');
        if (elevenLabsBuffer) {
            elevenLabsBuffer.addEventListener('input', (e) => {
                console.log('ElevenLabs buffer changed to:', e.target.value);
            });
        }
        
        // Input fields for Fish Audio (replaced sliders with number inputs)
        const fishThreshold = document.getElementById('fishThreshold');
        if (fishThreshold) {
            fishThreshold.addEventListener('input', (e) => {
                console.log('Fish threshold changed to:', e.target.value);
            });
        }
        
        const fishDuration = document.getElementById('fishDuration');
        if (fishDuration) {
            fishDuration.addEventListener('input', (e) => {
                console.log('Fish duration changed to:', e.target.value);
            });
        }
        
        const fishBuffer = document.getElementById('fishBuffer');
        if (fishBuffer) {
            fishBuffer.addEventListener('input', (e) => {
                console.log('Fish buffer changed to:', e.target.value);
            });
        }
        
        // Handle radio button selection styling
        document.querySelectorAll('input[name="voiceProvider"]').forEach(radio => {
            radio.addEventListener('change', () => {
                // Remove selected class from all labels
                document.querySelectorAll('.radio-label').forEach(label => {
                    label.classList.remove('radio-selected');
                });
                
                // Add selected class to the current label
                if (radio.checked) {
                    radio.closest('.radio-label').classList.add('radio-selected');
                }
            });
            
            // Set initial state
            if (radio.checked) {
                radio.closest('.radio-label').classList.add('radio-selected');
            }
        });
    }

    setupCharacterCounters() {
        const promptTextarea = document.getElementById('storyPrompt');
        const promptCounter = document.getElementById('promptCharCount');
        
        promptTextarea.addEventListener('input', () => {
            promptCounter.textContent = promptTextarea.value.length;
        });
    }

    setupEditHistory() {
        this.editHistory = [];
        this.editIndex = -1;
    }
    
    setupMemoryManagement() {
        // Clean up audio URLs when the page is about to unload
        window.addEventListener('beforeunload', () => {
            this.cleanupAudioResults();
        });
        
        // Clean up when the page visibility changes (e.g., user switches tabs)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is now hidden, cleanup non-essential data
                this.cleanupExpiredStories();
            }
        });
        
        // Periodic cleanup every 30 minutes
        setInterval(() => {
            this.cleanupExpiredStories();
        }, 30 * 60 * 1000); // 30 minutes
        
        // Clean up when storage gets full
        window.addEventListener('error', (event) => {
            if (event.message && event.message.includes('QuotaExceededError')) {
                console.warn('Storage quota exceeded, performing cleanup...');
                this.cleanupExpiredStories();
                this.cleanupAudioResults();
            }
        });
    }

    addToEditHistory(content) {
        // Remove any future history when adding new content
        this.editHistory = this.editHistory.slice(0, this.editIndex + 1);
        this.editHistory.push(content);
        this.editIndex++;
        
        // Limit history to 50 entries
        if (this.editHistory.length > 50) {
            this.editHistory.shift();
            this.editIndex--;
        }
        
        this.updateEditButtons();
    }

    updateEditButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        undoBtn.disabled = this.editIndex <= 0;
        redoBtn.disabled = this.editIndex >= this.editHistory.length - 1;
    }

    undo() {
        if (this.editIndex > 0) {
            this.editIndex--;
            const content = this.editHistory[this.editIndex];
            document.getElementById('storyEditor').value = content;
            this.updateStoryMeta(content);
            this.updateEditButtons();
        }
    }

    redo() {
        if (this.editIndex < this.editHistory.length - 1) {
            this.editIndex++;
            const content = this.editHistory[this.editIndex];
            document.getElementById('storyEditor').value = content;
            this.updateStoryMeta(content);
            this.updateEditButtons();
        }
    }

    resetStory() {
        const editor = document.getElementById('storyEditor');
        editor.value = this.originalStory;
        this.addToEditHistory(this.originalStory);
        this.updateStoryMeta(this.originalStory);
    }

    clearStory() {
        // Show confirmation dialog
        if (!confirm('⚠️ Are you sure you want to clear the story? This will remove all content and cannot be undone.')) {
            return;
        }

        try {
            // Clear the story editor
            const editor = document.getElementById('storyEditor');
            if (editor) {
                editor.value = '';
                this.editedStory = '';
                this.originalStory = '';
            }

            // Clear edit history
            this.editHistory = [];
            this.editIndex = -1;
            this.updateEditButtons();

            // Clear saved story data
            try {
                localStorage.removeItem('savedStory');
                localStorage.removeItem('storyId');
                sessionStorage.removeItem('tempStory');
            } catch (storageError) {
                console.warn('Failed to clear some storage items:', storageError);
            }

            // Delete from server if we have a story ID
            const storyId = localStorage.getItem('storyId');
            if (storyId) {
                this.deleteStoryFromServer(storyId).catch(error => {
                    console.warn('Failed to delete story from server:', error);
                });
            }

            // Update story metadata
            this.updateStoryMeta('');

            // Clear any audio results
            this.audioResults = {};
            this.cleanupAudioResults();

            // Show success notification
            this.showNotification('🗑️ Story cleared successfully! All content and saved data removed.', 'success', 4000);

            // Log the action
            this.logClientActivity('STORY_CLEAR', 'Story content and data cleared', {
                hadContent: !!editor?.value,
                hadSavedData: !!storyId
            });

            // Visual feedback on the button
            const clearBtn = document.getElementById('clearStoryBtn');
            if (clearBtn) {
                const originalHTML = clearBtn.innerHTML;
                clearBtn.innerHTML = '<i class="fas fa-check"></i> Cleared!';
                clearBtn.disabled = true;
                
                setTimeout(() => {
                    clearBtn.innerHTML = originalHTML;
                    clearBtn.disabled = false;
                }, 2000);
            }

        } catch (error) {
            console.error('Error clearing story:', error);
            this.showNotification('❌ Error clearing story: ' + error.message, 'error');
        }
    }

    onStoryEdit(e) {
        const content = e.target.value;
        this.editedStory = content;
        this.updateStoryMeta(content);
        
        // Add to history on pause (debounced)
        clearTimeout(this.editTimeout);
        this.editTimeout = setTimeout(() => {
            this.addToEditHistory(content);
        }, 1000);
    }

    updateStoryMeta(content) {
        const words = content.trim().split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;
        const charCount = content.length;
        const readTime = Math.ceil(wordCount / 200); // 200 words per minute
        const audioTime = Math.ceil(wordCount / 150); // 150 words per minute for audio
        
        // Update word count with character limit warning
        let wordCountText = `${wordCount.toLocaleString()} words`;
        if (charCount > 4000) {
            wordCountText += ` (${charCount.toLocaleString()} chars - exceeds ElevenLabs limit)`;
        } else {
            wordCountText += ` (${charCount.toLocaleString()} chars)`;
        }
        
        document.getElementById('storyWordCount').textContent = wordCountText;
        document.getElementById('storyReadTime').textContent = `${readTime} min read`;
        document.getElementById('storyAudioTime').textContent = `~${audioTime} min audio`;
        
        // Add visual indicator for character limit
        const storyWordCountEl = document.getElementById('storyWordCount');
        if (charCount > 4000) {
            storyWordCountEl.style.color = '#f56565';
        } else {
            storyWordCountEl.style.color = '#4a5568';
        }
    }

    goToStep(step) {
        // Validate step number
        if (step < 1 || step > 6) {
            console.error('Invalid step number:', step);
            return;
        }
        
        const currentSection = document.getElementById(`step${this.currentStep}`);
        const targetSection = document.getElementById(`step${step}`);
        
        if (!targetSection) {
            console.error('Target section not found for step:', step);
            return;
        }
        
        // Show step navigation confirmation
        const stepNames = {
            1: 'Story Input',
            2: 'Prompt Editor',
            3: 'Story Editor',
            4: 'Voiceover Generation',
            5: 'Results',
            6: 'Story Database'
        };
        
        const stepIcons = {
            1: '📝',
            2: '🎛️',
            3: '✏️',
            4: '🎤',
            5: '📊',
            6: '📚'
        };
        
        if (stepNames[step] && step !== this.currentStep) {
            this.showNotification(`${stepIcons[step]} Navigated to ${stepNames[step]} (Step ${step})`, 'info', 2000);
            
            // Log navigation
            this.logClientActivity('NAVIGATION', `Step ${step} - ${stepNames[step]}`, {
                fromStep: this.currentStep,
                toStep: step
            });
        }
        
        // Update navigation menu active state
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (parseInt(link.dataset.step) === step) {
                link.classList.add('active');
            }
        });
        
        if (currentSection) {
            // Add fade out animation
            currentSection.classList.add('fade-out');
            
            setTimeout(() => {
                // Hide all steps
                document.querySelectorAll('.step-section').forEach(section => {
                    section.classList.remove('active', 'fade-out');
                });
                
                // Show target step
                targetSection.classList.add('active');
                this.currentStep = step;
                
                // Special handling for prompt editor step
                if (step === 2) {
                    setTimeout(() => {
                        this.ensureDefaultPromptLoaded();
                    }, 100);
                }
                
                // Special handling for story database step
                if (step === 6) {
                    setTimeout(() => {
                        this.loadStoryDatabase();
                    }, 100);
                }
                
                // Scroll to top with smooth animation
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 300);
        } else {
            // Direct transition for initial load
            document.querySelectorAll('.step-section').forEach(section => {
                section.classList.remove('active');
            });
            
            targetSection.classList.add('active');
            this.currentStep = step;
            
            // Special handling for prompt editor step
            if (step === 2) {
                setTimeout(() => {
                    this.ensureDefaultPromptLoaded();
                }, 100);
            }
            
            // Special handling for story database step
            if (step === 6) {
                setTimeout(() => {
                    this.loadStoryDatabase();
                }, 100);
            }
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    async generateStory(useCustomPrompt = false) {
        if (this.isGenerating) {
            this.showNotification('⏳ Generation already in progress. Please wait for completion.', 'warning', 3000);
            return;
        }

        const prompt = document.getElementById('storyPrompt').value.trim();
        
        if (!prompt) {
            this.showNotification('⚠️ Please enter a story prompt first in the text box above.', 'warning', 3000);
            return;
        }
        
        this.isGenerating = true;
        
        // Show immediate feedback that generation has started
        const promptType = useCustomPrompt ? 'custom prompt' : 'Reddit-style prompt';
        this.showNotification(`🚀 Starting story generation with ${promptType}...`, 'info', 3000);
        
        // Log generation start
        this.logClientActivity('GENERATION_START', `Story generation started with ${promptType}`, {
            promptLength: prompt.length,
            useCustomPrompt: useCustomPrompt
        });
        
        let loadingMessage = 'Creating your story with Claude AI and RAG knowledge base...';
        if (useCustomPrompt) {
            loadingMessage = 'Generating story with your custom prompt...';
        }
        
        this.showLoading('Generating Story', loadingMessage);
        
        try {
            let requestBody = { story_prompt: prompt };
            
            // Add custom prompt if using custom generation
            if (useCustomPrompt) {
                // Get the current prompt text from the editor
                const customPrompt = document.getElementById('fullPromptEditor').value;
                if (customPrompt && customPrompt.trim()) {
                    requestBody.custom_prompt = customPrompt;
                }
            }
            
            const response = await fetch('/expand-story', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            if (data.success && data.expanded_story) {
                this.originalStory = data.expanded_story;
                document.getElementById('storyEditor').value = data.expanded_story;
                this.updateStoryMeta(data.expanded_story);
                
                // Add to edit history
                this.addToEditHistory(data.expanded_story);
                
                // Calculate word count for success message
                const wordCount = data.expanded_story.split(/\s+/).filter(word => word.length > 0).length;
                
                this.hideLoading();
                
                // Show success notification
                const promptType = useCustomPrompt ? 'custom prompt' : 'default Reddit-style prompt';
                this.showNotification(`🎉 Story generated successfully! (${wordCount.toLocaleString()} words) Created with ${promptType}`, 'success', 4000);
                
                // Log successful generation
                this.logClientActivity('GENERATION_SUCCESS', `Story generated successfully with ${promptType}`, {
                    wordCount: wordCount,
                    characterCount: data.expanded_story.length,
                    promptType: promptType
                });
                
                setTimeout(() => {
                    this.goToStep(3); // Go to story editor (step 3)
                }, 200);
            } else {
                throw new Error(data.error || 'Failed to generate story');
            }
        } catch (error) {
            console.error('Error generating story:', error);
            this.hideLoading();
            this.showNotification('❌ Error generating story: ' + error.message, 'error', 5000);
        } finally {
            this.isGenerating = false;
        }
    }
    
    undo() {
        if (this.editIndex > 0) {
            this.editIndex--;
            const content = this.editHistory[this.editIndex];
            document.getElementById('storyEditor').value = content;
            this.updateStoryMeta(content);
            this.updateEditButtons();
        }
    }
    
    redo() {
        if (this.editIndex < this.editHistory.length - 1) {
            this.editIndex++;
            const content = this.editHistory[this.editIndex];
            document.getElementById('storyEditor').value = content;
            this.updateStoryMeta(content);
            this.updateEditButtons();
        }
    }
    
    saveStory() {
        const story = document.getElementById('storyEditor').value.trim();
        
        // Check if there's content in the story
        if (!story) {
            this.showNotification('⚠️ Please enter or generate a story before saving!', 'warning', 3000);
            return;
        }
        
        // Show immediate saving feedback
        this.showNotification('💾 Saving story...', 'info', 2000);
        
        // Add to edit history
        this.addToEditHistory(story);
        
        // Save the story with timestamp for auto-deletion
        this.saveStoryWithExpiration(story);
        
        // Display the story in results area (without audio for now)
        this.displayResults(story, null);
        
        // Show feedback to the user
        const saveBtn = document.getElementById('saveStoryBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
        }, 1500);
        
        // Calculate word count for feedback
        const wordCount = story.split(/\s+/).filter(word => word.length > 0).length;
        
        // Go to results page to show the saved story
        this.showNotification(`✅ Story saved successfully! (${wordCount.toLocaleString()} words) You can now generate voiceover or download the story.`, 'success', 4000);
        setTimeout(() => {
            this.goToStep(5);
        }, 500);
    }
    
    async saveStoryWithExpiration(story) {
        // Create a story object with content for API
        const storyData = {
            content: story
        };
        
        try {
            // Save to server API
            const serverSaved = await this.saveStoryToServer(storyData);
            
            // If server save was successful, store the ID locally
            if (serverSaved && serverSaved.storyId) {
                try {
                    localStorage.setItem('storyId', serverSaved.storyId);
                } catch (error) {
                    console.error('Error saving story ID to localStorage:', error);
                    // This is less critical, so we'll just log it
                }
                
                // Also save locally as backup with expiration
                const localStoryData = {
                    content: story,
                    timestamp: Date.now(),
                    expiresAt: serverSaved.expiresAt || (Date.now() + (48 * 60 * 60 * 1000)), // 48 hours in milliseconds
                    storyId: serverSaved.storyId
                };
                try {
                    localStorage.setItem('savedStory', JSON.stringify(localStoryData));
                } catch (error) {
                    console.error('Error saving story to localStorage:', error);
                    if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                        this.showNotification('Storage quota exceeded. Story saved to server but not cached locally.', 'warning');
                        this.cleanupExpiredStories();
                        this.cleanupAudioResults();
                    } else {
                        this.showNotification('Failed to cache story locally: ' + error.message, 'warning');
                    }
                }
            } else {
                // Fallback to local storage only if server save failed
                const localStoryData = {
                    content: story,
                    timestamp: Date.now(),
                    expiresAt: Date.now() + (48 * 60 * 60 * 1000) // 48 hours in milliseconds
                };
                try {
                    localStorage.setItem('savedStory', JSON.stringify(localStoryData));
                } catch (error) {
                    console.error('Error saving story to localStorage:', error);
                    if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                        this.showNotification('Storage quota exceeded. Please clear some browser data.', 'error');
                        this.cleanupExpiredStories();
                        this.cleanupAudioResults();
                    } else {
                        this.showNotification('Failed to save story locally: ' + error.message, 'error');
                    }
                }
            }
            
            // Clean up expired stories
            this.cleanupExpiredStories();
            
        } catch (error) {
            console.error('Error saving story:', error);
            // Fallback to local storage only
            const localStoryData = {
                content: story,
                timestamp: Date.now(),
                expiresAt: Date.now() + (48 * 60 * 60 * 1000) // 48 hours in milliseconds
            };
            try {
                localStorage.setItem('savedStory', JSON.stringify(localStoryData));
            } catch (error) {
                console.error('Error saving story to localStorage:', error);
                if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                    this.showNotification('Storage quota exceeded. Please clear some browser data.', 'error');
                    this.cleanupExpiredStories();
                    this.cleanupAudioResults();
                } else {
                    this.showNotification('Failed to save story locally: ' + error.message, 'error');
                }
            }
        }
    }
    
    async saveStoryToServer(storyData) {
        try {
            // Only attempt to save if we're in an online environment
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Development environment detected, using local storage only');
                return null;
            }
            
            // Check if the story content is too large (over 40MB to be safe)
            // Most APIs have a limit around 50MB, we'll stay well under that
            const MAX_PAYLOAD_SIZE = 40 * 1024 * 1024; // 40MB in bytes
            const storyContentSize = new TextEncoder().encode(JSON.stringify(storyData)).length;
            
            console.log(`Story size: ${(storyContentSize / (1024 * 1024)).toFixed(2)}MB`);
            
            if (storyContentSize > MAX_PAYLOAD_SIZE) {
                console.log('Story is too large, using chunked saving');
                return await this.saveStoryInChunks(storyData);
            }
            
            // For normal sized stories, save directly
            const response = await fetch('/api/stories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(storyData)
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Story saved to server:', result);
            return result;
        } catch (error) {
            console.error('Failed to save story to server:', error);
            return null;
        }
    }
    
    async saveStoryInChunks(storyData) {
        try {
            // Split the story content into smaller chunks
            const content = storyData.content;
            const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB per chunk (in characters)
            
            // Create a temporary story with just the first chunk to get an ID
            const firstChunkData = {
                content: content.substring(0, CHUNK_SIZE),
                isFirstChunk: true,
                totalChunks: Math.ceil(content.length / CHUNK_SIZE)
            };
            
            // Save the first chunk and get the story ID
            const response = await fetch('/api/stories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(firstChunkData)
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            const storyId = result.storyId;
            
            // If there are more chunks, append them to the existing story
            if (content.length > CHUNK_SIZE) {
                for (let i = 1; i < Math.ceil(content.length / CHUNK_SIZE); i++) {
                    const start = i * CHUNK_SIZE;
                    const end = Math.min((i + 1) * CHUNK_SIZE, content.length);
                    const chunkData = {
                        content: content.substring(start, end),
                        storyId: storyId,
                        chunkIndex: i,
                        isLastChunk: end === content.length
                    };
                    
                    // Append this chunk to the existing story
                    const appendResponse = await fetch('/api/stories/append', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(chunkData)
                    });
                    
                    if (!appendResponse.ok) {
                        throw new Error(`Failed to append chunk ${i}: ${appendResponse.status}`);
                    }
                    
                    console.log(`Chunk ${i+1}/${Math.ceil(content.length / CHUNK_SIZE)} saved`);
                }
            }
            
            console.log('All story chunks saved successfully');
            return result;
        } catch (error) {
            console.error('Failed to save story in chunks:', error);
            return null;
        }
    }
    
    validateStoredData(data) {
        return data && 
               typeof data.content === 'string' && 
               typeof data.expiresAt === 'number' && 
               data.expiresAt > Date.now() &&
               data.content.length > 0;
    }
    
    cleanupExpiredStories() {
        // Check localStorage for expired stories
        const savedStory = localStorage.getItem('savedStory');
        
        if (savedStory) {
            try {
                const storyData = JSON.parse(savedStory);
                
                // Check if story has expired
                if (storyData.expiresAt && storyData.expiresAt < Date.now()) {
                    // Story has expired, remove it from localStorage
                    localStorage.removeItem('savedStory');
                    localStorage.removeItem('storyId');
                    console.log('Expired story removed from local storage');
                    
                    // If we have a storyId, also try to delete from server
                    if (storyData.storyId) {
                        this.deleteStoryFromServer(storyData.storyId).catch(err => {
                            console.error('Failed to delete expired story from server:', err);
                        });
                    }
                }
            } catch (error) {
                console.error('Error parsing saved story:', error);
                // If there's an error parsing, remove the corrupted data
                try {
                    localStorage.removeItem('savedStory');
                    localStorage.removeItem('storyId');
                } catch (storageError) {
                    console.error('Failed to remove corrupted data:', storageError);
                }
            }
        }
    }
    
    cleanupAudioResults() {
        // Clean up audio blob URLs to prevent memory leaks
        Object.keys(this.audioResults).forEach(providerKey => {
            const audio = this.audioResults[providerKey];
            if (audio && audio.url) {
                try {
                    URL.revokeObjectURL(audio.url);
                    console.log(`Cleaned up audio URL for ${providerKey}`);
                } catch (error) {
                    console.error(`Error cleaning up audio URL for ${providerKey}:`, error);
                }
            }
        });
        
        // Clear the audio results object
        this.audioResults = {};
        
        // Also clear any temporary audio storage in localStorage if it exists
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('tempAudio_') || key.startsWith('audioBlob_')) {
                    try {
                        localStorage.removeItem(key);
                        console.log(`Removed temporary audio data: ${key}`);
                    } catch (error) {
                        console.error(`Error removing temporary audio data ${key}:`, error);
                    }
                }
            });
        } catch (error) {
            console.error('Error cleaning up temporary audio storage:', error);
        }
    }
    
    async deleteStoryFromServer(storyId) {
        try {
            // Only attempt to delete if we're in an online environment
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return;
            }
            
            // Call the Vercel API endpoint to delete the story
            const response = await fetch(`/api/stories?id=${storyId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            console.log('Story deleted from server');
        } catch (error) {
            console.error('Failed to delete story from server:', error);
            throw error;
        }
    }
    
    goToVoiceover() {
        const story = document.getElementById('storyEditor').value.trim();
        
        // Check if there's content in the story
        if (!story) {
            this.showNotification('Please enter or generate a story before proceeding to voiceover generation.');
            return;
        }
        
        // Navigate to voiceover step
        this.goToStep(4);
    }
    
    async generateVoiceover(providerParam) {
        if (this.isGenerating) {
            this.showNotification('Generation already in progress. Please wait for completion.');
            return;
        }

        const story = document.getElementById('storyEditor').value.trim();
        const removeSilence = true; // Always remove silence for optimal audio quality
        // Use the provider passed from the button click
        const provider = providerParam;
        
        // Check if there's content in the story
        if (!story) {
            this.showNotification('Please enter or generate a story before generating a voiceover.');
            return;
        }
        
        // Warning and handling for ElevenLabs character limit
        if ((provider === 'elevenlabs' || provider === 'both') && story.length > 4000) {
            const storyForElevenLabs = story.substring(0, 4000);
            const remainingChars = story.length - 4000;
            
            const shouldContinue = confirm(
                `Warning: Your story has ${story.length.toLocaleString()} characters, but ElevenLabs can only process 4,000 characters.\n\n` +
                `Only the first 4,000 characters will be processed for ElevenLabs.\n\n` +
                (provider === 'elevenlabs' ? 
                    `Consider using Fish Audio or Both providers for the complete story.\n\n` : 
                    `Fish Audio will process the complete story.\n\n`) +
                `Continue?`
            );
            
            if (!shouldContinue) {
                this.isGenerating = false;
                return;
            }
        }
        
        try {
            if (provider === 'both') {
                await this.generateBothAudio(story, removeSilence);
            } else {
                await this.generateSingleAudio(story, provider, removeSilence);
                this.completeLoading();
            }
            
            this.displayResults(story, provider);
            setTimeout(() => {
                this.goToStep(5);
            }, 200);
        } catch (error) {
            console.error('Error generating voiceover:', error);
            this.hideLoading();
            alert('Error generating voiceover: ' + error.message);
        } finally {
            this.isGenerating = false;
        }
    }

    async generateSingleAudio(story, provider, removeSilence) {
        let expectedDuration, displayName;
        let processedStory = story;
        
        if (provider === 'elevenlabs') {
            expectedDuration = '3 minutes';
            displayName = 'ElevenLabs';
            
            // Handle ElevenLabs character limit
            if (story.length > 4000) {
                processedStory = story.substring(0, 4000);
                console.log(`Story truncated to ${processedStory.length} characters for ElevenLabs`);
            }
        } else {
            expectedDuration = '10 minutes';
            displayName = 'Fish Audio';
        }
        
        this.showLoading('Generating Voiceover', `Creating ${displayName} voiceover (${expectedDuration})...`);
        
        const result = await this.generateAudioForProvider(processedStory, provider, removeSilence);
        
        this.audioResults[provider] = {
            blob: result.blob,
            url: result.url,
            duration: result.duration,
            isComplete: provider === 'elevenlabs' ? processedStory.length === story.length : true
        };
    }

    async generateBothAudio(story, removeSilence) {
        this.showLoading('Generating Voiceovers', 'Creating both ElevenLabs and Fish Audio voiceovers...');
        
        // Handle ElevenLabs character limit
        let elevenLabsStory = story;
        if (story.length > 4000) {
            elevenLabsStory = story.substring(0, 4000);
            console.log(`Story truncated to ${elevenLabsStory.length} characters for ElevenLabs`);
        }
        
        const promises = [
            this.generateAudioForProvider(elevenLabsStory, 'elevenlabs', removeSilence),
            this.generateAudioForProvider(story, 'fish', removeSilence)
        ];

        try {
            const results = await Promise.allSettled(promises);
            
            // Process results
            results.forEach((result, index) => {
                const provider = index === 0 ? 'elevenlabs' : 'fish';
                const displayName = index === 0 ? 'ElevenLabs' : 'Fish Audio';
                
                if (result.status === 'fulfilled') {
                    this.audioResults[provider] = {
                        blob: result.value.blob,
                        url: result.value.url,
                        duration: result.value.duration,
                        isComplete: provider === 'elevenlabs' ? elevenLabsStory.length === story.length : true
                    };
                } else {
                    console.error(`Error generating ${displayName} audio:`, result.reason);
                    alert(`Error generating ${displayName} audio: ${result.reason.message || result.reason}`);
                }
            });
            
            this.completeLoading();
            
            // Complete the loading animation
            setTimeout(() => {
                this.completeLoading();
            }, 1000);
            
        } catch (error) {
            throw new Error('Failed to generate voiceovers: ' + error.message);
        }
    }

    async generateAudioForProvider(story, provider, removeSilence) {
        let endpoint, displayName, processedStory;
        let silenceSettings;
        
        if (provider === 'elevenlabs') {
            endpoint = '/generate-elevenlabs-binary';
            displayName = 'ElevenLabs';
            silenceSettings = this.silenceSettings.elevenlabs;
            // Limit ElevenLabs to 4000 characters
            processedStory = story.substring(0, 4000);
            if (story.length > 4000) {
                console.log(`ElevenLabs: Story truncated from ${story.length} to 4000 characters`);
            }
        } else {
            endpoint = '/generate-fish-binary';
            displayName = 'Fish Audio';
            silenceSettings = this.silenceSettings.fish;
            processedStory = story; // Fish Audio can handle full story
        }
        
        // Use global checkbox as master control
        const actualRemoveSilence = true; // Always remove silence for optimal audio quality
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                story_prompt: processedStory,
                elevenlabs_remove_silence: actualRemoveSilence,
                remove_silence: actualRemoveSilence,
                silence_threshold: silenceSettings.threshold,
                min_silence_duration: silenceSettings.minDuration,
                silence_buffer: silenceSettings.buffer
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to generate ${displayName} voiceover`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Calculate approximate duration based on word count
        // Average speaking rate is about 150 words per minute
        const wordCount = processedStory.split(/\s+/).length;
        const estimatedDuration = (wordCount / 150) * 60; // in seconds
        
        return {
            blob: audioBlob,
            url: audioUrl,
            duration: estimatedDuration,
            charactersUsed: processedStory.length
        };
    }

    displayResults(story, provider) {
        // Display story preview
        const storyPreview = document.getElementById('finalStoryPreview');
        storyPreview.textContent = story;
        
        // Display audio results
        const audioResults = document.getElementById('audioResults');
        const downloadButtons = document.getElementById('downloadButtons');
        
        let audioHTML = '';
        let downloadHTML = '';
        
        // Check if we have any audio results
        const hasAudio = Object.keys(this.audioResults).length > 0;
        
        if (hasAudio) {
        // Generate HTML for each audio result
        Object.keys(this.audioResults).forEach(providerKey => {
            const audio = this.audioResults[providerKey];
            const providerClass = providerKey === 'elevenlabs' ? 'elevenlabs' : 'fish';
            const providerName = providerKey === 'elevenlabs' ? 'ElevenLabs' : 'Fish Audio';
            const providerIcon = providerKey === 'elevenlabs' ? 'EL' : 'FA';
            
            // Character limit warning for ElevenLabs
            let characterInfo = '';
            if (providerKey === 'elevenlabs') {
                if (!audio.isComplete) {
                    characterInfo = `
                        <div class="character-limit-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Note:</strong> Only first 4,000 characters processed (story has ${story.length} characters)
                        </div>
                    `;
                } else {
                    characterInfo = `
                        <div class="character-limit-success">
                            <i class="fas fa-check-circle"></i>
                            Complete story processed (${story.length} characters)
                        </div>
                    `;
                }
            } else {
                characterInfo = `
                    <div class="character-limit-success">
                        <i class="fas fa-check-circle"></i>
                        Full story processed (${story.length} characters)
                    </div>
                `;
            }
            
            // Calculate audio duration in minutes and seconds
            const duration = audio.duration || 0;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            const durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            audioHTML += `
                <div class="audio-section">
                    <h4>
                        <span class="provider-icon ${providerClass}">${providerIcon}</span>
                        ${providerName}
                    </h4>
                    ${characterInfo}
                    <div class="audio-player">
                        <audio controls>
                            <source src="${audio.url}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                    <div class="audio-info">
                        <div><strong>Duration:</strong> ${durationText}</div>
                        <div><strong>Format:</strong> MP3</div>
                        <div><strong>Quality:</strong> High</div>
                    </div>
                </div>
            `;
            
            downloadHTML += `
                <button class="btn btn-outline" onclick="app.downloadAudio('${providerKey}')">
                    <i class="fas fa-download"></i>
                    Download ${providerName}
                </button>
            `;
        });
        } else {
            // Show "Generate Voiceover" option when no audio exists
            audioHTML = `
                <div class="no-audio-section">
                    <div class="no-audio-content">
                        <i class="fas fa-microphone-slash"></i>
                        <h4>No Voiceover Generated</h4>
                        <p>Generate audio voiceover for your story using ElevenLabs or Fish Audio.</p>
                        <div class="generate-audio-buttons">
                            <button class="btn btn-primary" onclick="app.goToStep(4)">
                                <i class="fas fa-microphone"></i>
                                Generate Voiceover
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        audioResults.innerHTML = audioHTML;
        
        // Always show download story button and save to database button
        downloadButtons.innerHTML = downloadHTML + `
            <button class="btn btn-outline" onclick="app.downloadStory()">
                <i class="fas fa-download"></i>
                Download Story (.txt)
            </button>
            <button class="btn btn-primary" onclick="app.saveToDatabase()">
                <i class="fas fa-database"></i>
                Save to Story Database
            </button>
        `;
    }

    downloadStory() {
        const story = document.getElementById('storyEditor').value;
        const blob = new Blob([story], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'story.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    copyToClipboard() {
        const storyText = document.getElementById('storyEditor').value;
        if (!storyText) {
            return;
        }
        
        // Copy to clipboard
        navigator.clipboard.writeText(storyText)
            .then(() => {
                // Show success feedback
                const copyBtn = document.getElementById('copyBtn');
                const originalIcon = copyBtn.innerHTML;
                
                // Change icon to checkmark to indicate success
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                copyBtn.classList.add('copy-success');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    copyBtn.innerHTML = originalIcon;
                    copyBtn.classList.remove('copy-success');
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Failed to copy text to clipboard');
            });
    }

    downloadAudio(providerKey) {
        if (this.audioResults[providerKey]) {
            const audio = this.audioResults[providerKey];
            const providerName = providerKey === 'elevenlabs' ? 'elevenlabs' : 'fish_audio';
            const a = document.createElement('a');
            a.href = audio.url;
            a.download = `voiceover_${providerName}_${new Date().toISOString().split('T')[0]}.mp3`;
            a.click();
            
            this.showNotification(`🎵 Downloaded ${providerKey === 'elevenlabs' ? 'ElevenLabs' : 'Fish Audio'} voiceover`, 'success', 3000);
        } else {
            this.showNotification('❌ No audio file available for download', 'error', 3000);
        }
    }

    startOver() {
        // Reset all data
        this.originalStory = '';
        this.editedStory = '';
        this.setupEditHistory();
        this.isGenerating = false;
        
        // Clean up audio URLs using the new cleanup method
        this.cleanupAudioResults();
        
        // Clear form inputs
        document.getElementById('storyPrompt').value = '';
        document.getElementById('storyEditor').value = '';
        document.getElementById('promptCharCount').textContent = '0';
        
        // Reset to first step
        this.goToStep(1);
    }

    showLoading(title, message, useBottomLoader = false) {
        if (useBottomLoader) {
            this.showBottomLoader();
        } else {
            const overlay = document.getElementById('loadingOverlay');
            const titleEl = document.getElementById('loadingTitle');
            const messageEl = document.getElementById('loadingMessage');
            const progressEl = document.getElementById('progressFill');
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            progressEl.style.width = '0%';
            
            overlay.classList.add('active');
            
            // Animate progress bar with smooth curve
            setTimeout(() => {
                progressEl.style.width = '30%';
                setTimeout(() => {
                    progressEl.style.width = '70%';
                    setTimeout(() => {
                        progressEl.style.width = '90%';
                    }, 1500);
                }, 1000);
            }, 300);
        }
    }

    showBottomLoader() {
        const bottomLoader = document.getElementById('bottomLoader');
        const bottomLoaderFill = document.getElementById('bottomLoaderFill');
        
        bottomLoader.classList.add('active');
        
        // Animate bottom loader
        setTimeout(() => {
            bottomLoaderFill.style.width = '30%';
            setTimeout(() => {
                bottomLoaderFill.style.width = '60%';
                setTimeout(() => {
                    bottomLoaderFill.style.width = '85%';
                }, 1000);
            }, 500);
        }, 100);
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        const bottomLoader = document.getElementById('bottomLoader');
        const bottomLoaderFill = document.getElementById('bottomLoaderFill');
        
        overlay.classList.remove('active');
        bottomLoader.classList.remove('active');
        bottomLoaderFill.style.width = '0%';
    }

    completeLoading() {
        const progressEl = document.getElementById('progressFill');
        const bottomLoaderFill = document.getElementById('bottomLoaderFill');
        
        // Complete the progress bars
        progressEl.style.width = '100%';
        bottomLoaderFill.style.width = '100%';
        
        // Hide after completion animation
        setTimeout(() => {
            this.hideLoading();
        }, 500);
    }

    updateLoadingMessage(message) {
        const messageEl = document.getElementById('loadingMessage');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }
    
    // Story Database functionality
    async loadStoryDatabase() {
        try {
            this.showNotification('📚 Loading story database...', 'info', 1500);
            
            const stories = await this.getAllSavedStories();
            this.displayStoryDatabase(stories);
            this.updateDatabaseStats(stories);
            
            // Setup database event listeners
            this.setupDatabaseEventListeners();
            
            // Refresh storage information for data management
            this.refreshStorageInfo();
            
        } catch (error) {
            console.error('Error loading story database:', error);
            this.showNotification('❌ Error loading story database', 'error', 3000);
        }
    }
    
    async getAllSavedStories() {
        try {
            // Get stories from localStorage
            const localStories = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('story_')) {
                    try {
                        const storyData = JSON.parse(localStorage.getItem(key));
                        if (storyData && storyData.content) {
                            localStories.push({
                                id: key,
                                ...storyData,
                                source: 'local'
                            });
                        }
                    } catch (e) {
                        console.warn('Invalid story data in localStorage:', key);
                    }
                }
            }
            
            // Get stories from server
            const serverStories = [];
            try {
                const response = await fetch('/api/stories');
                if (response.ok) {
                    const data = await response.json();
                    if (data.stories) {
                        serverStories.push(...data.stories.map(story => ({
                            ...story,
                            source: 'server'
                        })));
                    }
                }
            } catch (error) {
                console.log('No server stories available');
            }
            
            // Combine and deduplicate
            const allStories = [...localStories, ...serverStories];
            const uniqueStories = allStories.filter((story, index, self) => 
                index === self.findIndex(s => s.id === story.id)
            );
            
            return uniqueStories;
            
        } catch (error) {
            console.error('Error getting saved stories:', error);
            return [];
        }
    }
    
    displayStoryDatabase(stories) {
        const storiesGrid = document.getElementById('storiesGrid');
        
        if (!stories || stories.length === 0) {
            storiesGrid.innerHTML = `
                <div class="empty-database">
                    <i class="fas fa-book-open"></i>
                    <h3>No Stories Yet</h3>
                    <p>Your saved stories will appear here. Generate your first story to get started!</p>
                </div>
            `;
            return;
        }
        
        // Sort stories by date (newest first by default)
        const sortedStories = this.sortStories(stories, 'newest');
        
        const storiesHTML = sortedStories.map(story => {
            const date = new Date(story.timestamp || story.createdAt || Date.now());
            const wordCount = story.content.split(/\s+/).filter(word => word.length > 0).length;
            const preview = story.content.substring(0, 150) + (story.content.length > 150 ? '...' : '');
            const title = story.title || story.content.substring(0, 50) + '...';
            
            // Check if story has audio
            const hasAudio = story.audioFiles && Object.keys(story.audioFiles).length > 0;
            const audioCount = hasAudio ? Object.keys(story.audioFiles).length : 0;
            
            return `
                <div class="story-card" data-story-id="${story.id}">
                    <div class="story-card-header">
                        <h3 class="story-title">${title}</h3>
                        <span class="story-date">${date.toLocaleDateString()}</span>
                    </div>
                    <div class="story-preview">${preview}</div>
                    <div class="story-meta">
                        <div class="story-stats">
                            <div class="story-stat">
                                <i class="fas fa-file-alt"></i>
                                <span>${wordCount.toLocaleString()} words</span>
                            </div>
                            <div class="story-stat">
                                <i class="fas fa-microphone"></i>
                                <span>${audioCount} audio</span>
                            </div>
                            <div class="story-stat">
                                <i class="fas fa-${story.source === 'local' ? 'laptop' : 'cloud'}"></i>
                                <span>${story.source}</span>
                            </div>
                        </div>
                    </div>
                    <div class="story-actions">
                        <button class="story-action-btn" onclick="app.viewStory('${story.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="story-action-btn" onclick="app.loadStoryInEditor('${story.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="story-action-btn" onclick="app.downloadStoryById('${story.id}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="story-action-btn danger" onclick="app.deleteStoryById('${story.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        storiesGrid.innerHTML = storiesHTML;
    }
    
    sortStories(stories, sortType) {
        switch (sortType) {
            case 'newest':
                return stories.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));
            case 'oldest':
                return stories.sort((a, b) => new Date(a.timestamp || a.createdAt || 0) - new Date(b.timestamp || b.createdAt || 0));
            case 'alphabetical':
                return stories.sort((a, b) => {
                    const titleA = a.title || a.content.substring(0, 50);
                    const titleB = b.title || b.content.substring(0, 50);
                    return titleA.localeCompare(titleB);
                });
            case 'word-count':
                return stories.sort((a, b) => {
                    const wordsA = a.content.split(/\s+/).filter(word => word.length > 0).length;
                    const wordsB = b.content.split(/\s+/).filter(word => word.length > 0).length;
                    return wordsB - wordsA;
                });
            default:
                return stories;
        }
    }
    
    updateDatabaseStats(stories) {
        const totalStories = stories.length;
        let totalAudioFiles = 0;
        let totalStorageSize = 0;
        
        stories.forEach(story => {
            if (story.audioFiles) {
                totalAudioFiles += Object.keys(story.audioFiles).length;
            }
            // Estimate storage size (rough approximation)
            totalStorageSize += new Blob([JSON.stringify(story)]).size;
        });
        
        document.getElementById('totalStoriesCount').textContent = totalStories;
        document.getElementById('totalAudioCount').textContent = totalAudioFiles;
        document.getElementById('storageUsed').textContent = this.formatBytes(totalStorageSize);
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    setupDatabaseEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('storySearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchStories(e.target.value);
            }, 300));
        }
        
        // Sort functionality
        const sortSelect = document.getElementById('storySortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortAndDisplayStories(e.target.value);
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshStoriesBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadStoryDatabase();
            });
        }
        
        // Clear all button
        const clearAllBtn = document.getElementById('clearAllStoriesBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllStories();
            });
        }
    }
    
    async searchStories(query) {
        const stories = await this.getAllSavedStories();
        
        if (!query.trim()) {
            this.displayStoryDatabase(stories);
            return;
        }
        
        const filteredStories = stories.filter(story => {
            const title = story.title || story.content.substring(0, 50);
            const content = story.content.toLowerCase();
            const searchTerm = query.toLowerCase();
            
            return title.toLowerCase().includes(searchTerm) || 
                   content.includes(searchTerm);
        });
        
        this.displayStoryDatabase(filteredStories);
        this.showNotification(`🔍 Found ${filteredStories.length} stories matching "${query}"`, 'info', 2000);
    }
    
    async sortAndDisplayStories(sortType) {
        const stories = await this.getAllSavedStories();
        const sortedStories = this.sortStories(stories, sortType);
        this.displayStoryDatabase(sortedStories);
    }
    
    async viewStory(storyId) {
        try {
            const story = await this.getStoryById(storyId);
            if (story) {
                // Load story into results view
                document.getElementById('finalStoryPreview').textContent = story.content;
                
                // Load audio if available
                if (story.audioFiles) {
                    // Set up audio results
                    this.audioResults = story.audioFiles;
                    this.displayResults(story.content);
                }
                
                // Navigate to results
                this.goToStep(5);
                this.showNotification('👁️ Story loaded in Results view', 'success', 2000);
            }
        } catch (error) {
            console.error('Error viewing story:', error);
            this.showNotification('❌ Error loading story', 'error', 3000);
        }
    }
    
    async loadStoryInEditor(storyId) {
        try {
            const story = await this.getStoryById(storyId);
            if (story) {
                // Load story into editor
                document.getElementById('storyEditor').value = story.content;
                this.updateStoryMeta(story.content);
                
                // Add to edit history
                this.setupEditHistory();
                this.addToEditHistory(story.content);
                
                // Navigate to editor
                this.goToStep(3);
                this.showNotification('✏️ Story loaded in editor', 'success', 2000);
            }
        } catch (error) {
            console.error('Error loading story in editor:', error);
            this.showNotification('❌ Error loading story', 'error', 3000);
        }
    }
    
    async downloadStoryById(storyId) {
        try {
            const story = await this.getStoryById(storyId);
            if (story) {
                const title = story.title || 'story';
                const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const blob = new Blob([story.content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `${sanitizedTitle}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showNotification('📥 Story downloaded', 'success', 2000);
            }
        } catch (error) {
            console.error('Error downloading story:', error);
            this.showNotification('❌ Error downloading story', 'error', 3000);
        }
    }
    
    async deleteStoryById(storyId) {
        if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
            return;
        }
        
        try {
            // Remove from localStorage
            localStorage.removeItem(storyId);
            
            // Remove from server if it exists there
            try {
                await this.deleteStoryFromServer(storyId);
            } catch (error) {
                console.log('Story not found on server or server unavailable');
            }
            
            // Refresh the database display
            this.loadStoryDatabase();
            this.showNotification('🗑️ Story deleted', 'success', 2000);
            
        } catch (error) {
            console.error('Error deleting story:', error);
            this.showNotification('❌ Error deleting story', 'error', 3000);
        }
    }
    
    async getStoryById(storyId) {
        try {
            // Try localStorage first
            const localStory = localStorage.getItem(storyId);
            if (localStory) {
                return JSON.parse(localStory);
            }
            
            // Try server
            const response = await fetch(`/api/stories/${storyId}`);
            if (response.ok) {
                const data = await response.json();
                return data.story;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting story by ID:', error);
            return null;
        }
    }
    
    async clearAllStories() {
        if (!confirm('Are you sure you want to delete ALL stories? This action cannot be undone.')) {
            return;
        }
        
        try {
            // Clear localStorage stories
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('story_')) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Clear server stories (if available)
            try {
                await fetch('/api/stories', { method: 'DELETE' });
            } catch (error) {
                console.log('Server stories not available for clearing');
            }
            
            // Refresh the database display
            this.loadStoryDatabase();
            this.showNotification('🧹 All stories cleared', 'success', 2000);
            
        } catch (error) {
            console.error('Error clearing all stories:', error);
            this.showNotification('❌ Error clearing stories', 'error', 3000);
        }
    }
    
    async saveToDatabase() {
        const saveStatusDiv = document.getElementById('saveStatus');
        const saveButton = document.getElementById('saveToStoryDatabaseBtn');
        
        try {
            // Show saving status
            if (saveStatusDiv) {
                saveStatusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving to database...';
                saveStatusDiv.className = 'save-status saving';
            }
            
            // Disable button while saving
            if (saveButton) {
                const originalHTML = saveButton.innerHTML;
                saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                saveButton.disabled = true;
            }
            
            // Get the current story content
            const storyContent = document.getElementById('finalStoryPreview').textContent || 
                               document.getElementById('storyEditor').value;
            
            if (!storyContent || storyContent.trim().length === 0) {
                this.showNotification('⚠️ No story content to save', 'warning', 3000);
                
                if (saveStatusDiv) {
                    saveStatusDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No content to save';
                    saveStatusDiv.className = 'save-status warning';
                }
                
                // Re-enable button
                if (saveButton) {
                    saveButton.innerHTML = '<i class="fas fa-save"></i> Save Story & Audio';
                    saveButton.disabled = false;
                }
                return;
            }
            
            // Create story data object
            const storyData = {
                content: storyContent.trim(),
                title: storyContent.substring(0, 50).trim() + '...',
                timestamp: new Date().toISOString(),
                wordCount: storyContent.split(/\s+/).filter(word => word.length > 0).length,
                audioFiles: this.audioResults || {},
                source: 'manual_save'
            };
            
            // Generate unique ID
            const storyId = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Save to localStorage
            localStorage.setItem(storyId, JSON.stringify(storyData));
            
            // Try to save to server as well
            try {
                await this.saveStoryToServer({
                    id: storyId,
                    ...storyData
                });
            } catch (error) {
                console.log('Server save failed, but localStorage save successful');
            }
            
            // Show success notification and status
            const wordCount = storyData.wordCount.toLocaleString();
            const audioCount = Object.keys(storyData.audioFiles).length;
            let message = `💾 Story saved to database! (${wordCount} words`;
            if (audioCount > 0) {
                message += `, ${audioCount} audio file${audioCount > 1 ? 's' : ''}`;
            }
            message += ')';
            
            this.showNotification(message, 'success', 4000);
            
            // Show success status
            if (saveStatusDiv) {
                let statusMessage = `<i class="fas fa-check-circle"></i> Saved successfully! (${wordCount} words`;
                if (audioCount > 0) {
                    statusMessage += `, ${audioCount} audio file${audioCount > 1 ? 's' : ''}`;
                }
                statusMessage += ')';
                saveStatusDiv.innerHTML = statusMessage;
                saveStatusDiv.className = 'save-status success';
            }
            
            // Update button to show success
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-check"></i> Saved!';
                
                // Restore button after 3 seconds
                setTimeout(() => {
                    saveButton.innerHTML = '<i class="fas fa-save"></i> Save Story & Audio';
                    saveButton.disabled = false;
                }, 3000);
            }
            
            // Log the save action [[memory:2413802]]
            this.logClientActivity('DATABASE_SAVE', 'Story saved to database', {
                wordCount: storyData.wordCount,
                audioCount: audioCount,
                storyId: storyId
            });
            
            // Refresh database if currently viewing it
            if (this.currentStep === 6) {
                setTimeout(() => {
                    this.loadStoryDatabase();
                }, 500);
            }
            
        } catch (error) {
            console.error('Error saving to database:', error);
            this.showNotification('❌ Error saving story to database', 'error', 3000);
            
            // Show error status
            if (saveStatusDiv) {
                saveStatusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error saving to database';
                saveStatusDiv.className = 'save-status error';
            }
            
            // Re-enable button
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save"></i> Save Story & Audio';
                saveButton.disabled = false;
            }
        }
    }

    // Data Management Methods
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getStorageSize(storageItems) {
        let totalSize = 0;
        storageItems.forEach(item => {
            if (item.value) {
                totalSize += new Blob([item.value]).size;
            }
        });
        return totalSize;
    }

    refreshStorageInfo() {
        try {
            // API Keys (sessionStorage)
            const apiKeysData = sessionStorage.getItem('storyforge_api_keys') || '{}';
            const apiKeysSize = new Blob([apiKeysData]).size;
            document.getElementById('apiKeysSize').textContent = this.formatBytes(apiKeysSize);

            // Current Story
            const currentStoryItems = [
                { value: localStorage.getItem('savedStory') },
                { value: localStorage.getItem('storyId') },
                { value: sessionStorage.getItem('tempStory') },
                { value: JSON.stringify(this.editHistory || []) },
                { value: JSON.stringify(this.audioResults || {}) }
            ];
            const currentStorySize = this.getStorageSize(currentStoryItems);
            document.getElementById('currentStorySize').textContent = this.formatBytes(currentStorySize);

            // Saved Stories
            let savedStoriesSize = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('story_')) {
                    const value = localStorage.getItem(key);
                    if (value) {
                        savedStoriesSize += new Blob([value]).size;
                    }
                }
            }
            document.getElementById('savedStoriesSize').textContent = this.formatBytes(savedStoriesSize);

            // Audio Data
            let audioDataSize = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('tempAudio_') || key.startsWith('audioBlob_'))) {
                    const value = localStorage.getItem(key);
                    if (value) {
                        audioDataSize += new Blob([value]).size;
                    }
                }
            }
            // Add current audio results size
            audioDataSize += new Blob([JSON.stringify(this.audioResults || {})]).size;
            document.getElementById('audioDataSize').textContent = this.formatBytes(audioDataSize);

            // Custom Prompts
            const customPromptsItems = [
                { value: localStorage.getItem('customPrompt') },
                { value: localStorage.getItem('customPromptProfile') }
            ];
            const customPromptsSize = this.getStorageSize(customPromptsItems);
            document.getElementById('customPromptsSize').textContent = this.formatBytes(customPromptsSize);

            // App Settings
            const appSettingsItems = [
                { value: localStorage.getItem('silenceSettings') }
            ];
            const appSettingsSize = this.getStorageSize(appSettingsItems);
            document.getElementById('appSettingsSize').textContent = this.formatBytes(appSettingsSize);

            // Activity Logs
            const activityLogsData = localStorage.getItem('storyforge_logs') || '[]';
            const activityLogsSize = new Blob([activityLogsData]).size;
            document.getElementById('activityLogsSize').textContent = this.formatBytes(activityLogsSize);

            this.showNotification('📊 Storage information refreshed', 'info', 2000);
        } catch (error) {
            console.error('Error refreshing storage info:', error);
            this.showNotification('❌ Error refreshing storage info', 'error', 3000);
        }
    }

    clearApiKeysFromManagement() {
        if (!confirm('Clear all API keys? They will need to be re-entered for future sessions.')) {
            return;
        }
        
        this.clearApiKeys();
        this.refreshStorageInfo();
    }

    clearCurrentStoryFromManagement() {
        if (!confirm('Clear current story? This will remove active story content, edit history, and temporary data.')) {
            return;
        }
        
        try {
            // Clear current story data
            const editor = document.getElementById('storyEditor');
            if (editor) {
                editor.value = '';
                this.editedStory = '';
                this.originalStory = '';
            }

            // Clear edit history
            this.editHistory = [];
            this.editIndex = -1;
            this.updateEditButtons();

            // Clear storage items
            localStorage.removeItem('savedStory');
            localStorage.removeItem('storyId');
            sessionStorage.removeItem('tempStory');

            // Clear audio results
            this.audioResults = {};
            this.cleanupAudioResults();

            // Update UI
            this.updateStoryMeta('');
            this.refreshStorageInfo();

            this.showNotification('🗑️ Current story data cleared', 'success', 3000);
            this.logClientActivity('DATA_CLEAR', 'Current story data cleared from management panel', {});
        } catch (error) {
            console.error('Error clearing current story:', error);
            this.showNotification('❌ Error clearing current story', 'error', 3000);
        }
    }

    clearAudioDataFromManagement() {
        if (!confirm('Clear all audio data? This will remove generated audio files and temporary audio data.')) {
            return;
        }
        
        try {
            // Clear audio results
            this.cleanupAudioResults();

            // Clear temporary audio storage
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('tempAudio_') || key.startsWith('audioBlob_'))) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.warn('Failed to remove audio key:', key, error);
                }
            });

            this.refreshStorageInfo();
            this.showNotification('🗑️ Audio data cleared', 'success', 3000);
            this.logClientActivity('DATA_CLEAR', 'Audio data cleared from management panel', { keysRemoved: keysToRemove.length });
        } catch (error) {
            console.error('Error clearing audio data:', error);
            this.showNotification('❌ Error clearing audio data', 'error', 3000);
        }
    }

    clearCustomPromptsFromManagement() {
        if (!confirm('Clear custom prompts? This will remove saved custom prompts and reset to default.')) {
            return;
        }
        
        try {
            localStorage.removeItem('customPrompt');
            localStorage.removeItem('customPromptProfile');
            
            // Reset prompt editor to default if currently showing custom
            const promptEditor = document.getElementById('fullPromptEditor');
            if (promptEditor && promptEditor.value !== this.defaultPromptText) {
                promptEditor.value = this.defaultPromptText;
                this.updatePromptCharCount();
            }

            this.refreshStorageInfo();
            this.showNotification('🗑️ Custom prompts cleared', 'success', 3000);
            this.logClientActivity('DATA_CLEAR', 'Custom prompts cleared from management panel', {});
        } catch (error) {
            console.error('Error clearing custom prompts:', error);
            this.showNotification('❌ Error clearing custom prompts', 'error', 3000);
        }
    }

    clearAppSettingsFromManagement() {
        if (!confirm('Clear app settings? This will reset audio settings and other preferences to defaults.')) {
            return;
        }
        
        try {
            localStorage.removeItem('silenceSettings');
            
            // Reset silence settings to defaults
            this.silenceSettings = {
                enabled: true,
                threshold: -50,
                duration: 1.0
            };
            
            // Update UI if silence modal is open
            this.updateSilenceSettingsUI();

            this.refreshStorageInfo();
            this.showNotification('🗑️ App settings cleared', 'success', 3000);
            this.logClientActivity('DATA_CLEAR', 'App settings cleared from management panel', {});
        } catch (error) {
            console.error('Error clearing app settings:', error);
            this.showNotification('❌ Error clearing app settings', 'error', 3000);
        }
    }

    clearActivityLogsFromManagement() {
        if (!confirm('Clear activity logs? This will remove all client-side logs and debug information.')) {
            return;
        }
        
        try {
            localStorage.removeItem('storyforge_logs');
            
            this.refreshStorageInfo();
            this.showNotification('🗑️ Activity logs cleared', 'success', 3000);
            
            // Can't log this since we just cleared the logs!
            console.log('[DATA_CLEAR] Activity logs cleared from management panel');
        } catch (error) {
            console.error('Error clearing activity logs:', error);
            this.showNotification('❌ Error clearing activity logs', 'error', 3000);
        }
    }

    async clearAllDataFromManagement() {
        const confirmation = confirm(
            '⚠️ DANGER: Clear ALL data?\n\n' +
            'This will permanently remove:\n' +
            '• All API keys\n' +
            '• Current and saved stories\n' +
            '• All audio files\n' +
            '• Custom prompts and settings\n' +
            '• Activity logs\n\n' +
            'This action cannot be undone!'
        );
        
        if (!confirmation) {
            return;
        }

        // Double confirmation
        const doubleConfirm = confirm(
            'Are you absolutely sure? This will delete EVERYTHING and cannot be recovered.'
        );
        
        if (!doubleConfirm) {
            return;
        }

        try {
            this.showNotification('🧹 Clearing all data...', 'info', 5000);

            // 1. Clear API keys
            this.apiKeys = { anthropic: '', elevenlabs: '', fish: '' };
            sessionStorage.removeItem('storyforge_api_keys');
            
            // Clear API key inputs
            ['anthropicKey', 'elevenlabsKey', 'fishKey'].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = '';
            });

            // 2. Clear current story
            const editor = document.getElementById('storyEditor');
            if (editor) {
                editor.value = '';
                this.editedStory = '';
                this.originalStory = '';
            }
            this.editHistory = [];
            this.editIndex = -1;
            this.updateEditButtons();
            this.updateStoryMeta('');

            // 3. Clear audio data
            this.cleanupAudioResults();

            // 4. Clear ALL localStorage (comprehensive)
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.startsWith('story_') ||
                    key.startsWith('tempAudio_') ||
                    key.startsWith('audioBlob_') ||
                    key === 'savedStory' ||
                    key === 'storyId' ||
                    key === 'customPrompt' ||
                    key === 'customPromptProfile' ||
                    key === 'silenceSettings' ||
                    key === 'storyforge_logs'
                )) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.warn('Failed to remove key:', key, error);
                }
            });

            // 5. Clear sessionStorage
            sessionStorage.removeItem('tempStory');

            // 6. Reset prompt to default
            const promptEditor = document.getElementById('fullPromptEditor');
            if (promptEditor) {
                promptEditor.value = this.defaultPromptText;
                this.updatePromptCharCount();
            }

            // 7. Reset silence settings
            this.silenceSettings = {
                enabled: true,
                threshold: -50,
                duration: 1.0
            };

            // 8. Clear server data (best effort)
            try {
                await fetch('/api/stories', { method: 'DELETE' });
            } catch (error) {
                console.log('Server data not available for clearing');
            }

            // 9. Update button states
            this.updateVoiceoverButtonStates();
            this.updateApiKeyStatus('🔑 API keys cleared - enter new keys above', 'warning');

            // 10. Reset to first step
            this.goToStep(1);

            // 11. Refresh storage info
            this.refreshStorageInfo();

            // Final notification
            this.showNotification(
                '🧹 ALL DATA CLEARED! Application reset to initial state. ' +
                `Removed ${keysToRemove.length} storage items.`, 
                'success', 
                8000
            );

            console.log('[DATA_CLEAR] Complete data wipe performed - all storage cleared');
        } catch (error) {
            console.error('Error during complete data clear:', error);
            this.showNotification('❌ Error during data clear: ' + error.message, 'error', 5000);
        }
    }
}

// Initialize the app
const app = new StoryForgeGUI();

// Expose app to global scope for inline event handlers
window.app = app;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Additional backup to ensure prompt loads
    setTimeout(() => {
        if (app) {
            console.log('Running backup prompt load');
            app.ensureDefaultPromptLoaded();
        }
    }, 1000);
    
    // Even more aggressive backup - check every few seconds until prompt is loaded
    const checkPromptLoaded = () => {
        const promptEditor = document.getElementById('fullPromptEditor');
        if (promptEditor && promptEditor.value.includes('Your comprehensive story prompt will load here')) {
            console.log('Backup prompt loading triggered - prompt still not loaded');
            if (app) {
                app.ensureDefaultPromptLoaded();
            }
            // Keep checking until prompt is loaded
            setTimeout(checkPromptLoaded, 2000);
        } else {
            console.log('Prompt appears to be loaded successfully');
        }
    };
    
    setTimeout(checkPromptLoaded, 3000);
    
    // Add global test functions for debugging
    window.testSilenceModal = () => {
        console.log('Testing silence modal...');
        if (app) {
            app.openModal();
        } else {
            console.error('StoryForge not available');
        }
    };
    
    window.testSilenceButton = () => {
        console.log('Testing silence button...');
        const btn = document.getElementById('silenceSettingsBtn');
        if (btn) {
            btn.click();
        } else {
            console.error('Silence settings button not found');
        }
    };
});

// Handle errors gracefully
window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault();
});