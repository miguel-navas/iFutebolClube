import { useState, useCallback, useEffect } from "react";
import { useEdition } from "@/contexts/EditionContext";

// Chave antiga, usada quando só existia a Copa do Mundo 2026.
const LEGACY_KEY = "wc2026_alerts";

function storageKey(competition: string, year: string) {
  return `alerts:${competition}:${year}`;
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export interface AlertMatch {
  id: string;
  type: "group" | "knockout";
  date: string;
  time: string;
  teamA: string;
  teamB: string;
  stadium: string;
  group?: string;
  round?: string;
}

function parseIds(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function loadAlerts(competition: string, year: string): Set<string> {
  const key = storageKey(competition, year);
  const current = readStorage(key);
  if (current !== null) return parseIds(current);

  // Migração única: alertas salvos antes da navegação por edição são da Copa 2026.
  if (competition === "copa" && year === "2026") {
    const legacy = readStorage(LEGACY_KEY);
    if (legacy !== null) {
      const ids = parseIds(legacy);
      if (writeStorage(key, JSON.stringify([...ids]))) removeStorage(LEGACY_KEY);
      return ids;
    }
  }
  return new Set();
}

export function useAlerts() {
  const { competition, year, data } = useEdition();
  const { matches, bracketMatches } = data;
  const [alertIds, setAlertIds] = useState<Set<string>>(() => loadAlerts(competition, year));

  useEffect(() => {
    writeStorage(storageKey(competition, year), JSON.stringify([...alertIds]));
  }, [alertIds, competition, year]);

  const toggleAlert = useCallback((matchId: string) => {
    setAlertIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  }, []);

  const isAlerted = useCallback(
    (matchId: string) => alertIds.has(matchId),
    [alertIds]
  );

  const alertedMatches: AlertMatch[] = [...alertIds]
    .map((id) => {
      // Check group stage
      const groupMatch = matches.find((m) => String(m.id) === id);
      if (groupMatch) {
        return {
          id: String(groupMatch.id),
          type: "group" as const,
          date: groupMatch.date,
          time: groupMatch.time,
          teamA: groupMatch.teamA,
          teamB: groupMatch.teamB,
          stadium: groupMatch.stadium,
          group: groupMatch.group,
        };
      }
      // Check knockout stage
      const knockoutMatch = bracketMatches.find((m) => m.id === id);
      if (knockoutMatch) {
        return {
          id: knockoutMatch.id,
          type: "knockout" as const,
          date: knockoutMatch.date,
          time: "A definir",
          teamA: knockoutMatch.teamA || "A definir",
          teamB: knockoutMatch.teamB || "A definir",
          stadium: knockoutMatch.stadium,
          round: knockoutMatch.round,
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a!.date.localeCompare(b!.date)) as AlertMatch[];

  const alertCount = alertedMatches.length;

  const clearAll = useCallback(() => {
    setAlertIds(new Set());
  }, []);

  return { alertIds, toggleAlert, isAlerted, alertedMatches, alertCount, clearAll };
}