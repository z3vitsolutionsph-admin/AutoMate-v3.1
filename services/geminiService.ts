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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `You are the AutoMate Shop Assistant. 
  Your job is to help business owners manage their shop using the SHOP INFO below.
  
  SHOP INFO:
  ${storeContext}
  
  RULES:
  1. Friendly, concise, professional business advice.
  2. Use bullet points.
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
  const systemPrompt = `Create a business blueprint for "${businessName}" (${businessType}).`;
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: systemPrompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}") as BusinessDNA;
  });
};

export const performDeepAnalysis = async (products: any[], transactions: any[], businessName: string): Promise<any> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Business Audit Request for ${businessName}. Data: ${JSON.stringify({products, transactions})}`,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const generateBusinessHeroImage = async (prompt: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } },
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Image generation failed.");
  });
};

export const searchProductImage = async (query: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: query }] },
      config: { imageConfig: { aspectRatio: "1:1" }, tools: [{ googleSearch: {} }] },
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Product search failed.");
  });
};

export const generateProductImage = async (description: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: description }] },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Image creation failed.");
  });
};