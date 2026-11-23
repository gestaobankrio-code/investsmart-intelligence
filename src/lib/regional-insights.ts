import { norm } from "./intelligence";
import type { StateTrendRecord } from "./state-trends";

/**
 * Uma expressão é descoberta no feed estadual; a chave só normaliza
 * diferenças de acentuação/caixa, sem gerar termos novos.
 */
export const topicKey = (term: string) => norm(term).replace(/\s+/g, " ");

export interface RegionalTopic {
  key: string;
  label: string;
  states: string[];
  records: StateTrendRecord[];
  latestAt: string | null;
}

const time = (date: string | null) => (date ? Date.parse(date) || 0 : 0);

export function groupRegionalTopics(records: StateTrendRecord[]): RegionalTopic[] {
  const grouped = new Map<string, Map<string, StateTrendRecord>>();
  for (const record of records) {
    const key = topicKey(record.term);
    if (!key) continue;
    const perUF = grouped.get(key) ?? new Map<string, StateTrendRecord>();
    const previous = perUF.get(record.uf);
    if (!previous || time(record.publishedAt) > time(previous.publishedAt)) {
      perUF.set(record.uf, record);
    }
    grouped.set(key, perUF);
  }
  return [...grouped.entries()]
    .map(([key, states]) => {
      const occurrences = [...states.values()].sort(
        (a, b) => time(b.publishedAt) - time(a.publishedAt) || a.uf.localeCompare(b.uf),
      );
      return {
        key,
        label: occurrences[0]?.term ?? key,
        states: occurrences.map((r) => r.uf),
        records: occurrences,
        latestAt: occurrences[0]?.publishedAt ?? null,
      };
    })
    .sort((a, b) => time(b.latestAt) - time(a.latestAt) || a.label.localeCompare(b.label, "pt-BR"));
}

export interface RegionalComparison {
  ufs: string[];
  topics: Array<
    RegionalTopic & { presentIn: number; shared: boolean; onlyWithinSelection: boolean }
  >;
  sharedAcrossAll: number;
  exclusiveWithinSelection: number;
  unionCount: number;
}

export function compareRegionalStates(
  records: StateTrendRecord[],
  selected: string[],
): RegionalComparison {
  const ufs = [...new Set(selected.filter(Boolean))];
  const topics = groupRegionalTopics(records.filter((r) => ufs.includes(r.uf))).map((topic) => {
    const presentIn = topic.states.length;
    return {
      ...topic,
      presentIn,
      shared: ufs.length >= 2 && presentIn === ufs.length,
      onlyWithinSelection: ufs.length >= 2 && presentIn === 1,
    };
  });
  topics.sort(
    (a, b) =>
      Number(b.shared) - Number(a.shared) ||
      b.presentIn - a.presentIn ||
      time(b.latestAt) - time(a.latestAt) ||
      a.label.localeCompare(b.label, "pt-BR"),
  );
  return {
    ufs,
    topics,
    sharedAcrossAll: topics.filter((topic) => topic.shared).length,
    exclusiveWithinSelection: topics.filter((topic) => topic.onlyWithinSelection).length,
    unionCount: topics.length,
  };
}

export function stateTopics(topics: RegionalTopic[], uf: string): RegionalTopic[] {
  return topics.filter((t) => t.states.includes(uf));
}
