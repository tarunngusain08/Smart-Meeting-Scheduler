interface AssistantMessage {
  role: 'assistant';
  content: string;
  refusal: string | null;
  annotations: any[];
}

interface ChatResponse {
  index: number;
  message: AssistantMessage;
  logprobs: any | null;
  finish_reason: string;
}

export async function handleUserPrompt(chatInput: string): Promise<string> {
  const response = await fetch(import.meta.env.VITE_CHAT_API_URL || 'https://shreeradhe.app.n8n.cloud/webhook/handle-user-prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chatInput }),
  });

  if (!response.ok) {
    throw new Error('Failed to process chat message');
  }

  const data: ChatResponse = await response.json();
  
  // If there's a refusal message, throw an error
  if (data.message.refusal) {
    throw new Error(data.message.refusal);
  }

  // Return the assistant's message content
  return data.message.content;
}

