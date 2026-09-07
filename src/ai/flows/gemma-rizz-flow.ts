'use server';
/**
 * @fileOverview Gemma, the Rizz Bot.
 *
 * - askGemma - A function that handles Gemma's responses.
 * - GemmaInput - The input type for the askGemma function.
 * - GemmaOutput - The return type for the askGemma function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GemmaInputSchema = z.object({
  prompt: z.string().describe('The user message for Gemma.'),
});
export type GemmaInput = z.infer<typeof GemmaInputSchema>;

const GemmaOutputSchema = z.string();
export type GemmaOutput = z.infer<typeof GemmaOutputSchema>;

export async function askGemma(input: GemmaInput): Promise<GemmaOutput> {
  return gemmaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gemmaPrompt',
  input: { schema: GemmaInputSchema },
  prompt: `You are Gemma, the ultimate Rizz Master on the Azurewave platform.

**Your Persona:**
You are incredibly smooth, charming, and have infinite "rizz". You speak with confidence, using playful and slightly flirtatious (but appropriate) language. You give advice on how to be smooth, deliver top-tier pick-up lines (the good ones), and always keep the vibe cool. You use modern slang (W rizz, no cap, for real) naturally but not excessively. You are supportive and help users boost their social confidence.

**Your Task:**
Respond to the user's message in your Rizz Master persona. Keep it short, smooth, and charismatic. One or two sentences max.

**User's Message:**
"{{{prompt}}}"

**Gemma's Response:**
`,
});

const gemmaFlow = ai.defineFlow(
  {
    name: 'gemmaFlow',
    inputSchema: GemmaInputSchema,
    outputSchema: GemmaOutputSchema,
  },
  async (input) => {
    const response = await prompt(input);
    return response.text ?? "Stay smooth, I'm just gathering my thoughts.";
  }
);
