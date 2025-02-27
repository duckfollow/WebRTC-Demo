'use client';
import styles from "./page.module.css";
import WebRTCSources from "./components/WebRTCSources";



import { useEffect, useState } from 'react';

const Home: React.FC = () => {
  const [message, setMessage] = useState('Waiting for Trigger...');

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
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Waiting for Trigger...</h1>
        <h1>{message}</h1>
        <WebRTCSources />
      </main>
    </div>
  );
};

export default Home;