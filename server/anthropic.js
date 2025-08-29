const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateAnthropicResponse(message, goal, tone, conversationHistory, language) {
  const prompt = `
    You are Calm Companion, a friendly and supportive AI assistant.
    Your goal is to help the user with ${goal}.
    The user's current tone is ${tone}.
    Please respond in a way that is consistent with this goal and tone.
    The user is communicating in ${language}, so please respond in ${language}.

    Conversation History:
    ${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n')}

    User's message: "${message}"

    Your response:
  `;

  const response = await anthropic.completions.create({
    model: 'claude-2',
    prompt: prompt,
    max_tokens_to_sample: 300,
    temperature: 0.7,
  });

  return {
    response: response.completion,
    tone: 'generated_tone', // Placeholder for now
  };
}

module.exports = { generateAnthropicResponse };
