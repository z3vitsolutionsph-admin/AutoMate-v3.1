
import { GoogleGenAI, Type, Schema } from "@google/genai";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper: Robust Retry Logic ---
async function callWithRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 1000,
  fallbackValue?: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.warn(`AI Service Error. Retrying in ${delay}ms... (${retries} attempts left).`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2, fallbackValue);
    }
    console.error("AI Service Validation Failed after retries:", error);
    if (fallbackValue !== undefined) return fallbackValue;
    throw error;
  }
}

/**
 * Suggests a category for a product based on its name and description.
 */
export const categorizeProduct = async (name: string, description: string): Promise<string> => {
  if (!process.env.API_KEY) return "Uncategorized";

  return callWithRetry(async () => {
    const prompt = `
      You are an inventory assistant. 
      Categorize the product "${name}" (${description}) into a single, short category name.
      Return ONLY the category name.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "Uncategorized";
  }, 2, 1000, "Manual Review");
};

/**
 * Generates details (Description and Category) for a product based on its name.
 */
export const enhanceProductDetails = async (productName: string): Promise<{ category: string, description: string }> => {
  if (!process.env.API_KEY) return { category: "Uncategorized", description: "" };

  return callWithRetry(async () => {
    const prompt = `
      For product "${productName}", generate:
      1. A professional description (max 1 sentence).
      2. A standard category name.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      }
    });
    
    const text = response.text || "{}";
    const json = JSON.parse(text);
    
    return {
      category: json.category || "Uncategorized",
      description: json.description || ""
    };
  }, 3, 1000, { category: "General", description: "Details unavailable." });
};

/**
 * Generates product categories based on business name and type.
 */
export const generateBusinessCategories = async (businessName: string, businessType: string): Promise<string[]> => {
  if (!process.env.API_KEY) return ["General", "New Arrivals", "Best Sellers", "Sale"];

  return callWithRetry(async () => {
    const prompt = `
      Generate 5 distinct product categories for a ${businessType} business named "${businessName}".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    let text = response.text || "[]";
    if (text.startsWith('```')) text = text.replace(/```json|```/g, '').trim();

    const json = JSON.parse(text);
    return Array.isArray(json) ? json : ["General"];
  }, 3, 1000, ["General", "Stock"]);
};

/**
 * Generates sales forecast and business insights based on transaction history.
 */
export const generateSalesForecast = async (transactions: any[]): Promise<{ forecast: {date: string, sales: number}[], insights: string[] }> => {
  if (!process.env.API_KEY || transactions.length < 5) {
     return {
         forecast: [],
         insights: ["Insufficient data for AI prediction. Please record more transactions."]
     };
  }

  return callWithRetry(async () => {
      // Data Pre-processing
      const salesMap = transactions.reduce((acc: any, t: any) => {
          if(t.status === 'Completed') {
              const date = t.date.split('T')[0];
              acc[date] = (acc[date] || 0) + t.amount;
          }
          return acc;
      }, {});
      
      const salesHistory = Object.entries(salesMap)
        .map(([date, sales]) => ({ date, sales }))
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30);

      const prompt = `
        Analyze this daily sales data: ${JSON.stringify(salesHistory)}.
        1. Forecast next 7 days sales.
        2. Generate 3 strategic insights.
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
           responseMimeType: "application/json",
           responseSchema: {
             type: Type.OBJECT,
             properties: {
               forecast: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { date: {type: Type.STRING}, sales: {type: Type.NUMBER} } } },
               insights: { type: Type.ARRAY, items: { type: Type.STRING } }
             }
           }
        }
      });
      
      return JSON.parse(response.text || "{}");
  }, 2, 1500, { forecast: [], insights: ["AI Service Temporary Unavailable"] });
};

/**
 * Chat support bot response generation.
 */
export const getSupportResponse = async (userMessage: string): Promise<string> => {
  if (!process.env.API_KEY) return "AI Service offline. Please check configuration.";

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: "You are AutoMate, a helpful POS assistant. Keep answers short, professional, and friendly.",
      },
    });
    return response.text?.trim() || "I didn't understand that.";
  }, 2, 500, "Support system is currently busy. Please try again.");
};

/**
 * Analyzes stock levels against recent transaction history to suggest reorders.
 */
export const analyzeStockLevels = async (
  products: any[], 
  transactions: any[]
): Promise<any[]> => {
  if (!process.env.API_KEY) return [];

  return callWithRetry(async () => {
    // 1. Calculate Sales Velocity (Total Quantity Sold per Product in LAST 30 DAYS)
    const salesVelocity: Record<string, number> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      if (t.status === 'Completed' && tDate >= thirtyDaysAgo) {
        salesVelocity[t.product] = (salesVelocity[t.product] || 0) + (t.quantity || 1);
      }
    });

    // 2. Prepare concise data payload for AI
    const inventorySummary = products.map(p => ({
      name: p.name,
      category: p.category,
      currentStock: p.stock,
      totalSoldLast30Days: salesVelocity[p.name] || 0
    }));

    const prompt = `
      You are an inventory optimization engine. Analyze this data: ${JSON.stringify(inventorySummary)}.
      Identify products that need reordering based on:
      1. Low stock levels.
      2. High sales velocity in the last 30 days (totalSoldLast30Days).
      
      Return a JSON array of objects with these properties:
      - productName (string)
      - currentStock (number)
      - suggestedReorder (number) - Suggest a reasonable amount to buy to cover next 30 days.
      - reason (string) - Brief explanation (e.g., "Sold 50 units in 30 days", "Critical stock < 5").
      - priority (string) - "High" (Urgent), "Medium", or "Low".

      Only return items that genuinely need attention. If everything is fine, return an empty array.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              currentStock: { type: Type.NUMBER },
              suggestedReorder: { type: Type.NUMBER },
              reason: { type: Type.STRING },
              priority: { type: Type.STRING }
            }
          }
        }
      }
    });

    let text = response.text || "[]";
    return JSON.parse(text);
  }, 2, 1000, []);
};
