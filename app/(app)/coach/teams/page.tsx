import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateTeamDialog } from "@/components/coach/CreateTeamDialog";

export default async function CoachTeamsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  type TeamWithCount = {
    id: string;
    name: string;
    description: string | null;
    invite_code: string;
    created_at: string;
    team_memberships: { count: number }[];
  };

  const { data: teams } = await supabase
    .from("teams")
    .select(
      `
      id, name, description, invite_code, created_at,
      team_memberships(count)
    `
    )
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false })
    .returns<TeamWithCount[]>();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Mis equipos</h1>
          <p className="text-muted-foreground">
            Gestioná tus equipos y planes de entrenamiento
          </p>
        </div>
        <CreateTeamDialog />
      </div>

      {teams?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">👥</p>
          <p>Todavía no tenés equipos.</p>
          <p className="text-sm">Creá uno para empezar.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams?.map((team) => {
            const memberCount = team.team_memberships?.[0]?.count ?? 0;
            return (
              <Link key={team.id} href={`/coach/teams/${team.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <Badge variant="secondary" className="font-mono text-xs shrink-0">
                        {team.invite_code}
                      </Badge>
                    </div>
                    {team.description && (
                      <CardDescription>{team.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {memberCount} runner{memberCount !== 1 ? "s" : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
