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
    const storyDialogShare = document.querySelector("#storyDialogShare");
    const summaryContextContainer = document.querySelector(".story-summary-contexts");
  const summaryFeatures = window.ProductConfig?.summaryFeatures;
  let summaryContextButtons = [];
  let summaryContexts = [];
  let activeStory;
  let activeStoryIndex;
  let stories = [];
  let activeSummaryContext = "standard";

  if (!window.ProductContentReady || !summaryFeatures?.ui?.length || !summaryFeatures.contexts || !storyGrid || !storyDialog || !storyDialogClose || !storyDialogCategory || !storyDialogTitle || !summaryContextContainer || !storyDialogSummary || !storyDialogSource || !storyDialogPrevious || !storyDialogNext) {
    throw new Error("The content engine could not find its loader or rendering targets.");
  }

    function flashShareButton() {
      const original = window.ProductConfig?.copy?.shareStoryLabel ?? "Share story";
      storyDialogShare.textContent = "Link copied";
      storyDialogShare.setAttribute("aria-live", "polite");
      setTimeout(() => {
        if (storyDialogShare) storyDialogShare.textContent = original;
      }, 1800);
    }

    async function shareCurrentStory() {
      const story = activeStory;
      if (!story) return;
      const url = window.location.href.split("#")[0];
      const siteName = window.ProductConfig?.identity?.name ?? "AI Nuggets";
      const text = `${story.title} — via ${siteName}`;
      const navigatorShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
      if (navigatorShare) {
        try {
          await navigator.share({ title: story.title, text, url });
          return;
        } catch (error) {
          if (error?.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        flashShareButton();
      } catch {
        const mailto = `mailto:?subject=${encodeURIComponent(story.title)}&body=${encodeURIComponent(`${text}\n${url}`)}`;
        window.location.href = mailto;
      }
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

    const company = window.ProductCompanyImages?.findCompanyImage(story);
    if (company) article.classList.add("story-card--has-company-image");

    const art = createElement("div", `story-art story-art--${story.art}`);
    art.setAttribute("aria-hidden", "true");
    if (company) {
      const image = document.createElement("img");
      image.src = company.image;
      image.alt = "";
      image.decoding = "async";
      art.append(image);
    }
    const shade = createElement("div", "story-shade");
    shade.setAttribute("aria-hidden", "true");

    const number = String(index + 1).padStart(2, "0");
    const numberLabel = story.type === "lead" ? `${number} / Lead story` : number;
    const contentElement = createElement("div", "story-content");
    contentElement.append(
      createElement("span", "story-tag", story.category),
      createElement("h2", "", story.title)
    );

    article.append(art, shade, createElement("span", "story-number", numberLabel), contentElement);
    article.addEventListener("click", () => showStoryDialog(index));
    return article;
  }

  function selectSummaryContext(context) {
    activeSummaryContext = context;
    storyDialogSummary.replaceChildren(...createSummaryContent(activeStory.summaries[context], context));
    storyDialogSummary.scrollTop = 0;
    for (const button of summaryContextButtons) {
      const isSelected = button.dataset.summaryContext === context;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    }
  }

  function configureSummaryContexts(story) {
    summaryContexts = summaryFeatures.ui.filter((key) => typeof story.summaries[key] === "string" && story.summaries[key].trim());
    if (!summaryContexts.length) throw new Error("This story has no enabled summary contexts.");
    summaryContextButtons = summaryContexts.map((key) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.summaryContext = key;
      button.textContent = summaryFeatures.contexts[key].label;
      button.addEventListener("click", () => selectSummaryContext(key));
      return button;
    });
    summaryContextContainer.replaceChildren(...summaryContextButtons);
    summaryContextContainer.hidden = summaryContexts.length === 1;
  }

  function createSummaryContent(summary, context) {
    if (context === "standard") {
      const bulletPoints = summary.trim().split("\n");
      if (bulletPoints.length >= 1 && bulletPoints.every((line) => line.startsWith("- "))) {
        const list = createElement("ul", "story-dialog-summary-list");
        list.append(...bulletPoints.map((point) => createElement("li", "", point.slice(2))));
        return [list];
      }
    }

    if (context === "detailed") {
      return summary.trim().split(/\n\s*\n/).map((paragraph) => createElement("p", "story-dialog-summary-paragraph", paragraph));
    }

    return [createElement("p", "story-dialog-summary-paragraph", summary)];
  }

  function updateStoryDialog(index) {
    activeStoryIndex = index;
    activeStory = stories[index];
    configureSummaryContexts(activeStory);
    storyDialogCategory.textContent = activeStory.category;
    storyDialogTitle.textContent = activeStory.title;
    storyDialogSource.href = activeStory.href;
    storyDialogPrevious.disabled = index === 0;
    storyDialogNext.disabled = index === stories.length - 1;
    selectSummaryContext(summaryContexts.includes(activeSummaryContext) ? activeSummaryContext : summaryContexts[0]);
  }

  function showStoryDialog(index) {
    activeSummaryContext = summaryFeatures.defaultContext;
    updateStoryDialog(index);
    storyDialog.showModal();
  }

  storyDialogPrevious.addEventListener("click", () => {
    if (activeStoryIndex > 0) updateStoryDialog(activeStoryIndex - 1);
  });
  storyDialogNext.addEventListener("click", () => {
    if (activeStoryIndex < stories.length - 1) updateStoryDialog(activeStoryIndex + 1);
  });
    storyDialogShare.addEventListener("click", () => shareCurrentStory());
    storyDialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      storyDialogSummary.scrollTop += event.key === "ArrowDown" ? 96 : -96;
      return;
    }
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
    const content = await window.ProductContentReady;
    stories = content.stories;
    storyGrid.dataset.storyCount = String(content.stories.length);
    storyGrid.replaceChildren(...content.stories.map(renderStory));
  } catch (error) {
    storyGrid.replaceChildren();
    console.error(error);
  }
}());
