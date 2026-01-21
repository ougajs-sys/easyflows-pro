import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useSubscription } from 'react-query';
import { createClient } from '@supabase/supabase-js';
import { Card, Input, Button, ScrollArea } from '<ui-library-path>';

const supabase = createClient('your-supabase-url', 'your-public-anon-key');
const roomId = 'room-appelants';

const CallerChat = () => {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const scrollRef = useRef();

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId);
        return data;
    };

    const { data } = useQuery('messages', fetchMessages);

    useEffect(() => {
        if (data) {
            setMessages(data);
        }

        const subscription = supabase
            .from(`messages:room_id=eq.${roomId}`)
            .on('INSERT', payload => {
                setMessages(prevMessages => [...prevMessages, payload.new]);
            })
            .subscribe();

        return () => {
            supabase.removeSubscription(subscription);
        };
    }, [data]);

    const sendMessage = useMutation(async () => {
        await supabase
            .from('messages')
            .insert([{ content: message, room_id: roomId }]);
        setMessage('');
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage.mutate();
    };

    return (
        <Card>
            <ScrollArea ref={scrollRef} style={{ height: '400px', overflowY: 'scroll' }}>
                {messages.map((msg, index) => (
                    <div key={index}>{msg.content}</div>
                ))}
            </ScrollArea>
            <form onSubmit={handleSubmit}>
                <Input 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                />
                <Button type="submit">Send</Button>
            </form>
        </Card>
    );
};

export default CallerChat;