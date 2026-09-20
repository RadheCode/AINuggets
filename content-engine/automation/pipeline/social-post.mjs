function weightedLength(value) {
  return Array.from(value).reduce((length, character) => length + (character.codePointAt(0) <= 0x7f ? 1 : 2), 0);
}

function abbreviate(title, maximumWeightedLength) {
  const suffix = "…";
  if (weightedLength(title) <= maximumWeightedLength) return title;

  let result = "";
  for (const character of title) {
    if (weightedLength(`${result}${character}${suffix}`) > maximumWeightedLength) break;
    result += character;
  }
  return `${result.trimEnd()}${suffix}`;
}

export function socialPostWeightedLength(text, editionUrl, shortenedUrlLength) {
  return weightedLength(text.split(editionUrl).join("")) + (text.split(editionUrl).length - 1) * shortenedUrlLength;
}

export function createSocialPost({ edition, config, editionUrl, maximumLength, shortenedUrlLength }) {
  if (!config?.enabled || !edition?.stories?.length) return null;

  for (let titleLimit = 37; titleLimit > 0; titleLimit -= 1) {
    const stories = edition.stories.map((story) => `• ${abbreviate(story.title, titleLimit)}`).join("\n");
    const text = config.messageTemplate
      .replaceAll("{date}", edition.date)
      .replaceAll("{stories}", stories)
      .replaceAll("{url}", editionUrl);
    if (socialPostWeightedLength(text, editionUrl, shortenedUrlLength) <= maximumLength) return text;
  }

  throw new Error("Social post exceeds the configured platform length limit.");
}