// TitanList.tsx
import React from "react";
import type { Titan } from "../../../../shared/src/index";
import { Card } from "../ui/card";
import { Table } from "../ui/table";

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
          <h3 className="text-lg font-bold mb-2">{titan.name}</h3>
          <Table>
            <thead>
              <tr>
                <th>Stat</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(titan.stats).map(([stat, value]) => (
                <tr key={stat}>
                  <td>{stat}</td>
                  <td>{String(value)}</td>
                </tr>
              ))}
              <tr>
                <td>Special Ability</td>
                <td>{titan.specialAbility}</td>
              </tr>
            </tbody>
          </Table>
        </Card>
      ))}
    </div>
  );
};

export default TitanList;
