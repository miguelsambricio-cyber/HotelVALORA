import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MOCK = [
  { name: "Grand Hyatt Miami", keys: 460, ppk: "$312K", cap: "6.1%" },
  { name: "Curio Miami Beach", keys: 212, ppk: "$485K", cap: "5.4%" },
  { name: "AC Hotel Brickell", keys: 178, ppk: "$290K", cap: "6.8%" },
  { name: "Cambria Nashville", keys: 255, ppk: "$248K", cap: "7.2%" },
  { name: "Moxy Austin", keys: 130, ppk: "$210K", cap: "7.8%" },
];

export function RecentTransactions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Comps</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground text-xs">
              <th className="px-4 py-2">Property</th>
              <th className="px-4 py-2 text-right">$/Key</th>
              <th className="px-4 py-2 text-right">Cap</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.map((tx) => (
              <tr key={tx.name} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-2.5">
                  <p className="font-medium line-clamp-1">{tx.name}</p>
                  <p className="text-xs text-muted-foreground">{tx.keys} keys</p>
                </td>
                <td className="px-4 py-2.5 text-right font-mono">{tx.ppk}</td>
                <td className="px-4 py-2.5 text-right font-mono">{tx.cap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
