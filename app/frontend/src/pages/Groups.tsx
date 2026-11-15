import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useEdition, useEditionPath } from "@/contexts/EditionContext";
import GroupMatches from "@/components/GroupMatches";
import FilterSelect from "@/components/FilterSelect";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function GroupsPage() {
  const { data } = useEdition();
  const editionPath = useEditionPath();
  const { groups, getGroupStandings, getMatchesByGroup } = data;
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const displayGroups = selectedGroup ? [selectedGroup] : groups;

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 pt-24 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white">Fase de Grupos</h1>
          <p className="text-[#94A3B8] mt-1">12 grupos · 4 seleções por grupo · Os 2 primeiros avançam</p>
        </div>

        {/* Celular: filtro em lista */}
        <div className="mb-6 md:hidden" data-testid="group-filter-mobile">
          <FilterSelect
            label="Grupo"
            testId="filter-group"
            value={selectedGroup ?? "Todos"}
            onChange={(v) => setSelectedGroup(v === "Todos" ? null : v)}
            options={[{ value: "Todos", label: "Todos os grupos" }, ...groups.map((g) => ({ value: g, label: `Grupo ${g}` }))]}
          />
        </div>

        {/* Group Filter */}
        <div className="hidden md:flex flex-wrap gap-1.5 mb-8">
          <button
            onClick={() => setSelectedGroup(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedGroup === null
                ? "bg-[#D4AF37] text-[#0A0F1C]"
                : "bg-[#131A2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
            }`}
          >
            Todos
          </button>
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedGroup === g
                  ? "bg-[#D4AF37] text-[#0A0F1C]"
                  : "bg-[#131A2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
              }`}
            >
              Grupo {g}
            </button>
          ))}
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
          {displayGroups.map((g) => {
            const standings = getGroupStandings(g);
            const groupMatches = getMatchesByGroup(g);

            return (
              <Card key={g} data-testid="group-card" className="bg-[#131A2E] border-[#1E293B] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1E293B] flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#D4AF37]">Grupo {g}</h3>
                  <Badge variant="outline" className="text-[10px] border-[#1E293B] text-[#94A3B8]">
                    {groupMatches.length} jogos
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow className="border-[#1E293B] hover:bg-transparent">
                        <TableHead className="text-[#94A3B8] text-[10px] font-semibold w-8 px-2">#</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] font-semibold px-2">Seleção</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] font-semibold text-center px-1 w-9">J</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] font-semibold text-center px-1 w-9">V</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] font-semibold text-center px-1 w-9">E</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] font-semibold text-center px-1 w-9">D</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] font-semibold text-center px-1 w-9 hidden sm:table-cell">GM</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] font-semibold text-center px-1 w-9 hidden sm:table-cell">GS</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] font-semibold text-center px-1 w-9">SG</TableHead>
                        <TableHead className="text-[#94A3B8] text-[10px] font-semibold text-center px-1 w-11">Pts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings.map((team, idx) => (
                        <TableRow
                          key={team.code}
                          className={`border-[#1E293B] hover:bg-white/5 ${
                            idx < 2 ? "bg-[#22C55E]/5" : ""
                          }`}
                        >
                          <TableCell className="text-xs text-[#94A3B8] font-medium px-2 py-2.5">{idx + 1}</TableCell>
                          <TableCell className="px-2 py-2.5">
                            <span className="block truncate text-sm font-semibold text-white" title={team.team}>
                              {team.team}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs text-[#94A3B8] px-1 py-2.5">{team.played}</TableCell>
                          <TableCell className="text-center text-xs text-[#94A3B8] px-1 py-2.5">{team.won}</TableCell>
                          <TableCell className="text-center text-xs text-[#94A3B8] px-1 py-2.5">{team.drawn}</TableCell>
                          <TableCell className="text-center text-xs text-[#94A3B8] px-1 py-2.5">{team.lost}</TableCell>
                          <TableCell className="text-center text-xs text-[#94A3B8] px-1 py-2.5 hidden sm:table-cell">{team.goalsFor}</TableCell>
                          <TableCell className="text-center text-xs text-[#94A3B8] px-1 py-2.5 hidden sm:table-cell">{team.goalsAgainst}</TableCell>
                          <TableCell className="text-center text-xs text-[#94A3B8] px-1 py-2.5">{team.goalDifference}</TableCell>
                          <TableCell className="text-center text-sm font-bold text-white px-1 py-2.5">{team.points}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <GroupMatches
                  group={g}
                  matches={groupMatches}
                  hrefOf={(m) => editionPath('jogos', String(m.id))}
                />
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}