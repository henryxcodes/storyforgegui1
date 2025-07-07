import Anthropic from "@anthropic-ai/sdk";
import { KnowledgeBase } from "./knowledge-base.js";

// Global knowledge base instance
let knowledgeBase: KnowledgeBase | null = null;

// Initialize knowledge base
async function initializeKnowledgeBase(): Promise<KnowledgeBase | null> {
  if (!knowledgeBase) {
    knowledgeBase = new KnowledgeBase();
    try {
      await knowledgeBase.initialize();
      console.log('✅ Knowledge base ready for RAG queries');
          } catch (error: any) {
        console.warn('⚠️  Knowledge base initialization failed, continuing without RAG:', error.message);
      knowledgeBase = null;
        // Don't throw error - allow server to continue running
        return null;
    }
  }
  return knowledgeBase;
}

// Helper function to extract first 200 words from story prompt
function extractFirst200Words(text: string): string {
  const words = text.trim().split(/\s+/);
  return words.slice(0, 200).join(' ');
}

// Helper function to validate that expanded story preserves first 200 words
function validateFirst200Words(originalText: string, expandedText: string): boolean {
  const original200 = extractFirst200Words(originalText);
  const expanded200 = extractFirst200Words(expandedText);
  
  // Allow for minor variations in spacing/punctuation but require substantial overlap
  const wordsOriginal = original200.toLowerCase().split(/\s+/);
  const wordsExpanded = expanded200.toLowerCase().split(/\s+/);
  
  let matches = 0;
  for (let i = 0; i < Math.min(wordsOriginal.length, wordsExpanded.length); i++) {
    if (wordsOriginal[i] === wordsExpanded[i]) {
      matches++;
    }
  }
  
  // Require at least 95% word match in first 200 words
  return (matches / wordsOriginal.length) >= 0.95;
}

export async function expandStory(storyPrompt: string, apiKey?: string) {
  // Initialize knowledge base if not already done
  await initializeKnowledgeBase();

  // API Key priority: passed parameter > environment variable
  const hardcodedApiKey = process.env.ANTHROPIC_API_KEY;
  
  const anthropic = new Anthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY || hardcodedApiKey,
    timeout: 300000, // 5 minutes timeout for long story generation
    maxRetries: 2, // Retry twice on failure
  });

  // Generate RAG context from knowledge base
  let ragContext = "";
  if (knowledgeBase) {
    try {
      ragContext = knowledgeBase.generateContextForPrompt(storyPrompt);
      const stats = knowledgeBase.getStats();
      console.log(`RAG Context generated from ${stats.totalStories} stories with ${stats.totalChunks} chunks`);
    } catch (error) {
      console.error('Error generating RAG context:', error);
      ragContext = "Using default narrative guidelines for story expansion.";
    }
  } else {
    ragContext = "Knowledge base not available. Using default narrative guidelines for story expansion.";
  }

  // Enhanced system prompt with RAG context
  const enhancedSystemPrompt = `You are a professional YouTube story expander specializing in Reddit-style narratives. Your goal is to expand scripts that are 2-3 minutes long into 75-90 minute long scripts (MINIMUM 14,000 words, target 15,000-16,000 words).

${ragContext}

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
- Ensure pronouns, reactions, and character interactions reflect a male narrator throughout`;

  // Replace placeholders like {{STORY_PROMPT}} with real values,
  // because the SDK does not support variables.
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
        max_tokens: 32000,
    temperature: 1,
    system: enhancedSystemPrompt,
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": `Story Prompt to Expand:

<prompt>
${storyPrompt}
</prompt>

Continue writing a unique Reddit-style story targeted at a 15–25-year-old audience. The story must be emotionally engaging, relatable, and designed to hold the viewer's attention all the way through. Use the first 200 words of the input story exactly as written to begin your script. After that, develop the plot with strong character arcs, emotional twists, and moments of suspense or tension that match the tone and pacing of the opening.

CRITICAL PERSPECTIVE REQUIREMENT:
- The entire story MUST be told from a MALE perspective using first-person "I" narration
- If the original prompt features a female narrator, automatically convert it to a male narrator's perspective
- Adapt all experiences, emotions, relationships, and situations to reflect a male protagonist's viewpoint
- Ensure all pronouns, reactions, and character dynamics are consistent with a male narrator

CRITICAL WORD COUNT REQUIREMENT - MINIMUM 14,000 WORDS:
This is absolutely mandatory. The story must reach AT LEAST 14,000 words (preferably 15,000-16,000). This is about 90 minutes of spoken content. DO NOT finish early. Keep expanding the narrative until you reach this target.

WORD COUNT CHECKPOINTS:
- At 3,000 words: You should just be establishing the main conflict, DO NOT giveaway the crux of the story here, just build
- At 6,000 words: Character development and subplots should be deepening  
- At 9,000 words: Major plot complications and turning points
- At 12,000 words: Building toward climax with multiple storylines converging
- At 14,000+ words: Resolution and conclusion

EXPANDED STORYTELLING REQUIREMENTS:
- Develop complex character backstories and motivations that unfold gradually
- Create multiple interconnected plot threads that build toward a satisfying climax
- Include detailed scene setting, character emotions, and psychological depth
- Show character growth and transformation throughout the extended narrative
- Add tension through relationship dynamics, internal conflicts, and external obstacles
- Use foreshadowing, callbacks, and narrative payoffs to reward long-form engagement
- Maintain viewer engagement through strategic pacing and emotional peaks/valleys
- Add extensive dialogue scenes that reveal character depth
- Include multiple time periods, flashbacks, and perspective shifts
- Explore consequences of actions over extended time periods

REALISM AND BELIEVABILITY REQUIREMENTS:
- Ground the story in realistic scenarios with believable character motivations and reactions
- Include authentic human emotions: confusion, hesitation, conflicted feelings, and gradual realization
- Show realistic consequences for character actions (social, legal, financial, emotional)
- Characters should make believable mistakes and have realistic limitations in knowledge/ability
- Include mundane but grounding details: work responsibilities, family obligations, financial concerns
- Use natural, age-appropriate dialogue that sounds like real conversation, not scripted drama
- Show realistic timelines - major changes, healing, and trust-building take time
- Include practical obstacles and realistic problem-solving approaches
- Characters should have genuine flaws, contradictions, and moments of uncertainty
- Avoid unrealistic coincidences - events should flow logically from character choices
- Show realistic relationship dynamics with complexity, miscommunication, and gradual development
- Include realistic research and planning phases when characters need to solve problems
- Characters should react to stress and trauma in psychologically authentic ways
- Include realistic social dynamics, workplace politics, and community relationships
- Show characters balancing major plot events with everyday life responsibilities

IMPORTANT: Do not explain anything—just write the story. Structure it for a social media audience, with immersive pacing and cliffhangers that keep people watching. 

FINAL VERIFICATION: Before concluding, ensure the story has reached AT LEAST 14,000 words. If not, continue expanding with additional plot developments, character interactions, and narrative depth.`
          }
        ]
      }
    ]
  });

  // Validate that the first 200 words are preserved
  const expandedContent = msg.content[0].type === 'text' ? msg.content[0].text : '';
  const isValid = validateFirst200Words(storyPrompt, expandedContent);
  
  if (!isValid) {
    console.warn('⚠️  WARNING: Expanded story does not preserve the first 200 words correctly');
    console.warn('Original first 200:', extractFirst200Words(storyPrompt));
    console.warn('Expanded first 200:', extractFirst200Words(expandedContent));
    
    // Could optionally retry or throw an error here
    // For now, we'll just log the warning and return the result
  } else {
    console.log('✅ First 200 words validation passed');
  }

  return msg;
}

export async function expandStoryWithCustomPrompt(storyPrompt: string, customPrompt: any, apiKey?: string) {
  // Initialize knowledge base if not already done
  await initializeKnowledgeBase();

  // API Key priority: passed parameter > environment variable
  const hardcodedApiKey = process.env.ANTHROPIC_API_KEY;
  
  const anthropic = new Anthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY || hardcodedApiKey,
    timeout: 300000, // 5 minutes timeout for long story generation
    maxRetries: 2, // Retry twice on failure
  });

  // Generate RAG context from knowledge base
  let ragContext = "";
  if (knowledgeBase) {
    try {
      ragContext = knowledgeBase.generateContextForPrompt(storyPrompt);
      const stats = knowledgeBase.getStats();
      console.log(`RAG Context generated from ${stats.totalStories} stories with ${stats.totalChunks} chunks`);
    } catch (error) {
      console.error('Error generating RAG context:', error);
      ragContext = "Using default narrative guidelines for story expansion.";
    }
  } else {
    ragContext = "Knowledge base not available. Using default narrative guidelines for story expansion.";
  }

  // Build custom system prompt
  const customSystemPrompt = `${customPrompt.system || ''}

${ragContext}

${customPrompt.critical || ''}

${customPrompt.realism || ''}

${customPrompt.additional || ''}`;

  // Build user message from custom prompt or use default
  const userMessage = customPrompt.userMessage || `Story Prompt to Expand:

<prompt>
${storyPrompt}
</prompt>

Continue writing a unique Reddit-style story targeted at a 15–25-year-old audience. The story must be emotionally engaging, relatable, and designed to hold the viewer's attention all the way through. Use the first 200 words of the input story exactly as written to begin your script. After that, develop the plot with strong character arcs, emotional twists, and moments of suspense or tension that match the tone and pacing of the opening.

CRITICAL WORD COUNT REQUIREMENT - MINIMUM 14,000 WORDS:
This is absolutely mandatory. The story must reach AT LEAST 14,000 words (preferably 15,000-16,000). This is about 90 minutes of spoken content. DO NOT finish early. Keep expanding the narrative until you reach this target.

FINAL VERIFICATION: Before concluding, ensure the story has reached AT LEAST 14,000 words. If not, continue expanding with additional plot developments, character interactions, and narrative depth.`;

  // Replace {{STORY_PROMPT}} placeholder if present in custom user message
  const finalUserMessage = userMessage.replace(/\{\{STORY_PROMPT\}\}/g, storyPrompt);

  // The message with custom prompt
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 32000,
    temperature: 1,
    system: customSystemPrompt,
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": finalUserMessage
          }
        ]
      }
    ]
  });

  // Validate that the first 200 words are preserved (same validation as original function)
  const expandedContent = msg.content[0].type === 'text' ? msg.content[0].text : '';
  const isValid = validateFirst200Words(storyPrompt, expandedContent);
  
  if (!isValid) {
    console.warn('⚠️  WARNING: Expanded story does not preserve the first 200 words correctly');
    console.warn('Original first 200:', extractFirst200Words(storyPrompt));
    console.warn('Expanded first 200:', extractFirst200Words(expandedContent));
  } else {
    console.log('✅ First 200 words validation passed');
  }

  return msg;
}

// Export function to get knowledge base stats for API endpoint
export async function getKnowledgeBaseStats() {
  await initializeKnowledgeBase();
  return knowledgeBase ? knowledgeBase.getStats() : null;
}
