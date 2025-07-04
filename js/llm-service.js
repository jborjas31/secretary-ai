/**
 * LLM Service - Handles OpenRouter API integration for schedule generation
 * Creates intelligent daily schedules based on tasks and current time
 */

class LLMService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = APP_CONFIG.openrouter.defaultModel || 'deepseek/deepseek-r1';
        this.fallbackModels = [
            'deepseek/deepseek-r1:free',         // Same model, free tier (1st fallback)
            'openai/gpt-4o-mini',                // Cost-effective with good structured output ($0.15/1M)
            'anthropic/claude-3.5-sonnet',       // Proven reliable for complex scheduling ($3/1M)
            'deepseek/deepseek-r1-distill-llama-70b', // Alternative DeepSeek model ($0.10/$0.40)
            'openai/gpt-4o',                     // Premium option for edge cases ($2.50/1M)
            'meta-llama/llama-3.1-8b-instruct:free'  // Emergency free fallback
        ];
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Set the API key for OpenRouter
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Check if API key is configured
     */
    isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Make a request to OpenRouter API with retry logic
     */
    async makeRequest(payload, attempt = 1) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        try {
            // Create timeout controller (30 seconds)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin, // Required for OpenRouter app identification
                    'X-Title': 'Secretary AI - Daily Task Scheduler' // App title for OpenRouter leaderboards
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            // Clear timeout if request completes
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
                
                // Handle specific error codes
                if (response.status === 401) {
                    throw new Error('Invalid API key. Please check your OpenRouter API key.');
                } else if (response.status === 402) {
                    throw new Error('Insufficient credits. Please add more credits to your OpenRouter account.');
                } else if (response.status === 429 && attempt < this.maxRetries) {
                    // Rate limiting - retry with backoff
                    await this.delay(this.retryDelay * attempt);
                    return this.makeRequest(payload, attempt + 1);
                }
                
                throw new Error(`OpenRouter API error: ${errorMessage}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            // Handle timeout specifically
            if (error.name === 'AbortError') {
                throw new Error('Request timed out after 30 seconds. Please try again.');
            }
            
            // Retry logic for other errors
            if (attempt < this.maxRetries && !error.message.includes('API key') && !error.message.includes('credits')) {
                console.warn(`Request failed (attempt ${attempt}), retrying...`, error);
                await this.delay(this.retryDelay * attempt);
                return this.makeRequest(payload, attempt + 1);
            }
            throw error;
        }
    }

    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Set the model to use for generation
     */
    setModel(modelId) {
        this.model = modelId;
    }

    /**
     * Get current model
     */
    getCurrentModel() {
        return this.model;
    }

    /**
     * Get human-readable model name
     */
    getModelDisplayName() {
        const modelMap = {
            'anthropic/claude-3.5-sonnet': 'Claude 3.5',
            'openai/gpt-4o': 'GPT-4o',
            'openai/gpt-4o-mini': 'GPT-4o Mini',
            'deepseek/deepseek-r1': 'DeepSeek R1',
            'deepseek/deepseek-r1:free': 'DeepSeek R1 Free'
        };
        
        return modelMap[this.model] || this.model.split('/').pop();
    }

    /**
     * Generate a dynamic daily schedule based on tasks and current time
     * @param {Array} tasks - Array of task objects
     * @param {Date} currentTime - Current date/time (or target date)
     * @param {Object} context - Optional multi-day context for enhanced scheduling
     */
    async generateDailySchedule(tasks, currentTime = new Date(), context = {}) {
        // Determine appropriate schedule start time
        const now = new Date();
        const targetDate = new Date(currentTime);
        targetDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let scheduleStartTime;
        if (targetDate > today) {
            // For future dates, start from beginning of day (7:00 AM)
            scheduleStartTime = new Date(targetDate);
            scheduleStartTime.setHours(7, 0, 0, 0);
        } else if (targetDate.getTime() === today.getTime()) {
            // For today, use current time
            scheduleStartTime = now;
        } else {
            // For past dates, use the passed time (shouldn't generate but handle gracefully)
            scheduleStartTime = currentTime;
        }
        
        const timeStr = scheduleStartTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        const dateStr = currentTime.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Debug logging
        console.log('Schedule generation debug:', {
            targetDate: targetDate.toISOString(),
            today: today.toISOString(),
            isFutureDate: targetDate > today,
            scheduleStartTime: scheduleStartTime.toISOString(),
            timeStr: timeStr,
            dateStr: dateStr
        });

        // Use enhanced prompt if context is provided
        const systemPrompt = `You are an intelligent personal assistant that creates practical, chronological daily schedules. You MUST respond with valid JSON only, no other text.`;
        
        let userPrompt;
        if (context && Object.keys(context).length > 0) {
            userPrompt = this.createEnhancedPrompt(tasks, currentTime, dateStr, timeStr, context, targetDate, today);
        } else {
            // Standard prompt for backward compatibility
            const taskList = this.formatTaskList(tasks);
            const startTimeInstruction = targetDate > today 
                ? `Start the schedule at EXACTLY ${timeStr} (morning time)` 
                : `Start from the current time (${timeStr})`;
                
            userPrompt = `Create a chronological daily schedule from the specified start time until end of day (around 22:00).

Current Date: ${dateStr}
Schedule Start Time: ${timeStr}

Available Tasks:
${taskList}

Schedule Guidelines:
1. ${startTimeInstruction} and schedule until 22:00
2. Assign realistic time slots (15-60 minutes per task)
3. Use logical sequencing (prepare lunch before eating, shower before going out)
4. Prioritize urgent/high-priority tasks earlier
5. Include brief transition time between tasks
6. For daily recurring tasks, schedule at appropriate times
7. If it's late, focus on evening-appropriate tasks

IMPORTANT: Respond with ONLY valid JSON in this exact format:
{
  "schedule": [
    {
      "time": "14:30",
      "text": "Task description",
      "duration": "30 minutes", 
      "priority": "high",
      "category": "urgent"
    }
  ],
  "summary": "Brief explanation of the schedule logic"
}

CRITICAL: The FIRST task in the schedule array MUST start at ${timeStr}

Use these categories: work, personal, routine, urgent, health, social
Use these priorities: high, medium, low`;
        }

        // Try with the user's selected model first, then fallback if needed
        const modelsToTry = [this.model, ...this.fallbackModels];
        
        for (let i = 0; i < modelsToTry.length; i++) {
            const currentModel = modelsToTry[i];
            const isLastModel = i === modelsToTry.length - 1;
            
            try {
                console.log(`Attempting schedule generation with model: ${currentModel}`);
                
                const payload = {
                    model: currentModel, // Use only the specific model, not the models array
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userPrompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 4000, // Increased from 2000 to handle 100+ tasks without truncation
                    response_format: {
                        type: 'json_schema',
                        json_schema: {
                            name: 'daily_schedule',
                            strict: true,
                            schema: {
                                type: 'object',
                                properties: {
                                    schedule: {
                                        type: 'array',
                                        description: 'Array of scheduled tasks for the day',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                time: {
                                                    type: 'string',
                                                    description: 'Time in HH:MM format (24-hour)',
                                                    pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
                                                },
                                                text: {
                                                    type: 'string',
                                                    description: 'Brief description of the task'
                                                },
                                                duration: {
                                                    type: 'string',
                                                    description: 'Estimated duration (e.g., "30 minutes", "1 hour")'
                                                },
                                                priority: {
                                                    type: 'string',
                                                    enum: ['high', 'medium', 'low'],
                                                    description: 'Task priority level'
                                                },
                                                category: {
                                                    type: 'string',
                                                    enum: ['work', 'personal', 'routine', 'urgent', 'health', 'social'],
                                                    description: 'Task category'
                                                }
                                            },
                                            required: ['time', 'text', 'duration', 'priority', 'category'],
                                            additionalProperties: false
                                        }
                                    },
                                    summary: {
                                        type: 'string',
                                        description: 'Brief explanation of the schedule logic and priorities'
                                    }
                                },
                                required: ['schedule', 'summary'],
                                additionalProperties: false
                            }
                        }
                    }
                };

                const response = await this.makeRequest(payload);
                
                if (!response.choices || !response.choices[0] || !response.choices[0].message) {
                    throw new Error('Invalid response format from OpenRouter');
                }

                const content = response.choices[0].message.content;
                const scheduleData = JSON.parse(content);
                
                // Validate the response structure
                if (!scheduleData.schedule || !Array.isArray(scheduleData.schedule)) {
                    throw new Error('Invalid schedule format in LLM response');
                }

                // Add metadata including which model was actually used
                scheduleData.generatedAt = currentTime.toISOString();
                scheduleData.generatedFor = dateStr;
                scheduleData.usage = response.usage;
                scheduleData.modelUsed = currentModel;
                if (currentModel !== this.model) {
                    scheduleData.fallbackUsed = true;
                    console.log(`Fallback model used: ${currentModel} (user selected: ${this.model})`);
                }

                return scheduleData;
                
            } catch (error) {
                console.error(`Error with model ${currentModel}:`, error);
                
                // If this is the last model or it's a JSON parsing error, handle differently
                if (isLastModel) {
                    // Return a fallback schedule if all models fail
                    if (error.message.includes('JSON')) {
                        console.warn('All models returned invalid JSON, creating fallback schedule');
                        return this.createFallbackSchedule(tasks, currentTime);
                    }
                    throw error;
                } else if (error.message.includes('JSON')) {
                    // JSON errors likely indicate model-specific issues, try next model
                    console.warn(`Model ${currentModel} returned invalid JSON, trying next model...`);
                    continue;
                }
                
                // For API errors like 401, 402, don't try other models
                if (error.message.includes('API key') || error.message.includes('credits')) {
                    throw error;
                }
                
                // For other errors, continue to next model
                console.warn(`Model ${currentModel} failed, trying next model...`);
            }
        }
    }

    /**
     * Create a simple fallback schedule when LLM fails
     */
    createFallbackSchedule(tasks, currentTime) {
        const schedule = [];
        
        // Determine appropriate schedule start time (same logic as main method)
        const now = new Date();
        const targetDate = new Date(currentTime);
        targetDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let scheduleTime;
        if (targetDate > today) {
            // For future dates, start from beginning of day (7:00 AM)
            scheduleTime = new Date(targetDate);
            scheduleTime.setHours(7, 0, 0, 0);
        } else if (targetDate.getTime() === today.getTime()) {
            // For today, use current time
            scheduleTime = new Date(now);
        } else {
            // For past dates, use the passed time
            scheduleTime = new Date(currentTime);
        }
        
        // Round up to next 15-minute interval
        const remainder = scheduleTime.getMinutes() % 15;
        if (remainder > 0) {
            scheduleTime.setMinutes(scheduleTime.getMinutes() + (15 - remainder));
        }

        // Add tasks with 30-45 minute intervals
        tasks.slice(0, 8).forEach((task, index) => {
            const timeStr = scheduleTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });

            schedule.push({
                time: timeStr,
                text: task.content.split('\n')[0], // Just the main task, not sub-tasks
                duration: task.section === 'dailyTasks' ? '15-30 minutes' : '30-45 minutes',
                priority: task.priority,
                category: this.categorizeTask(task.section)
            });

            // Add 30-45 minutes for next task
            const duration = task.section === 'dailyTasks' ? 30 : 45;
            scheduleTime.setMinutes(scheduleTime.getMinutes() + duration);
            
            // Don't schedule past 22:00
            if (scheduleTime.getHours() >= 22) {
                return;
            }
        });

        return {
            schedule: schedule,
            summary: 'Fallback schedule created due to AI service unavailability. Tasks are arranged in priority order with estimated durations.',
            generatedAt: currentTime.toISOString(),
            generatedFor: currentTime.toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            fallback: true
        };
    }

    /**
     * Categorize task based on section
     */
    categorizeTask(section) {
        const categoryMap = {
            'todayTasks': 'urgent',
            'upcomingTasks': 'urgent',
            'dailyTasks': 'routine',
            'weeklyTasks': 'personal',
            'undatedTasks': 'personal'
        };
        return categoryMap[section] || 'personal';
    }

    /**
     * Test the API connection and key validity
     */
    async testConnection() {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        try {
            // Use the auth endpoint to check key validity
            const authResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Secretary AI - Daily Task Scheduler'
                }
            });

            if (!authResponse.ok) {
                throw new Error(`Authentication failed: ${authResponse.status}`);
            }

            const authData = await authResponse.json();
            
            return {
                success: true,
                keyInfo: authData.data,
                creditsUsed: authData.data.usage,
                creditsLimit: authData.data.limit,
                isFreeTier: authData.data.is_free_tier
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get available models from OpenRouter
     */
    async getAvailableModels() {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Secretary AI - Daily Task Scheduler'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }

            const data = await response.json();
            return data.data.filter(model => 
                // Filter for models that support structured outputs and are reasonably priced
                model.supported_parameters?.includes('structured_outputs') &&
                parseFloat(model.pricing.completion) < 0.01 // Less than $0.01 per token
            );
        } catch (error) {
            console.error('Error fetching available models:', error);
            return [];
        }
    }

    /**
     * Get estimated cost for a request (rough estimate)
     */
    estimateCost(inputTokens, outputTokens, modelId = null) {
        const currentModel = modelId || this.model;
        
        // Pricing per 1000 tokens (input, output)
        const modelPricing = {
            'anthropic/claude-3.5-sonnet': { input: 0.003, output: 0.015 },
            'deepseek/deepseek-r1': { input: 0.00005, output: 0.0001 },
            'deepseek/deepseek-r1:free': { input: 0, output: 0 },
            'deepseek/deepseek-r1-distill-llama-70b': { input: 0.0001, output: 0.0004 },
            'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
            'openai/gpt-4o': { input: 0.0025, output: 0.01 },
            'meta-llama/llama-3.1-8b-instruct:free': { input: 0, output: 0 },
            'microsoft/phi-3-medium-128k-instruct:free': { input: 0, output: 0 }
        };
        
        // Get pricing for the current model, fallback to Claude 3.5 Sonnet pricing
        const pricing = modelPricing[currentModel] || modelPricing['anthropic/claude-3.5-sonnet'];
        
        const inputCost = (inputTokens / 1000) * pricing.input;
        const outputCost = (outputTokens / 1000) * pricing.output;
        
        return {
            inputCost: inputCost,
            outputCost: outputCost,
            totalCost: inputCost + outputCost,
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            model: currentModel,
            pricing: pricing
        };
    }

    /**
     * Format task list for prompts
     */
    formatTaskList(tasks) {
        return tasks.map(task => {
            let taskStr = `- ${task.content}`;
            if (task.priority !== 'medium') {
                taskStr += ` [Priority: ${task.priority}]`;
            }
            if (task.section) {
                taskStr += ` [Type: ${task.section.replace('Tasks', '')}]`;
            }
            if (task.isRollover) {
                taskStr += ` [ROLLOVER from ${task.rolloverFrom}]`;
            }
            return taskStr;
        }).join('\n');
    }

    /**
     * Create enhanced prompt with multi-day context
     */
    createEnhancedPrompt(tasks, currentTime, dateStr, timeStr, context, targetDate, today) {
        const taskList = this.formatTaskList(tasks);
        const isFutureDate = targetDate > today;
        
        let prompt = `Create a context-aware daily schedule considering past performance and future commitments.

Current Date: ${dateStr}
Schedule Start Time: ${timeStr} ${isFutureDate ? '(This is the morning start time for this future date)' : '(Current time)'}

Available Tasks:
${taskList}`;

        // Add rollover tasks section if present
        if (context.rolloverTasks && context.rolloverTasks.length > 0) {
            const rolloverList = this.formatTaskList(context.rolloverTasks);
            prompt += `

IMPORTANT - Incomplete Tasks from Previous Day:
${rolloverList}
These tasks were not completed yesterday and should be prioritized today.`;
        }

        // Add workload context
        if (context.workloadSummary) {
            const ws = context.workloadSummary;
            prompt += `

Workload Analysis:
- Average daily workload: ${ws.averageHours} hours
- Today's estimated workload: ${context.currentWorkload?.totalHours || 'Unknown'} hours`;
            
            if (ws.overloadedDays && ws.overloadedDays.length > 0) {
                prompt += `
- Warning: ${ws.overloadedDays.length} day(s) in the period are overloaded (>8 hours)`;
            }
            
            if (ws.recommendations && ws.recommendations.length > 0) {
                prompt += `
- Recommendations: ${ws.recommendations.map(r => r.message).join('; ')}`;
            }
        }

        // Add upcoming schedules context
        if (context.upcomingSchedules && context.upcomingSchedules.length > 0) {
            const upcomingSummary = context.upcomingSchedules
                .slice(0, 3) // Next 3 days
                .map(day => `  - ${day.date}: ${day.taskCount} tasks, ${day.totalHours} hours`)
                .join('\n');
            
            prompt += `

Upcoming Days:
${upcomingSummary}`;
        }

        // Add completion patterns if available
        if (context.recentPatterns) {
            const patterns = context.recentPatterns;
            prompt += `

Historical Performance:
- Average completion rate: ${patterns.averageCompletion || 0}%
- Tasks completed per day: ${patterns.averageTasksCompleted || 0}`;
            
            if (patterns.bestProductiveHours) {
                prompt += `
- Most productive hours: ${patterns.bestProductiveHours}`;
            }
        }

        // Enhanced guidelines
        const startInstruction = isFutureDate 
            ? `Start the first task at EXACTLY ${timeStr} - this is the morning start time`
            : `Start from NOW (${timeStr})`;
            
        prompt += `

Enhanced Schedule Guidelines:
1. ${startInstruction} and schedule until 22:00
2. PRIORITIZE rollover tasks from previous days
3. Consider workload balance - if today is overloaded, identify tasks that could be deferred
4. Assign realistic time slots based on task complexity (15-90 minutes)
5. Use logical sequencing and include transition times
6. For recurring tasks, schedule at historically successful times if known
7. If the upcoming days are heavily loaded, try to complete more today
8. Learn from completion patterns - schedule important tasks during productive hours

IMPORTANT: Respond with ONLY valid JSON in this exact format:
{
  "schedule": [
    {
      "time": "14:30",
      "text": "Task description",
      "duration": "30 minutes", 
      "priority": "high",
      "category": "urgent",
      "isRollover": true
    }
  ],
  "summary": "Brief explanation of the schedule logic including rollover handling and workload considerations"
}

CRITICAL: The FIRST task in the schedule array MUST start at EXACTLY ${timeStr}

Use these categories: work, personal, routine, urgent, health, social
Use these priorities: high, medium, low
Add "isRollover": true for tasks that were incomplete from previous days`;

        return prompt;
    }
}

// Export for use in other modules
window.LLMService = LLMService;
export { LLMService };