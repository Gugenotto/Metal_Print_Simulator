import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePrintFeasibility = async (
  cmykBase64: string,
  whiteBase64: string
): Promise<AnalysisResult> => {
  try {
    const prompt = `
      Ты — старший технолог полиграфического производства, специализирующийся на премиальной упаковке и печати на металлизированном картоне (MetPol).
      
      Я предоставил два изображения:
      1. Цветовая раскладка CMYK (Макет).
      2. Маска белил (White Ink Mask): Черные пиксели = Печать белилами, Белые пиксели = Нет белил (Металл открыт).

      Проанализируй эти изображения на предмет технической возможности качественной печати и потенциальных проблем.
      
      На что обратить внимание:
      - Проблемы с вывороткой (knockout) мелкого текста (если белила отсутствуют под мелким текстом, он может быть нечитаем на бликующем металле).
      - Проблемы треппинга и оверпринта.
      - Эффективность контраста (использование чистого металла для бликов против глухих зон с белилами).
      - Риски несовмещения (Registration risks), особенно на тонких элементах.

      Ответ должен быть в формате JSON.
      Все тексты (title, feedback) должны быть на РУССКОМ языке.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: cmykBase64.split(',')[1] // Remove data:image/png;base64, prefix
            }
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: whiteBase64.split(',')[1]
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            feedback: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            score: { 
              type: Type.INTEGER, 
              description: "Оценка от 0 до 100, указывающая на технологичность макета." 
            },
            isCompatible: { type: Type.BOOLEAN }
          },
          required: ["title", "feedback", "score", "isCompatible"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Нет ответа от AI");
    
    return JSON.parse(resultText) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed", error);
    return {
      title: "Ошибка анализа",
      feedback: ["Произошла ошибка при связи с сервисом AI."],
      score: 0,
      isCompatible: false
    };
  }
};