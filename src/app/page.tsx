'use client';
import { Button, Stack } from "@mui/material";
import WebRTCSourcesSound from "./components/WebRTCSourcesSound";
import styles from "./page.module.css";



import { useEffect, useState } from 'react';
import WebRTCSourcesImage from "./components/WebRTCSourcesImage";

const Home: React.FC = () => {
  const [message, setMessage] = useState('Waiting for Trigger...');
  const [isSwitch, setIsSwitch] = useState<boolean>(true)

  useEffect(() => {
    const socket = new WebSocket('ws://192.168.4.1:8765');

    socket.onmessage = (event) => {
      if (event.data === 'trigger') {
        setMessage('Received Trigger from Raspberry Pi!' + Date.now().toString());
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    return () => {
      socket.close();
    };
  }, []);

  const clickSwitch = (isSwitch:boolean) => {
    setIsSwitch(isSwitch)
  }
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* <h1>Waiting for Trigger...</h1>
        <h1>{message}</h1> */}
        {/* <Stack direction={"row"} gap={2}>
          <Button variant="contained" onClick={() => {
            clickSwitch(true)
          }}>Sound</Button>
          <Button variant="contained" onClick={() => {
            clickSwitch(false)
          }}>Image</Button>
        </Stack>
        {isSwitch ?  : <WebRTCSourcesImage />} */}

        <WebRTCSourcesSound />
      </main>
    </div>
  );
};

export default Home;