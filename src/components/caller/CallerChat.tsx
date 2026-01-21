import { gql, useMutation } from '@apollo/client';

const INSERT_MESSAGE = gql`
  mutation InsertMessage($input: MessageInput!) {
    insertMessage(input: $input) {
      id
      content
      room_id
    }
  }
`;

const CallerChat = () => {
  const [insertMessage] = useMutation(INSERT_MESSAGE);

  const handleSendMessage = async (content) => {
    await insertMessage({
      variables: { input: { content, room_id: 'some-room-id' } },
    });
  };

  return (
    // JSX for your chat component
  );
};

export default CallerChat;
