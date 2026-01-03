import { GoogleGenAI, Type } from "@google/genai";

// Initialize the API client exclusively from environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Advanced Retry Mechanism with Exponential Backoff and Jitter.
 * Prevents slamming the API during 429/503 windows.
 */
async function callWithRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 1200
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status || 0;
    const isRetryable = status === 429 || status === 503 || status === 504 || error?.message?.includes("fetch");
                        
    if (retries > 0 && isRetryable) {
      const jitter = Math.random() * 200;
      console.warn(`[AI Engine] Latency/Load detected. Retrying in ${delay + jitter}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      return callWithRetry(fn, retries - 1, delay * 2.5);
    }
    throw error;
  }
}

/**
 * Performs an AI-powered image search using Google Search grounding.
 * Requires gemini-3-pro-image-preview and a paid API key.
 */
export const searchProductImage = async (query: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");

  // Create a fresh instance right before call to ensure latest API key from Select Key dialog is used
  const freshAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return callWithRetry(async () => {
    const response = await freshAi.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            text: `Find a professional, high-resolution commercial photo for: "${query}". 
            Search the web for the exact product or the best visual representation. 
            The image should have a clean white or minimalist studio background. No watermarks.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
        tools: [{ googleSearch: {} }],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Neural search failed to retrieve a visual part.");
  });
};

/**
 * Generates a high-quality product image based on description using AI generation.
 */
export const generateProductImage = async (description: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Professional e-commerce photography of ${description}. 
            Style: 8k resolution, cinematic lighting, ultra-sharp detail, white studio background, high-end commercial aesthetic.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from generation engine.");
  });
};

/**
 * Generates details (Description Variations and Category) for a product.
 */
export const enhanceProductDetails = async (productName: string): Promise<{ category: string, descriptions: string[] }> => {
  if (!process.env.API_KEY) return { category: "General", descriptions: [] };
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Enhance the retail listing for: "${productName}". 
      Provide a highly relevant category and 3 distinct marketing descriptions: 
      1. Professional/Corporate: Concise and formal.
      2. Creative/Story-driven: Emotional and engaging.
      3. Technical/Benefit-driven: Focused on specs and utility.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "Relevant retail category." },
            descriptions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Three distinct marketing variations."
            }
          },
          required: ["category", "descriptions"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

/**
 * Strategy and Logic helpers...
 */
export const performDeepAnalysis = async (products: any[], transactions: any[], businessName: string): Promise<any> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  return callWithRetry(async () => {
    const dataContext = { business: businessName, productCount: products.length, txCount: transactions.length };
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Strategic report for ${businessName}: ${JSON.stringify(dataContext)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskFactor: { type: Type.STRING },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "recommendations", "riskFactor", "opportunities"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const getSupportResponse = async (userMessage: string, storeContext?: string): Promise<string> => {
  if (!process.env.API_KEY) return "AI Offline.";
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userMessage,
      config: { 
        systemInstruction: `You are AutoMate Assistant. Store Context: ${storeContext || "N/A"}`
      },
    });
    return response.text?.trim() || "Error.";
  });
};

export const generateBusinessCategories = async (businessName: string, businessType: string): Promise<string[]> => {
  if (!process.env.API_KEY) return ["General"];
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest 5 categories for a ${businessType} named "${businessName}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  });
}