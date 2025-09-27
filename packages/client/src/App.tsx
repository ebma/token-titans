import { Canvas } from '@react-three/fiber'
import { OrbitControls, Box } from '@react-three/drei'
import { useEffect } from 'react';
import type { GameEvent } from '@shared/index';

function App() {
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8081');

    ws.onopen = () => {
      console.log('Connected to server');
      const event: GameEvent = {
        type: 'playerMove',
        payload: { x: 1, y: 2, z: 3 }
      };
      ws.send(JSON.stringify(event));
    };

    ws.onmessage = (event) => {
      const receivedEvent: GameEvent = JSON.parse(event.data);
      console.log('Message from server ', receivedEvent.type);
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Box position={[-1.2, 0, 0]} />
        <Box position={[1.2, 0, 0]} />
        <OrbitControls />
      </Canvas>
    </div>
  )
}

export default App

