import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlanCardProps {
  id: string;
  planMonth: string;
  teamName: string;
  fileName: string;
  notes: string | null;
}

function formatPlanMonth(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export function PlanCard({ id, planMonth, teamName, fileName, notes }: PlanCardProps) {
  return (
    <Link href={`/runner/plans/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base capitalize">
              {formatPlanMonth(planMonth)}
            </CardTitle>
            <Badge variant="secondary" className="shrink-0">
              {teamName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground truncate">{fileName}</p>
          {notes && (
            <p className="text-xs text-muted-foreground mt-1 italic truncate">
              {notes}
            </p>
          )}
          <p className="text-xs text-primary mt-2 font-medium">Ver plan →</p>
        </CardContent>
      </Card>
    </Link>
  );
}
