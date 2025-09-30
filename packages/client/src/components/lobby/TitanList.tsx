// TitanList.tsx

import type { Titan } from "@shared/index.ts";
import React from "react";
import { Card } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

interface TitanListProps {
  titans: Titan[];
}

export const TitanList: React.FC<TitanListProps> = ({ titans }) => {
  if (!titans || titans.length === 0) {
    return (
      <Card>
        <div className="p-4 text-center text-muted-foreground">No titans available.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {titans.map(titan => (
        <Card className="p-4" key={titan.id}>
          <h3 className="mb-2 font-bold text-lg">{titan.name}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stat</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(titan.stats).map(([stat, value]) => (
                <TableRow key={stat}>
                  <TableCell>{stat}</TableCell>
                  <TableCell>{String(value)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>Abilities</TableCell>
                <TableCell>{(titan.abilities ?? []).map(a => a.name).join(", ") || "None"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      ))}
    </div>
  );
};

export default TitanList;
