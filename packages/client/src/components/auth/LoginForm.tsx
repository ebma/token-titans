import type { AuthRequestEvent } from "@shared/index";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm({ ws }: { ws: WebSocket | null }) {
  const [username, setUsername] = useState("");

  const handleLogin = () => {
    if (ws && username) {
      const authEvent: AuthRequestEvent = {
        payload: { username },
        type: "authRequest"
      };
      ws.send(JSON.stringify(authEvent));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your username to join the lobby.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input onChange={e => setUsername(e.target.value)} placeholder="Enter your username" type="text" value={username} />
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleLogin}>
            Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
