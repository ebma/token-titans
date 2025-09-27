import { useState } from 'react';
import type { AuthRequestEvent } from '@shared/index';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm({ ws }: { ws: WebSocket | null }) {
  const [username, setUsername] = useState('');

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
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your username to join the lobby.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleLogin} className="w-full">Login</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
