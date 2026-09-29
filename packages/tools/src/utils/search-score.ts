export function searchScore(query: string, name: string, description: string): number {
  const normalizedName = name.toLocaleLowerCase();
  const normalizedDescription = description.toLocaleLowerCase();
  const terms = query.match(/[\p{L}\p{N}_-]+/gu) ?? [];
  return (
    (normalizedName === query ? 100 : 0) +
    (normalizedName.includes(query) ? 40 : 0) +
    (normalizedDescription.includes(query) ? 20 : 0) +
    terms.reduce(
      (total, term) =>
        total + (normalizedName.includes(term) ? 8 : normalizedDescription.includes(term) ? 2 : 0),
      0,
    )
  );
}
