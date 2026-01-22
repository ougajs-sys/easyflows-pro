import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { Send, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const roomId = 'room-livreurs';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  channel: string;
  created_at: string;
}

interface OrderForChat {
  id: string;
  order_number: string | null;
  client_name: string;
  status: string;
}

interface DeliveryChatProps {
  reportedOrders?: OrderForChat[];
  cancelledOrders?: OrderForChat[];
}

export const DeliveryChat: React.FC<DeliveryChatProps> = ({
  reportedOrders = [],
  cancelledOrders = [],
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('channel', roomId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data as Message[];
  };

  const { data, refetch } = useQuery({
    queryKey: ['delivery-chat-messages', roomId],
    queryFn: fetchMessages,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (data) {
      setMessages(data);
    }
  }, [data]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prevMessages) => [...prevMessages, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || !user) return;
    
    setIsSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{ 
          content: message, 
          channel: roomId,
          sender_id: user.id,
        }]);
      
      if (error) throw error;
      setMessage('');
      refetch();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const hasIssues = reportedOrders.length > 0 || cancelledOrders.length > 0;

  return (
    <div className="space-y-4">
      {hasIssues && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-warning" />
            <h4 className="font-medium">Commandes à signaler</h4>
          </div>
          <div className="space-y-2">
            {reportedOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">{order.order_number} - {order.client_name}</span>
                <Badge variant="secondary">Reportée</Badge>
              </div>
            ))}
            {cancelledOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">{order.order_number} - {order.client_name}</span>
                <Badge variant="destructive">Annulée</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      <Card className="flex flex-col h-[500px]">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Chat Livreurs</h3>
        </div>
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-2">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`p-2 rounded-lg max-w-[80%] ${
                  msg.sender_id === user?.id 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : 'bg-muted'
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
          <Input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tapez votre message..."
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={isSending || !message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default DeliveryChat;
