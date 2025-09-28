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

export function CreateRoomDialog() {
  const [roomName, setRoomName] = useState("");

  const handleCreateRoom = () => {
    // TODO: Implement room creation logic
    console.log("Creating room:", roomName);
  };

  return (
    <Dialog>
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
            <Input className="col-span-3" id="name" onChange={e => setRoomName(e.target.value)} value={roomName} />
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
