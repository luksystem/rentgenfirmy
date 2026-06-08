export function moveItem<T>(items: T[], index: number, direction: "up" | "down"): T[] {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function withPositions<T extends { position: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, position: index }));
}
