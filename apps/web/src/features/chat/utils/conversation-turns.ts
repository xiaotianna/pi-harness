import { CHAT_RESPONSE_FAILED_LABEL } from "../constants/chat-response";
import type { ChatMessage } from "../data/chat";
import { ChatMessageType } from "../data/chat";

export type ConversationTurn = {
  assistantPreview: string;
  id: string;
  userContent: string;
};

export function getConversationTurnAnchorId(turnId: string): string {
  return `conversation-turn-${turnId}`;
}

export function getConversationTurns(messages: readonly ChatMessage[]): ConversationTurn[] {
  const turns: ConversationTurn[] = [];

  for (const message of messages) {
    if (message.type === ChatMessageType.USER) {
      turns.push({ assistantPreview: "", id: message.id, userContent: message.content });
      continue;
    }

    if (message.type === ChatMessageType.ASSISTANT) {
      const turn = turns.at(-1);
      if (turn) turn.assistantPreview = message.content;
      continue;
    }

    if (message.type === ChatMessageType.ERROR) {
      const turn = turns.at(-1);
      if (turn) turn.assistantPreview = CHAT_RESPONSE_FAILED_LABEL;
    }
  }

  return turns;
}
