import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { Button, Form, Image, InputGroup, Stack } from "react-bootstrap";
import Robot from "./robot.png";
import { useEffect, useRef, useState } from "react";
import Spinner from 'react-bootstrap/Spinner';

type MessageType = {
  type: string,
  content: string
}

function Message({ type, content }: { type: string, content: string }) {
  return <div className={`message ${type === "ai" ? "aiMessage" : "humanMessage"} w-75 border border-0 rounded d-flex`}>
      <span className="textMessage text-wrap p-2 lh-1">{content}</span>
    </div>
}

function App() {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const request = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/v1/retrieveChatMessages", {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: MessageType[] = await response.json();
        setMessages(_ => data);
      } catch (err) {
        console.error("Failed to fetch chat messages:", err);
      }
    };
    request();
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      fetch("http://localhost:4000/api/v1/sendkillBot", {
        method: "POST",
        credentials: "include",
        keepalive: true,
      });
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  const handleClick = async(e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsLoading(_ => true);
    try {
      const response = await fetch("http://localhost:4000/api/v1/sendMessageToLLM", {
        credentials: 'include',
        body: JSON.stringify({
          message: inputRef.current?.value,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const message: MessageType = await response.json();

      setMessages(prev => [...prev, message])
    }
    catch(err) {
      console.log(err);
    }
    finally {
      setIsLoading(_ => false);
    }
  };

  return (
    <div className="App">
      <div className={`messagingBox ${expanded ? "active" : ""} position-absolute d-flex justify-content-space-between flex-column`}>
        <header className="headingBorder d-flex justify-content-center align-items-center">VolunteerConnect</header>
        <Stack className="messagesArea px-2 mt-1" gap={1}>
          {messages.map((message: { type: string, content: string }, i) => (
            <Message key={i} type={message.type} content={message.content} />
          ))}
        </Stack>
        <footer className="inputFooter position-relative d-flex justify-content-center">
          <InputGroup className="messageField mb-3 pt-1" size="sm">
            <Form.Control
              placeholder="Type Message Here..."
              aria-label="Message"
              aria-describedby="basic-addon2"
              ref={inputRef}
            />
            <Button id="button-addon2" className="border border-0" onClick={handleClick}>
              {isLoading ? <Spinner animation="border" /> : "Send"}
            </Button>
          </InputGroup>
        </footer>
      </div>
      <Button
        size="lg"
        id="basicButton"
        className="p-2 position-absolute bottom-0 end-0 me-3 mb-3 border border-0"
        onClick={() => setExpanded(prev => !prev)}
      >
        <Image
          src={Robot}
          id="robotImage"
          alt="Robot icons created by Kiranshastry - Flaticon at https://www.flaticon.com/free-icons/robot"
          rounded
          width={32}
          height={32}
        />
      </Button>
    </div>
  );
}

export default App;
