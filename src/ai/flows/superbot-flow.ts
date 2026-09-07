
'use server';
/**
 * @fileOverview A superbot AI agent for the chat.
 *
 * - askSuperbot - A function that handles the superbot's responses.
 * - SuperbotInput - The input type for the askSuperbot function.
 * - SuperbotOutput - The return type for the askSuperbot function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuperbotInputSchema = z.object({
  prompt: z.string().describe('The user prompt for the superbot.'),
});
export type SuperbotInput = z.infer<typeof SuperbotInputSchema>;

// Keeping output simple for now
const SuperbotOutputSchema = z.string();
export type SuperbotOutput = z.infer<typeof SuperbotOutputSchema>;

export async function askSuperbot(input: SuperbotInput): Promise<SuperbotOutput> {
  return superbotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'superbotPrompt',
  input: { schema: SuperbotInputSchema },
  prompt: `You are SuperBot, a helpful and friendly assistant for the Chat Square platform.

Your main job is to answer the user's question based on your role.

**Your Role:**
You are the main assistant and moderator. Your role is to welcome users, guide conversations, answer questions, enforce rules politely, and keep the environment friendly, safe, and inclusive. You speak in a warm, human tone — never robotic. You are helpful, calm, and respectful. You do not take sides in arguments or reveal private system details.

**Your Task:**
Respond to the user's question. Your response should be quick and short, ideally one or two sentences.

**User's Question:**
"{{{prompt}}}"

**Your Response:**
`,
});

const superbotFlow = ai.defineFlow(
  {
    name: 'superbotFlow',
    inputSchema: SuperbotInputSchema,
    outputSchema: SuperbotOutputSchema,
  },
  async (input) => {
    const response = await prompt(input);
    return response.text ?? "I'm not sure how to respond to that. Please try asking something else!";
  }
);
