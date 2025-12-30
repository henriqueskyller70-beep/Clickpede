import { GoogleGenAI } from "@google/genai";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key is missing");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a compelling, sales-oriented product description in Portuguese (Brazil) for a product named "${productName}" in the category "${category}". Keep it under 200 characters. No markdown, just text.`,
        });
        return response.text || "Descrição indisponível no momento.";
    } catch (error) {
        console.error("Error generating description:", error);
        return "";
    }
};

export const suggestMarketingTagline = async (storeName: string): Promise<string> => {
    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a short, catchy slogan in Portuguese for a store named "${storeName}". Maximum 10 words.`,
        });
        return response.text || "";
    } catch (error) {
        console.error("Error generating tagline:", error);
        return "";
    }
};

export const generateImageUrlSearchQuery = async (productName: string): Promise<string> => {
    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a concise, single-word English search query for an image related to "${productName}". For example, if product is "Pizza Calabresa", output "pizza". If "Combo Whopper", output "burger".`,
        });
        return response.text || "";
    } catch (error) {
        console.error("Error generating image search query:", error);
        return "";
    }
};