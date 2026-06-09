export function isMissingRelationOrColumnError(message: string, names: string[]) {
  const normalized = message.toLowerCase();
  return names.some((name) => {
    const bare = name.toLowerCase();
    const publicName = `public.${bare}`;
    return (
      normalized.includes(`relation "${bare}" does not exist`) ||
      normalized.includes(`relation '${bare}' does not exist`) ||
      normalized.includes(`relation "${publicName}" does not exist`) ||
      normalized.includes(`relation '${publicName}' does not exist`) ||
      normalized.includes(`column ${bare} does not exist`) ||
      normalized.includes(`column "${bare}" does not exist`) ||
      (normalized.includes("schema cache") &&
        (normalized.includes(`'${bare}'`) ||
          normalized.includes(`"${bare}"`) ||
          normalized.includes(`'${publicName}'`) ||
          normalized.includes(`"${publicName}"`)))
    );
  });
}
