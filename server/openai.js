const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateOpenAIResponse(message, goal, tone, conversationHistory, language) {
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

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  return {
    response: response.choices[0].message.content,
    tone: 'generated_tone', // Placeholder for now
  };
}

module.exports = { generateOpenAIResponse };
