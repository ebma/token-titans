import type { CreateRoomRequestEvent } from "@shared/index";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateRoomDialogProps = {
  ws: WebSocket | null;
};

export function CreateRoomDialog({ ws }: CreateRoomDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("2");

  const handleCreateRoom = () => {
    if (ws) {
      const createRoomRequest: CreateRoomRequestEvent = {
        payload: {
          maxPlayers: Number.parseInt(maxPlayers),
          name
        },
        type: "createRoomRequest"
      };
      ws.send(JSON.stringify(createRoomRequest));
      setIsOpen(false);
    }
  };

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button>Create Room</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a new room</DialogTitle>
          <DialogDescription>Enter a name for your room to get started.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="name">
              Room Name
            </Label>
            <Input className="col-span-3" id="name" onChange={e => setName(e.target.value)} value={name} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="max-players">
              Max. Players
            </Label>
            <Input
              className="col-span-3"
              id="max-players"
              onChange={e => setMaxPlayers(e.target.value)}
              type="number"
              value={maxPlayers}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreateRoom} type="submit">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
