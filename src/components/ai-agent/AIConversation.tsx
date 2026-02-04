import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  affectedCount?: number;
}

interface AIInstruction {
  id: string;
  instruction: string;
  result: { message?: string } | null;
  status: string;
  created_at: string;
  affected_count: number;
}

interface AIConversationProps {
  instructions: AIInstruction[];
  isProcessing: boolean;
  onSendInstruction: (instruction: string) => Promise<void>;
}

const suggestionPrompts = [
  "Quelles commandes sont en attente ?",
  "Comment va la boutique aujourd'hui ?",
  "Quels clients n'ont pas commandé récemment ?",
  "Y a-t-il des produits en rupture de stock ?",
];

export function AIConversation({
  instructions,
  isProcessing,
  onSendInstruction,
}: AIConversationProps) {
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  // Convert instructions to messages format
  const getMessages = (): Message[] => {
    const messagesFromInstructions: Message[] = [];
    
    [...instructions].reverse().forEach((instr) => {
      messagesFromInstructions.push({
        id: `${instr.id}-user`,
        role: "user",
        content: instr.instruction,
        timestamp: new Date(instr.created_at),
      });
      
      if (instr.result?.message && instr.status === "completed") {
        messagesFromInstructions.push({
          id: `${instr.id}-assistant`,
          role: "assistant",
          content: instr.result.message,
          timestamp: new Date(instr.created_at),
          affectedCount: instr.affected_count,
        });
      }
    });

    return [...messagesFromInstructions, ...localMessages];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setLocalMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");

    try {
      await onSendInstruction(currentInput);
      // Remove local message since it will come from instructions
      setLocalMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } catch {
      // Keep local message on error
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const messages = getMessages();

  return (
    <div className="flex flex-col h-[600px] md:h-[700px]">
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Salut ! Je suis ton assistant IA
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mb-6">
              Parle-moi comme à un collègue. Pose-moi des questions sur ta boutique ou demande-moi de faire des actions.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestionPrompts.map((prompt, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/20 transition-colors py-2 px-3"
                  onClick={() => handleSuggestionClick(prompt)}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {prompt}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}
                >
                  <pre className="whitespace-pre-wrap text-sm font-sans">
                    {message.content}
                  </pre>
                  <div className={cn(
                    "flex items-center gap-2 mt-2 text-xs",
                    message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    <span>
                      {format(message.timestamp, "HH:mm", { locale: fr })}
                    </span>
                    {message.affectedCount !== undefined && message.affectedCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {message.affectedCount} éléments
                      </Badge>
                    )}
                  </div>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Je réfléchis...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <Card className="border-t rounded-none border-x-0 border-b-0">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écris ta question ou demande ici..."
              className="min-h-[50px] max-h-[120px] resize-none flex-1"
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="h-[50px] w-[50px] shrink-0"
              disabled={!input.trim() || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
