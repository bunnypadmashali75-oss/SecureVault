import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const AI_MODEL = "gemini-3-flash-preview";

export interface ActivityData {
  ip: string;
  userAgent: string;
  location: string;
  timestamp: string;
  deviceType: string;
}

export async function detectAnomalies(newActivity: ActivityData, history: ActivityData[]) {
  const prompt = `
    Analyze the following login activity for security anomalies against historical behavior.
    
    NEW LOGIN ATTEMPT:
    - Time: ${newActivity.timestamp}
    - Location: ${newActivity.location}
    - Device: ${newActivity.userAgent}
    
    USER HISTORY (Recent Logins):
    ${JSON.stringify((history || []).slice(0, 5), null, 2)}
    
    Compare the new attempt with history. Look for:
    1. Geolocation variance (impossible travel)
    2. Device changes
    3. Unusual login hours
    
    If suspicious, provide a detailed but concise explanation of WHY.
    Return a security assessment JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAnomalous: { type: Type.BOOLEAN },
            score: { type: Type.NUMBER, description: "Confidence score 0-1" },
            reasoning: { type: Type.STRING, description: "Detailed explanation for the user" },
            riskLevel: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
            threatType: { type: Type.STRING, description: "e.g. Geolocation Anomaly, Brute Force" },
            recommendedAction: { type: Type.STRING }
          },
          required: ["isAnomalous", "score", "reasoning", "riskLevel", "threatType"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Anomaly Detection Error:", error);
    return {
      isAnomalous: false,
      score: 0,
      reasoning: "AI analysis node offline. Using fail-safe defaults.",
      riskLevel: "low",
      threatType: "none"
    };
  }
}

export async function calculateSecurityScoreAI(data: {
  passwordStats: { count: number; avgStrength: number };
  alertCount: number;
  activityCount: number;
  mfaEnabled: boolean;
}) {
  const prompt = `
    Perform a high-level security audit on user data:
    - Passwords: ${data.passwordStats.count} entries, avg strength ${data.passwordStats.avgStrength}/4
    - Active Threats: ${data.alertCount} unresolved alerts
    - Activity: ${data.activityCount} recent nodes
    - MFA: ${data.mfaEnabled ? "ACTIVE" : "INACTIVE"}

    Calculate a precise "Security Integrity Score" (0-100).
    Return JSON with score, rating label (CRITICAL, VULNERABLE, SECURE, FORTIFIED), and specific hardening steps.
  `;

  try {
    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            rating: { type: Type.STRING, enum: ["CRITICAL", "VULNERABLE", "SECURE", "FORTIFIED"] },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            insights: { type: Type.STRING }
          },
          required: ["score", "rating", "recommendations"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Security Scoring Error:", error);
    return { 
      score: 50, 
      rating: "VULNERABLE", 
      recommendations: ["AI Analysis Node Failure - Review manual logs"],
      insights: "Unable to calculate real-time integrity at this moment."
    };
  }
}

export async function checkPasswordStrengthAI(password: string) {
  const prompt = `
    Assess the strength of this password: "${password}"
    Do not repeat the password in the response.
    Provide a security score (0-100) and specific feedback on how to improve it or why it is weak/strong.
  `;

  try {
    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            vulnerabilities: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["score", "feedback"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Password Check Error:", error);
    return null;
  }
}
