
const { configureGenkit } = require('genkit');
const { googleAI } = require('@genkit-ai/googleai');

configureGenkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

const { genkit, defineFlow } = require('genkit');

const calmCompanionFlow = defineFlow(
  {
    name: 'calmCompanionFlow',
    inputSchema: {
      message: 'string',
      goal: 'string',
      tone: 'string',
      conversationHistory: 'array',
      language: 'string',
    },
    outputSchema: {
      response: 'string',
      tone: 'string',
    },
  },
  async ({ message, goal, tone, conversationHistory, language }) => {
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

    const llmResponse = await genkit.llm.generate({
      prompt: prompt,
      model: 'gemini-1.5-flash',
      config: {
        temperature: 0.7,
      },
    });

    return {
      response: llmResponse.text(),
      tone: 'generated_tone', // Placeholder for now
    };
  }
);

const toneAnalysisFlow = defineFlow(
  {
    name: 'toneAnalysisFlow',
    inputSchema: {
      message: 'string',
      language: 'string',
    },
    outputSchema: {
      tone: 'string',
    },
  },
  async ({ message, language }) => {
    const prompt = `
      Analyze the emotional tone of the following message, which is in ${language}.
      Categorize the tone as one of the following:
      - neutral
      - friendly
      - joyful
      - sad
      - angry
      - stressed
      - excited

      Message: "${message}"

      Tone:
    `;

    const llmResponse = await genkit.llm.generate({
      prompt: prompt,
      model: 'gemini-1.5-flash',
      config: {
        temperature: 0.2,
      },
    });

    const detectedTone = llmResponse.text().trim().toLowerCase();

    return {
      tone: detectedTone,
    };
  }
);

const languageDetectionFlow = defineFlow(
  {
    name: 'languageDetectionFlow',
    inputSchema: {
      message: 'string',
    },
    outputSchema: {
      language: 'string',
    },
  },
  async ({ message }) => {
    const prompt = `
      Detect the language of the following message.
      Return only the language name (e.g., 'English', 'Spanish', 'French').

      Message: "${message}"

      Language:
    `;

    const llmResponse = await genkit.llm.generate({
      prompt: prompt,
      model: 'gemini-1.5-flash',
      config: {
        temperature: 0.1,
      },
    });

    const detectedLanguage = llmResponse.text().trim();

    return {
      language: detectedLanguage,
    };
  }
);

module.exports = { calmCompanionFlow, toneAnalysisFlow, languageDetectionFlow };
