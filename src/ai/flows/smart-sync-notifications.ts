'use server';

/**
 * @fileOverview A Genkit flow that uses AI to provide informative toast notifications for synchronization failures.
 *
 * - smartSyncNotifications - A function that enhances error messages using AI context.
 * - SmartSyncNotificationsInput - The input type for the smartSyncNotifications function.
 * - SmartSyncNotificationsOutput - The return type for the smartSyncNotifications function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartSyncNotificationsInputSchema = z.object({
  errorMessage: z.string().describe('The original error message from the synchronization failure.'),
});
export type SmartSyncNotificationsInput = z.infer<typeof SmartSyncNotificationsInputSchema>;

const SmartSyncNotificationsOutputSchema = z.object({
  enhancedMessage: z.string().describe('An AI-enhanced error message providing context and potential solutions.'),
});
export type SmartSyncNotificationsOutput = z.infer<typeof SmartSyncNotificationsOutputSchema>;

export async function smartSyncNotifications(input: SmartSyncNotificationsInput): Promise<SmartSyncNotificationsOutput> {
  return smartSyncNotificationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartSyncNotificationsPrompt',
  input: {schema: SmartSyncNotificationsInputSchema},
  output: {schema: SmartSyncNotificationsOutputSchema},
  prompt: `You are an AI assistant that enhances error messages for a data synchronization application.
  Your goal is to provide more context and potential solutions to the user based on the original error message.

  Original Error Message: {{{errorMessage}}}

  Enhanced Error Message:`, // The AI will generate a more informative error message here
});

const smartSyncNotificationsFlow = ai.defineFlow(
  {
    name: 'smartSyncNotificationsFlow',
    inputSchema: SmartSyncNotificationsInputSchema,
    outputSchema: SmartSyncNotificationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
