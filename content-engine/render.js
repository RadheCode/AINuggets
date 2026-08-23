(async function renderContent() {
  const intro = document.querySelector("#briefingIntro");
  const storyGrid = document.querySelector("#storyGrid");

  if (!window.AINuggetsContentReady || !intro || !storyGrid) {
    throw new Error("AI Nuggets content engine could not find its loader or rendering targets.");
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function renderBriefing(content) {
    const headingGroup = document.createElement("div");
    const eyebrow = createElement("p", "eyebrow");
    const eyebrowDot = document.createElement("span");
    eyebrowDot.setAttribute("aria-hidden", "true");
    eyebrow.append(eyebrowDot, document.createTextNode(` ${content.briefing.eyebrow}`));

    const title = createElement("h1", "", content.briefing.title);
    title.id = "pageTitle";
    title.append(" ", createElement("em", "", content.briefing.emphasis));
    headingGroup.append(eyebrow, title);

    const copy = createElement("div", "briefing-copy");
    copy.append(createElement("p", "", content.briefing.summary));
    const meta = createElement("div", "briefing-meta");
    meta.setAttribute("aria-label", "Briefing details");
    content.briefing.meta.forEach((item) => meta.append(createElement("span", "", item)));
    copy.append(meta);

    intro.replaceChildren(headingGroup, copy);
  }

  function renderStory(story, index) {
    const articleClasses = ["story-card"];
    if (story.type === "lead") articleClasses.push("story-card--lead");
    if (story.type === "wide") articleClasses.push("story-card--wide");

    const article = createElement("article", articleClasses.join(" "));
    article.id = `story-${story.id}`;
    article.style.setProperty("--order", index);

    const art = createElement("div", `story-art story-art--${story.art}`);
    art.setAttribute("aria-hidden", "true");
    const shade = createElement("div", "story-shade");
    shade.setAttribute("aria-hidden", "true");

    const number = String(index + 1).padStart(2, "0");
    const numberLabel = story.type === "lead" ? `${number} / Lead story` : number;
    const contentElement = createElement("div", "story-content");
    contentElement.append(
      createElement("span", "story-tag", story.category),
      createElement("h2", "", story.title),
      createElement("p", "", story.summary)
    );

    const link = createElement("a", "story-link", "\u2192");
    link.href = story.href;
    link.setAttribute("aria-label", `Read: ${story.title}`);

    article.append(art, shade, createElement("span", "story-number", numberLabel), contentElement, link);
    return article;
  }

  function renderDate(dateValue) {
    const currentDate = document.querySelector("#currentDate");
    const [year, month, day] = dateValue.split("-").map(Number);
    const editionDate = new Date(year, month - 1, day);
    currentDate.dateTime = dateValue;
    currentDate.textContent = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "short",
      day: "numeric"
    }).format(editionDate).replace(",", " / ");
  }

  try {
    const content = await window.AINuggetsContentReady;
    renderDate(content.date);
    renderBriefing(content);
    storyGrid.replaceChildren(...content.stories.map(renderStory));
  } catch (error) {
    intro.innerHTML = "<div><p class=\"eyebrow\">Briefing unavailable</p><h1 id=\"pageTitle\">We could not load this edition.</h1></div>";
    storyGrid.replaceChildren();
    console.error(error);
  }
}());
