/**
 * LLM Service - Handles OpenRouter API integration for schedule generation
 * Creates intelligent daily schedules based on tasks and current time
 */

class LLMService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'anthropic/claude-3.5-sonnet'; // Good balance of cost and capability
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
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Secretary AI'
                },
                body: JSON.stringify(payload)
            });

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
     * Generate a dynamic daily schedule based on tasks and current time
     */
    async generateDailySchedule(tasks, currentTime = new Date()) {
        const timeStr = currentTime.toLocaleTimeString('en-US', { 
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

        // Format tasks for the prompt
        const taskList = tasks.map(task => {
            let taskStr = `- ${task.content}`;
            if (task.priority !== 'medium') {
                taskStr += ` [Priority: ${task.priority}]`;
            }
            if (task.section) {
                taskStr += ` [Type: ${task.section.replace('Tasks', '')}]`;
            }
            return taskStr;
        }).join('\n');

        const prompt = `You are an intelligent personal assistant helping create a chronological daily schedule.

Current Date and Time: ${dateStr}, ${timeStr}

Available Tasks:
${taskList}

Instructions:
1. Create a chronological schedule from NOW (${timeStr}) until end of day (around 22:00)
2. Assign realistic time slots for each task based on their nature and priority
3. Consider logical sequencing (e.g., prepare lunch before eating, shower before going out)
4. Include breaks and transition time between tasks
5. Prioritize urgent/high-priority tasks earlier when possible
6. For daily recurring tasks, schedule them at logical times throughout the remaining day
7. If it's late in the day, focus on evening-appropriate tasks

Output format (JSON):
{
  "schedule": [
    {
      "time": "14:30",
      "task": "Task description",
      "duration": "30 minutes",
      "priority": "high|medium|low",
      "category": "work|personal|routine|urgent"
    }
  ],
  "summary": "Brief overview of the schedule and reasoning"
}

Make the schedule practical and actionable for the remaining part of the day.`;

        try {
            const payload = {
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000,
                response_format: { type: 'json_object' }
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

            // Add metadata
            scheduleData.generatedAt = currentTime.toISOString();
            scheduleData.generatedFor = dateStr;
            scheduleData.usage = response.usage;

            return scheduleData;
        } catch (error) {
            console.error('Error generating schedule:', error);
            
            // Return a fallback schedule if LLM fails
            if (error.message.includes('JSON')) {
                console.warn('LLM returned invalid JSON, creating fallback schedule');
                return this.createFallbackSchedule(tasks, currentTime);
            }
            
            throw error;
        }
    }

    /**
     * Create a simple fallback schedule when LLM fails
     */
    createFallbackSchedule(tasks, currentTime) {
        const schedule = [];
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();
        
        let scheduleTime = new Date(currentTime);
        
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
                task: task.content.split('\n')[0], // Just the main task, not sub-tasks
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
            const payload = {
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: 'Respond with just "OK" to confirm the connection is working.'
                    }
                ],
                max_tokens: 10,
                temperature: 0
            };

            const response = await this.makeRequest(payload);
            
            if (response.choices && response.choices[0] && response.choices[0].message) {
                return {
                    success: true,
                    model: this.model,
                    response: response.choices[0].message.content.trim()
                };
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get estimated cost for a request (rough estimate)
     */
    estimateCost(inputTokens, outputTokens) {
        // Claude-3.5-Sonnet pricing (approximate)
        const inputCostPer1K = 0.003;  // $3 per 1M tokens
        const outputCostPer1K = 0.015; // $15 per 1M tokens
        
        const inputCost = (inputTokens / 1000) * inputCostPer1K;
        const outputCost = (outputTokens / 1000) * outputCostPer1K;
        
        return {
            inputCost: inputCost,
            outputCost: outputCost,
            totalCost: inputCost + outputCost,
            inputTokens: inputTokens,
            outputTokens: outputTokens
        };
    }
}

// Export for use in other modules
window.LLMService = LLMService;