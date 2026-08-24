(async function renderContent() {
  const storyGrid = document.querySelector("#storyGrid");
  const storyDialog = document.querySelector("#storyDialog");
  const storyDialogClose = document.querySelector("#storyDialogClose");
  const storyDialogCategory = document.querySelector("#storyDialogCategory");
  const storyDialogTitle = document.querySelector("#storyDialogTitle");
  const storyDialogSummary = document.querySelector("#storyDialogSummary");
  const storyDialogSource = document.querySelector("#storyDialogSource");

  if (!window.AINuggetsContentReady || !storyGrid || !storyDialog || !storyDialogClose || !storyDialogCategory || !storyDialogTitle || !storyDialogSummary || !storyDialogSource) {
    throw new Error("AI Nuggets content engine could not find its loader or rendering targets.");
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function renderStory(story, index) {
    const articleClasses = ["story-card"];
    if (story.type === "lead") articleClasses.push("story-card--lead");
    if (story.type === "wide") articleClasses.push("story-card--wide");

    const article = createElement("button", articleClasses.join(" "));
    article.type = "button";
    article.id = `story-${story.id}`;
    article.style.setProperty("--order", index);
    article.setAttribute("aria-haspopup", "dialog");
    article.setAttribute("aria-label", `Show summary: ${story.title}`);

    const art = createElement("div", `story-art story-art--${story.art}`);
    art.setAttribute("aria-hidden", "true");
    const shade = createElement("div", "story-shade");
    shade.setAttribute("aria-hidden", "true");

    const number = String(index + 1).padStart(2, "0");
    const numberLabel = story.type === "lead" ? `${number} / Lead story` : number;
    const contentElement = createElement("div", "story-content");
    contentElement.append(
      createElement("span", "story-tag", story.category),
      createElement("h2", "", story.title)
    );

    const detailIndicator = createElement("span", "story-link", "\u2192");
    detailIndicator.setAttribute("aria-hidden", "true");

    article.append(art, shade, createElement("span", "story-number", numberLabel), contentElement, detailIndicator);
    article.addEventListener("click", () => showStoryDialog(story));
    return article;
  }

  function showStoryDialog(story) {
    storyDialogCategory.textContent = story.category;
    storyDialogTitle.textContent = story.title;
    storyDialogSummary.textContent = story.summary;
    storyDialogSource.href = story.href;
    storyDialog.showModal();
  }

  storyDialogClose.addEventListener("click", () => storyDialog.close());
  storyDialog.addEventListener("click", (event) => {
    if (event.target === storyDialog) storyDialog.close();
  });

  try {
    const content = await window.AINuggetsContentReady;
    storyGrid.dataset.storyCount = String(content.stories.length);
    storyGrid.replaceChildren(...content.stories.map(renderStory));
  } catch (error) {
    storyGrid.replaceChildren();
    console.error(error);
  }
}());
