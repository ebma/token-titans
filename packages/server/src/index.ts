import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { AppEvent, AuthRequestEvent, AuthResponseEvent } from '@shared/index';

const wss = new WebSocketServer({ port: 8081 });

const sessions = new Map<string, { userId: string; username: string }>();

wss.on('connection', function connection(ws: WebSocket) {
  const sessionId = uuidv4();
  console.log('Client connected');

  ws.on('message', function message(data) {
    const event: AppEvent = JSON.parse(data.toString());
    
    if (event.type === 'authRequest') {
      const { username } = (event as AuthRequestEvent).payload;
      const userId = uuidv4();
      sessions.set(sessionId, { userId, username });

      const response: AuthResponseEvent = {
        type: 'authResponse',
        payload: { sessionId, userId, username },
      };
      ws.send(JSON.stringify(response));
      console.log(`User ${username} authenticated with session ${sessionId}`);
    } else {
      console.log('received: %s', event.type);
      // Echo message back to client
      ws.send(JSON.stringify(event));
    }
  });

  ws.on('close', () => {
    sessions.delete(sessionId);
    console.log('Client disconnected');
  });
});

console.log('WebSocket server started on port 8081');
