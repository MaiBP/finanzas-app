export type CategoryAmount = { name: string; value: number };

export function groupCategoryChartData(data: CategoryAmount[], maxBars = 7) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  if (sorted.length <= maxBars) return sorted;
  const visible = sorted.slice(0, maxBars - 1);
  const rest = sorted
    .slice(maxBars - 1)
    .reduce((sum, item) => sum + item.value, 0);
  return [...visible, { name: "Resto", value: rest }];
}
