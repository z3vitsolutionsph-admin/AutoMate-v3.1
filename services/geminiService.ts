
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "./supabaseClient";

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
    const status = error?.status || error?.code || 0;
    // Retry on network errors, 5xx server errors, or specific rate limits
    const isRetryable = 
        status === 429 || 
        status === 503 || 
        status === 504 || 
        error?.message?.includes("fetch") ||
        error?.message?.includes("network");
                        
    if (retries > 0 && isRetryable) {
      const jitter = Math.random() * 200;
      console.warn(`[System] Operation unstable. Retrying in ${delay + jitter}ms... (${retries} attempts left)`);
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

  // Create a fresh instance right before call to ensure latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
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
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
 * Calls the Supabase Edge Function 'row-summarizer' to perform deep analysis.
 * This offloads the heavy lifting and API key management to the secure serverless environment.
 */
export const performDeepAnalysis = async (products: any[], transactions: any[], businessName: string): Promise<any> => {
  return callWithRetry(async () => {
    // 1. Prepare Payload
    // We strictly limit the payload to relevant snapshots to prevent Edge Function timeout or payload size errors.
    const productSnapshot = products
      .filter(p => p.stock < 10 || p.price > 1000) // Focus on critical items
      .slice(0, 50)
      .map(p => ({ name: p.name, stock: p.stock, price: p.price, category: p.category }));

    const transactionSnapshot = transactions
      .slice(0, 50) // Last 50 transactions
      .map(t => ({ product: t.product, amount: t.amount, date: t.date, status: t.status }));

    const stats = {
      totalProducts: products.length,
      totalTransactions: transactions.length,
      totalRevenue: transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    };

    // 2. Invoke Edge Function
    const { data, error } = await supabase.functions.invoke('row-summarizer', {
      body: {
        businessName,
        context: "Strategic Business Intelligence Audit",
        instruction: "Analyze the provided product inventory and transaction history. Identify critical risks (low stock, stalled inventory) and growth opportunities. Provide a summary, prioritized recommendations, a specific risk factor, and scale vectors.",
        data: {
          products: productSnapshot,
          transactions: transactionSnapshot,
          stats: stats
        }
      }
    });

    // 3. Handle Errors
    if (error) {
      console.error("[Edge Function] Analysis failed:", error);
      throw new Error(`Intelligence Node Error: ${error.message || 'Unknown server error'}`);
    }

    if (!data) {
      throw new Error("Intelligence Node returned empty response.");
    }

    // 4. Return Data (Expecting standard JSON format from the function)
    // The function should return: { summary, recommendations[], riskFactor, opportunities[] }
    return data;
  });
};

export const getSupportResponse = async (userMessage: string, storeContext?: string): Promise<string> => {
  if (!process.env.API_KEY) return "AI Offline. Please verify API Key.";
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  if (!process.env.API_KEY) return ["General", "Retail", "Services"];
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
