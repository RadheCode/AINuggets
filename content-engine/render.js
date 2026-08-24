(async function renderContent() {
  const storyGrid = document.querySelector("#storyGrid");
  const storyDialog = document.querySelector("#storyDialog");
  const storyDialogClose = document.querySelector("#storyDialogClose");
  const storyDialogCategory = document.querySelector("#storyDialogCategory");
  const storyDialogTitle = document.querySelector("#storyDialogTitle");
  const storyDialogSummary = document.querySelector("#storyDialogSummary");
  const storyDialogSource = document.querySelector("#storyDialogSource");
  const storyDialogPrevious = document.querySelector("#storyDialogPrevious");
  const storyDialogNext = document.querySelector("#storyDialogNext");
  const summaryContextButtons = [...document.querySelectorAll("[data-summary-context]")];
  const summaryContexts = summaryContextButtons.map((button) => button.dataset.summaryContext);
  let activeStory;
  let activeStoryIndex;
  let stories = [];
  let activeSummaryContext = "standard";

  if (!window.AINuggetsContentReady || !storyGrid || !storyDialog || !storyDialogClose || !storyDialogCategory || !storyDialogTitle || !storyDialogSummary || !storyDialogSource || !storyDialogPrevious || !storyDialogNext) {
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
    articleClasses.push(`story-card--slot-${index + 1}`);
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
    article.addEventListener("click", () => showStoryDialog(index));
    return article;
  }

  function selectSummaryContext(context) {
    activeSummaryContext = context;
    storyDialogSummary.textContent = activeStory.summaries[context];
    storyDialogSummary.scrollTop = 0;
    for (const button of summaryContextButtons) {
      const isSelected = button.dataset.summaryContext === context;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    }
  }

  function updateStoryDialog(index) {
    activeStoryIndex = index;
    activeStory = stories[index];
    storyDialogCategory.textContent = activeStory.category;
    storyDialogTitle.textContent = activeStory.title;
    storyDialogSource.href = activeStory.href;
    storyDialogPrevious.disabled = index === 0;
    storyDialogNext.disabled = index === stories.length - 1;
    selectSummaryContext(activeSummaryContext);
  }

  function showStoryDialog(index) {
    activeSummaryContext = "standard";
    updateStoryDialog(index);
    storyDialog.showModal();
  }

  for (const button of summaryContextButtons) {
    button.addEventListener("click", () => selectSummaryContext(button.dataset.summaryContext));
  }

  storyDialogPrevious.addEventListener("click", () => {
    if (activeStoryIndex > 0) updateStoryDialog(activeStoryIndex - 1);
  });
  storyDialogNext.addEventListener("click", () => {
    if (activeStoryIndex < stories.length - 1) updateStoryDialog(activeStoryIndex + 1);
  });
  storyDialog.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const currentContextIndex = summaryContexts.indexOf(activeSummaryContext);
      const direction = event.shiftKey ? -1 : 1;
      const nextContextIndex = (currentContextIndex + direction + summaryContexts.length) % summaryContexts.length;
      selectSummaryContext(summaryContexts[nextContextIndex]);
    }
    if (event.key === "ArrowLeft" && activeStoryIndex > 0) {
      event.preventDefault();
      updateStoryDialog(activeStoryIndex - 1);
    }
    if (event.key === "ArrowRight" && activeStoryIndex < stories.length - 1) {
      event.preventDefault();
      updateStoryDialog(activeStoryIndex + 1);
    }
  });
  storyDialogClose.addEventListener("click", () => storyDialog.close());
  storyDialog.addEventListener("click", (event) => {
    if (event.target === storyDialog) storyDialog.close();
  });

  try {
    const content = await window.AINuggetsContentReady;
    stories = content.stories;
    storyGrid.dataset.storyCount = String(content.stories.length);
    storyGrid.replaceChildren(...content.stories.map(renderStory));
  } catch (error) {
    storyGrid.replaceChildren();
    console.error(error);
  }
}());
