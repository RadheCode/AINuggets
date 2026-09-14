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
  const storyShareDialog = document.querySelector("#storyShareDialog");
  const storyShareDialogClose = document.querySelector("#storyShareDialogClose");
  const storyShareUrl = document.querySelector("#storyShareUrl");
  const storyShareCopyButton = document.querySelector("#storyShareCopyButton");
  const storySharePlatforms = document.querySelector("#storySharePlatforms");
  const summaryContextContainer = document.querySelector(".story-summary-contexts");
  const summaryFeatures = window.ProductConfig?.summaryFeatures;
  let summaryContextButtons = [];
  let summaryContexts = [];
  let activeStory;
  let activeStoryIndex;
  let stories = [];
  let activeSummaryContext = "standard";

  if (!window.ProductContentReady || !summaryFeatures?.ui?.length || !summaryFeatures.contexts || !storyGrid || !storyDialog || !storyDialogClose || !storyDialogCategory || !storyDialogTitle || !summaryContextContainer || !storyDialogSummary || !storyDialogSource || !storyDialogPrevious || !storyDialogNext || !storyDialogShare || !storyShareDialog || !storyShareDialogClose || !storyShareUrl || !storyShareCopyButton || !storySharePlatforms) {
    throw new Error("The content engine could not find its loader or rendering targets.");
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  const storyHashPrefix = "story-";

  function storyIdFromHash() {
    const hash = window.location.hash;
    if (!hash.startsWith(`#${storyHashPrefix}`)) return null;
    return hash.slice(storyHashPrefix.length + 1) || null;
  }

  function storyIndexFromHash() {
    const id = storyIdFromHash();
    if (!id) return -1;
    return stories.findIndex((story) => story.id === id);
  }

  function setStoryHash(id) {
    history.replaceState(null, "", `#${storyHashPrefix}${id}`);
  }

  function clearStoryHash() {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  function applyStoryHash() {
    const index = storyIndexFromHash();
    if (index !== -1) {
      showStoryDialog(index);
    } else if (storyDialog.open) {
      storyDialog.close();
    }
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
    article.addEventListener("click", () => {
      const hash = `#${storyHashPrefix}${story.id}`;
      if (window.location.hash !== hash) window.location.hash = hash;
    });
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
    if (storyShareDialog.open) storyShareDialog.close();
    if (!storyDialog.open) storyDialog.showModal();
  }

  function navigateStory(delta) {
    const nextIndex = activeStoryIndex + delta;
    if (nextIndex < 0 || nextIndex >= stories.length) return;
    updateStoryDialog(nextIndex);
    setStoryHash(stories[nextIndex].id);
  }

  storyDialogPrevious.addEventListener("click", () => navigateStory(-1));
  storyDialogNext.addEventListener("click", () => navigateStory(1));
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
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateStory(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateStory(1);
    }
  });
  storyDialogClose.addEventListener("click", () => storyDialog.close());
  storyDialog.addEventListener("click", (event) => {
    if (event.target === storyDialog) storyDialog.close();
  });
  storyDialog.addEventListener("close", () => {
    if (storyIdFromHash()) clearStoryHash();
  });
  window.addEventListener("hashchange", applyStoryHash);

  function storyShareUrlFor(story) {
    const url = new URL(window.location.href);
    url.hash = `${storyHashPrefix}${story.id}`;
    return url.href;
  }

  function showShareDialog() {
    const share = window.ProductConfig?.copy?.storyShare;
    const url = storyShareUrlFor(activeStory);
    storyShareUrl.value = url;
    storySharePlatforms.replaceChildren(...(share?.platforms || []).map((platform) => {
      const link = document.createElement("a");
      link.className = "story-share-platform";
      link.href = platform.buildUrl(url, activeStory.title);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", platform.label);
      if (platform.icon) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        iconPath.setAttribute("d", platform.icon);
        svg.append(iconPath);
        link.append(svg);
      }
      link.append(document.createTextNode(platform.label));
      return link;
    }));
    if (storyDialog.open) storyDialog.close();
    if (!storyShareDialog.open) storyShareDialog.showModal();
  }

  storyDialogShare.addEventListener("click", showShareDialog);
  storyShareDialogClose.addEventListener("click", () => storyShareDialog.close());
  storyShareDialog.addEventListener("click", (event) => {
    if (event.target === storyShareDialog) storyShareDialog.close();
  });

  let shareCopyResetTimer;
  storyShareCopyButton.addEventListener("click", async () => {
    const share = window.ProductConfig?.copy?.storyShare;
    const defaultLabel = share?.copyLinkLabel || "Copy link";
    const copiedLabel = share?.copyLinkCopiedLabel || "Link copied";
    try {
      await navigator.clipboard.writeText(storyShareUrl.value);
    } catch {
      storyShareUrl.select();
      document.execCommand("copy");
    }
    storyShareCopyButton.textContent = copiedLabel;
    window.clearTimeout(shareCopyResetTimer);
    shareCopyResetTimer = window.setTimeout(() => {
      storyShareCopyButton.textContent = defaultLabel;
    }, 1600);
  });

  try {
    const content = await window.ProductContentReady;
    stories = content.stories;
    storyGrid.dataset.storyCount = String(content.stories.length);
    storyGrid.replaceChildren(...content.stories.map(renderStory));
    applyStoryHash();
  } catch (error) {
    storyGrid.replaceChildren();
    console.error(error);
  }
}());
