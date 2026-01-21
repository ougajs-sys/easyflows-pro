import { gql } from '@apollo/client';

export const INSERT_MESSAGE = gql`
  mutation insertMessage($content: String!) {
    insert_messages(objects: [{ content: $content, room_id: "room-appelants" }]) {
      returning {
        id
        content
        room_id
      }
    }
  }
`;
