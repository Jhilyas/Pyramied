const express = require('express');
const router = express.Router();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

const SYSTEM_PROMPT = `You are Pyramied AI Tutor — a friendly, knowledgeable educational assistant embedded in the Pyramied Learning Management System. 

Your role:
- Help students understand lessons, assignments, and concepts
- Explain things clearly and concisely
- Encourage learning and critical thinking
- Be supportive and patient
- Answer in the same language the student uses (you support French, English, Spanish, and more)
- Keep responses focused and not too long (2-4 paragraphs max)
- Use examples when helpful

You should NOT:
- Do homework or assignments for students
- Provide direct answers to quiz/exam questions
- Make up information — say "I'm not sure" if you don't know`;

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.json({
        reply: "AI Tutor is not configured yet. The administrator needs to set the OPENROUTER_API_KEY environment variable."
      });
    }

    // Build conversation history for the API
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))
    ];

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pyramied.onrender.com',
        'X-Title': 'Pyramied AI Tutor',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: apiMessages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      res.json({ reply: data.choices[0].message.content });
    } else {
      console.error('[AI] Unexpected response:', data);
      res.json({ reply: "I'm having trouble thinking right now. Please try again in a moment." });
    }
  } catch (err) {
    console.error('[AI] Error:', err.message);
    res.json({ reply: "Sorry, I couldn't process that. Please try again." });
  }
});

module.exports = router;
