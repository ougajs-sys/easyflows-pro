import React, { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { INSERT_MESSAGE } from '../../graphql/mutations';

const CallerChat = () => {
    const [messages, setMessages] = useState([]);
    const [roomId, setRoomId] = useState('');

    const [insertMessage] = useMutation(INSERT_MESSAGE);

    useEffect(() => {
        // Logic to fetch messages
    }, []);

    const handleSendMessage = async (messageText) => {
        // Insert message with room_id
        try {
            await insertMessage({
                variables: {
                    input: {
                        text: messageText,
                        room_id: roomId, // Added room_id
                    },
                },
            });
            // Update local messages state
            setMessages([...messages, { text: messageText, room_id: roomId }]);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <div>
            {/* Chat UI components here */}
        </div>
    );
};

export default CallerChat;