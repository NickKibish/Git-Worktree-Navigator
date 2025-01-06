import { useState } from "react";
import { List } from "@raycast/api";

export default function Command() {
  const [message, setMessage] = useState("Hello, Raycast!");

  return (
    <List>
      <List.Item title={message} />
    </List>
  );
}