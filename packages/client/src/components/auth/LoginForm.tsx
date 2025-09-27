import { useState } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import type { AuthRequestEvent } from '@shared/index';

export function LoginForm({ ws }: { ws: WebSocket | null }) {
  const [username, setUsername] = useState('');
  const { setSession } = useAuthStore();

  const handleLogin = () => {
    if (ws && username) {
      const authEvent: AuthRequestEvent = {
        type: 'authRequest',
        payload: { username },
      };
      ws.send(JSON.stringify(authEvent));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter your username"
        className="p-2 border rounded"
      />
      <button onClick={handleLogin} className="p-2 bg-blue-500 text-white rounded">
        Login
      </button>
    </div>
  );
}
