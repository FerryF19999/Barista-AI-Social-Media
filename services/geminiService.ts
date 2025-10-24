import { ChatMessage, CoffeeShop, CoffeeShopAnalysis } from "../types";

const API_BASE_URL = window.location.hostname.includes('localhost')
  ? 'http://localhost:3001' 
  : `https://${window.location.hostname}`;

const reliableShopImages = [
  'https://images.pexels.com/photos/261434/pexels-photo-261434.jpeg?auto=compress&cs=tinysrgb&w=400&dpr=1',
  'https://images.pexels.com/photos/1459339/pexels-photo-1459339.jpeg?auto=compress&cs=tinysrgb&w=400&dpr=1',
  'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg?auto=compress&cs=tinysrgb&w=400&dpr=1',
];

export async function* streamAIBaristaResponse(userMessage: string): AsyncGenerator<{ text?: string; recommendations?: CoffeeShop[]; sources?: { uri: string; title: string }[] }, void, void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch AI response');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No reader available');
    }

    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'text') {
              fullText += parsed.data;
              yield { text: parsed.data };
            } else if (parsed.type === 'sources') {
              yield { sources: parsed.data };
            } else if (parsed.type === 'error') {
              yield { text: parsed.data };
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }

    // Parse recommendations from full text if present
    const jsonRegex = /```json\n([\s\S]*?)\n```/;
    const match = fullText.match(jsonRegex);

    if (match && match[1]) {
      try {
        const jsonString = match[1];
        const jsonResponse = JSON.parse(jsonString);

        const placesWithReliableImages = jsonResponse.places.map((place: CoffeeShop, index: number) => ({
          ...place,
          imageUrl: reliableShopImages[index % reliableShopImages.length]
        }));

        yield { recommendations: placesWithReliableImages as CoffeeShop[] };
      } catch (e) {
        console.error('Error parsing recommendations:', e);
      }
    }
  } catch (error) {
    console.error("Error fetching AI response:", error);
    yield { text: "Maaf, saya sedang mengalami sedikit masalah. Coba tanyakan lagi nanti." };
  }
}

export const getAIAnalysisForShop = async (shop: CoffeeShop): Promise<CoffeeShopAnalysis> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shop }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch AI analysis');
    }

    const analysisData = await response.json();
    return analysisData;
  } catch (error) {
    console.error("Error fetching AI analysis:", error);
    throw new Error("Failed to generate AI analysis.");
  }
};

export const generateConversationTitle = async (messages: ChatMessage[]): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-title`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate title');
    }

    const { title } = await response.json();
    return title;
  } catch (error) {
    console.error("Error generating title:", error);
    return "Riwayat Obrolan";
  }
};
