export interface UserSignals {
  userId: string;
  signals: Array<{ type: string; months_consistent: number }>;
}

export interface VouchEdge {
  voucherId: string;
  voucheeId: string;
  strength: number;
}

export interface TrustScoreResult {
  scores: Record<string, number>;
  ownScores: Record<string, number>;
}

function normalizeToRange(scores: Record<string, number>, min: number, max: number): Record<string, number> {
  const values = Object.values(scores);
  if (values.length === 0) return scores;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  if (minVal === maxVal) {
    return Object.fromEntries(Object.keys(scores).map((k) => [k, (min + max) / 2]));
  }

  return Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [
      k,
      min + ((v - minVal) / (maxVal - minVal)) * (max - min),
    ])
  );
}

export function computeTrustScores(
  userIds: string[],
  userSignals: UserSignals[],
  vouches: VouchEdge[]
): Record<string, number> {
  // Step 1: Build signal scores per user
  const ownScore: Record<string, number> = {};
  for (const uid of userIds) {
    ownScore[uid] = 0;
  }

  for (const { userId, signals } of userSignals) {
    let score = 0;
    for (const signal of signals) {
      if (signal.type === "rent") {
        score += signal.months_consistent * 8;
      } else if (signal.type === "utility") {
        score += signal.months_consistent * 5;
      } else if (signal.type === "mobile") {
        score += signal.months_consistent * 4;
      } else if (signal.type === "default") {
        score += signal.months_consistent * -20;
      }
    }
    ownScore[userId] = score;
  }

  // Step 2: Build adjacency (who vouches for who)
  // graph[voucherId] -> [{node: voucheeId, weight}]
  const graph: Record<string, Array<{ node: string; weight: number }>> = {};
  for (const uid of userIds) {
    graph[uid] = [];
  }
  for (const vouch of vouches) {
    if (!graph[vouch.voucherId]) graph[vouch.voucherId] = [];
    graph[vouch.voucherId].push({ node: vouch.voucheeId, weight: vouch.strength / 10 });
  }

  // Build reverse adjacency: for each user, who vouches for them?
  const reverseGraph: Record<string, Array<{ node: string; weight: number }>> = {};
  for (const uid of userIds) {
    reverseGraph[uid] = [];
  }
  for (const vouch of vouches) {
    if (!reverseGraph[vouch.voucheeId]) reverseGraph[vouch.voucheeId] = [];
    reverseGraph[vouch.voucheeId].push({ node: vouch.voucherId, weight: vouch.strength / 10 });
  }

  // Step 3: Run trust propagation (10 iterations)
  const ALPHA = 0.6;
  let scores: Record<string, number> = { ...ownScore };

  for (let iter = 0; iter < 10; iter++) {
    const newScores: Record<string, number> = {};

    for (const uid of userIds) {
      const incomingVouchers = reverseGraph[uid] || [];
      let propagated = 0;
      for (const { node: voucherId, weight } of incomingVouchers) {
        propagated += (scores[voucherId] ?? 0) * weight;
      }
      newScores[uid] = ALPHA * (ownScore[uid] ?? 0) + (1 - ALPHA) * propagated;
    }

    // Normalize to 0-600 range after each iteration
    const normalized = normalizeToRange(newScores, 0, 600);
    for (const uid of userIds) {
      scores[uid] = normalized[uid] ?? 0;
    }
  }

  // Step 4: Map to 300-850 range (FICO-style)
  const finalScores = normalizeToRange(scores, 300, 850);

  // Round to integers
  return Object.fromEntries(
    Object.entries(finalScores).map(([k, v]) => [k, Math.round(v)])
  );
}

export function computeScoreBreakdown(
  userId: string,
  signals: Array<{ type: string; months_consistent: number }>,
  vouchCount: number,
  finalScore: number
): Array<{ label: string; points: number }> {
  let rentPoints = 0;
  let utilityPoints = 0;
  let mobilePoints = 0;
  let defaultPenalty = 0;

  for (const signal of signals) {
    if (signal.type === "rent") rentPoints += signal.months_consistent * 8;
    else if (signal.type === "utility") utilityPoints += signal.months_consistent * 5;
    else if (signal.type === "mobile") mobilePoints += signal.months_consistent * 4;
    else if (signal.type === "default") defaultPenalty += signal.months_consistent * 20;
  }

  const vouchTrust = Math.round(vouchCount * 15);

  return [
    { label: "Rent Payments", points: rentPoints },
    { label: "Utility Bills", points: utilityPoints },
    { label: "Mobile Top-ups", points: mobilePoints },
    { label: "Vouch Trust", points: vouchTrust },
    { label: "Defaults", points: -defaultPenalty },
  ];
}
