import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("WARNING: GEMINI_API_KEY environment variable not set");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;
const model = "gemini-2.5-flash";

const systemInstruction = `You are a friendly, expert AI Barista. Your goal is to help users discover and learn about coffee. 
- Be conversational and engaging.
- Provide clear and concise coffee recommendations based on user preferences.
- If the user asks for coffee shop recommendations, you MUST provide a list of exactly 3 places.
- Share interesting facts about coffee beans, brewing methods, and origins.
- If asked for something unrelated to coffee, politely steer the conversation back to coffee.
- Keep your answers relatively short and easy to read on a mobile device.`;

const keywordsForRecommendation = ['tempat', 'kafe', 'coffee shop', 'rekomendasi', 'cari', 'carikan', 'kerja', 'nongkrong'];

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "The name of the coffee shop." },
    subtitle: { type: Type.STRING, description: "A short, catchy subtitle for the AI analysis page in Indonesian. Should be 'Analisis Rekomendasi AI Untuk Anda'." },
    why: {
      type: Type.OBJECT,
      properties: {
        paragraph: { type: Type.STRING, description: "A detailed paragraph in Indonesian explaining why this shop is a good recommendation. Mention ambiance, coffee quality, and work-friendliness." },
        points: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 3 short highlight points in Indonesian, using the format '**Title:** Description...'" }
      },
      required: ['paragraph', 'points']
    },
    hours: {
      type: Type.ARRAY,
      description: "An array of 7 objects for each day (Senin to Minggu) with realistic hours.",
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING },
          time: { type: Type.STRING, description: "e.g., '08:00 - 22:00' or 'Tutup'" }
        },
        required: ['day', 'time']
      }
    },
    facilities: {
      type: Type.ARRAY,
      description: "An array of 5-7 facility names from 'Wi-Fi Gratis', 'Stop Kontak', 'Toilet', 'Area Parkir', 'Area Merokok', 'AC', 'Musik'.",
      items: { type: Type.STRING }
    },
    scores: {
      type: Type.ARRAY,
      description: "An array of 4 score objects for 'Rasa Kopi', 'Suasana Tempat', 'Kesesuaian Harga', 'Fasilitas'.",
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.INTEGER, description: "Score from 0 to 100." }
        },
        required: ['label', 'value']
      }
    }
  },
  required: ['name', 'subtitle', 'why', 'hours', 'facilities', 'scores']
};

app.post('/api/chat', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const containsKeyword = keywordsForRecommendation.some(keyword => message.toLowerCase().includes(keyword));

    if (containsKeyword) {
      const recommendationPrompt = `
        You are a friendly, expert AI Barista. A user is asking for coffee shop recommendations.
        User's request: "${message}"

        Use Google Search to find 3 real and verifiable coffee shops in Indonesia that are a good fit for the user's request. The names must be accurate for a Google Maps search.
        
        Your response must start with a friendly introductory text.
        After the introduction, you MUST provide the list of places as a single, clean JSON code block formatted like this:
        \`\`\`json
        {
          "places": [
            {
              "name": "Example Coffee Shop 1",
              "rating": 4.8,
              "description": "A short, one-sentence description of the place in Indonesian."
            },
            {
              "name": "Example Coffee Shop 2",
              "rating": 4.5,
              "description": "A short, one-sentence description of the place in Indonesian."
            },
            {
              "name": "Example Coffee Shop 3",
              "rating": 4.9,
              "description": "A short, one-sentence description of the place in Indonesian."
            }
          ]
        }
        \`\`\`
        Do not add any text after the JSON block.
      `;
      
      const response = await ai.models.generateContent({
        model: model,
        contents: recommendationPrompt,
        config: {
          tools: [{googleSearch: {}}],
          temperature: 0.5,
        },
      });
      
      const responseText = response.text;
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = groundingChunks
        ?.map(chunk => chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)
        .filter((source) => source !== null) ?? [];

      res.write(`data: ${JSON.stringify({ type: 'text', data: responseText })}\n\n`);
      
      if (sources.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'sources', data: sources })}\n\n`);
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const responseStream = await ai.models.generateContentStream({
        model: model,
        contents: message,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ type: 'text', data: chunk.text })}\n\n`);
        }
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error("Error fetching AI response:", error);
    res.write(`data: ${JSON.stringify({ type: 'error', data: 'Maaf, saya sedang mengalami sedikit masalah. Coba tanyakan lagi nanti.' })}\n\n`);
    res.end();
  }
});

app.post('/api/analysis', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const { shop } = req.body;
  
  if (!shop || !shop.name) {
    return res.status(400).json({ error: 'Shop details are required' });
  }

  const prompt = `
    You are an expert coffee shop reviewer. A user has been recommended the following coffee shop and wants a detailed analysis.
   
    Coffee Shop Details:
    - Name: "${shop.name}"
    - Rating: ${shop.rating} / 5
    - Description: "${shop.description}"
   
    Based on these details, generate a detailed and plausible AI analysis. The analysis should feel realistic and consistent with the provided information. For example, a shop described as 'cozy and good for working' should have facilities like 'Wi-Fi Gratis' and 'Stop Kontak', and a high score for 'Suasana Tempat'. The operational hours should be typical for a coffee shop in Indonesia. The name in the response MUST exactly match the one provided: "${shop.name}".
   
    The output MUST be a single, clean JSON object matching the provided schema. Do not add any text or markdown before or after the JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const jsonText = response.text.trim();
    let analysisData = JSON.parse(jsonText);
    
    const dayMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const todayName = dayMap[new Date().getDay()];
    
    analysisData.hours = analysisData.hours.map(h => {
      if (h.day === todayName) {
        const isOpen = h.time && h.time.toLowerCase() !== 'tutup';
        return { 
          ...h, 
          day: `Hari Ini (${h.day})`,
          status: isOpen ? 'Buka' : 'Tutup'
        };
      }
      return h;
    });

    res.json(analysisData);
  } catch (error) {
    console.error("Error fetching AI analysis:", error);
    res.status(500).json({ error: 'Failed to generate AI analysis.' });
  }
});

app.post('/api/generate-title', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const { messages } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const conversationText = messages
    .slice(1)
    .map(m => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.text || 'Recommendation Sent'}`)
    .join('\n');

  if (conversationText.trim().length < 20) {
    const userQuery = messages.find(m => m.sender === 'user')?.text;
    return res.json({ title: userQuery || "Obrolan Singkat" });
  }

  const prompt = `Based on the following conversation, create a short, concise title in Indonesian (3-5 words max). The title should summarize the main topic of the conversation. Do not use quotes.
  
  Conversation:
  ${conversationText}
  
  Title:`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    const title = response.text.trim().replace(/"/g, '');
    res.json({ title });
  } catch (error) {
    console.error("Error generating title:", error);
    res.json({ title: "Riwayat Obrolan" });
  }
});

app.listen(PORT, 'localhost', () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
