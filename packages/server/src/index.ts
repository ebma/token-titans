import { WebSocketServer, WebSocket } from 'ws';
import { GameEvent } from '@shared/index';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws: WebSocket) {
  console.log('Client connected');

  ws.on('message', function message(data) {
    const event: GameEvent = JSON.parse(data.toString());
    console.log('received: %s', event.type);
    // Echo message back to client
    ws.send(JSON.stringify(event));
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log('WebSocket server started on port 8080');
