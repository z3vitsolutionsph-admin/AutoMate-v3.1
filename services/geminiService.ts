
import { GoogleGenAI, Type } from "@google/genai";

async function callWithRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 1500
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status || error?.code || 0;
    const isRetryable = 
        status === 429 || 
        status === 503 || 
        status === 504 || 
        error?.message?.toLowerCase().includes("fetch") ||
        error?.message?.toLowerCase().includes("network") ||
        error?.message?.toLowerCase().includes("timeout");
                        
    if (retries > 0 && isRetryable) {
      const jitter = Math.random() * 300;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      return callWithRetry(fn, retries - 1, delay * 2.2);
    }
    throw error;
  }
}

export const getSupportResponse = async (userMessage: string, storeContext: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("Assistant is offline.");
  // Create a fresh instance for each request to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `You are the AutoMate Shop Assistant. 
  Your job is to help business owners manage their shop using the SHOP INFO below.
  
  SHOP INFO:
  ${storeContext}
  
  RULES:
  1. Friendly, concise, professional business advice.
  2. Use bullet points for steps.
  3. If stock is low, recommend reordering.`;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userMessage,
      config: { 
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });
    
    // Using .text property directly as per latest SDK guidelines
    return response.text?.trim() || "I'm sorry, I couldn't process that request.";
  });
};

export interface EnhancedProductResult {
  category: string;
  alternativeCategories: string[];
  descriptions: {
    formal: string;
    creative: string;
    technical: string;
  };
  confidenceScore: number;
  logic: string;
}

export const enhanceProductDetails = async (
  productName: string, 
  businessType: string = "General Shop",
  existingCategories: string[] = []
): Promise<EnhancedProductResult> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemPrompt = `Analyze this product: "${productName}" for a ${businessType}. 
  Categories available: ${existingCategories.join(", ")}.`;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: productName,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            alternativeCategories: { type: Type.ARRAY, items: { type: Type.STRING } },
            descriptions: {
              type: Type.OBJECT,
              properties: {
                formal: { type: Type.STRING },
                creative: { type: Type.STRING },
                technical: { type: Type.STRING }
              },
              required: ["formal", "creative", "technical"]
            },
            confidenceScore: { type: Type.NUMBER },
            logic: { type: Type.STRING }
          },
          required: ["category", "alternativeCategories", "descriptions", "confidenceScore", "logic"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}") as EnhancedProductResult;
  });
};

export interface BusinessDNA {
  nicheAnalysis: string;
  categories: string[];
  starterProducts: {
    name: string;
    category: string;
    price: number;
    description: string;
    sku: string;
  }[];
  growthStrategy: string;
  brandIdentityPrompt: string;
}

export const getBusinessDNA = async (businessName: string, businessType: string): Promise<BusinessDNA> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemPrompt = `Create a business blueprint for "${businessName}" (${businessType}). 
  You MUST return valid JSON. Ensure starterProducts is an array of at least 3-5 items.`;
  
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: systemPrompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nicheAnalysis: { type: Type.STRING },
            categories: { type: Type.ARRAY, items: { type: Type.STRING } },
            starterProducts: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  sku: { type: Type.STRING }
                },
                required: ["name", "category", "price", "sku"]
              } 
            },
            growthStrategy: { type: Type.STRING },
            brandIdentityPrompt: { type: Type.STRING }
          },
          required: ["nicheAnalysis", "categories", "starterProducts", "growthStrategy"]
        }
      }
    });

    try {
      const result = JSON.parse(response.text || "{}");
      // Resilient fallback structure
      return {
        nicheAnalysis: result.nicheAnalysis || "Standard retail deployment.",
        categories: Array.isArray(result.categories) ? result.categories : ["General", "Retail"],
        starterProducts: Array.isArray(result.starterProducts) ? result.starterProducts : [],
        growthStrategy: result.growthStrategy || "Establish market presence through local engagement.",
        brandIdentityPrompt: result.brandIdentityPrompt || "Professional and modern."
      } as BusinessDNA;
    } catch (e) {
      console.warn("AI JSON Parse failed, returning empty DNA structure.");
      return {
        nicheAnalysis: "Deployment failed, using basic template.",
        categories: ["General"],
        starterProducts: [],
        growthStrategy: "Standard operations.",
        brandIdentityPrompt: "Minimalist"
      };
    }
  });
};

export const performDeepAnalysis = async (products: any[], transactions: any[], businessName: string): Promise<any> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Business Audit for ${businessName}. Data: ${JSON.stringify({products, transactions})}`,
      config: { 
        responseMimeType: "application/json",
        // Added responseSchema for better reliability and SDK compliance
        // Schema Type used as correctly as Type.OBJECT must have properties.
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskFactor: { type: Type.STRING },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "recommendations", "riskFactor", "opportunities"]
        },
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const generateProductImage = async (description: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Professional product photography of ${description}, white background, high resolution.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });
    // Iterating through all parts to find the image data as required
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Image creation failed.");
  });
};

export const searchProductImage = async (query: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: `Search for a clean product image of ${query}` }] },
      // Use google_search for gemini-3-pro-image-preview as per @google/genai guidelines for image models.
      config: { 
        imageConfig: { aspectRatio: "1:1" }, 
        tools: [{ google_search: {} }] 
      },
    });
    // Iterating through all parts to find the image data
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Product search failed.");
  });
};
