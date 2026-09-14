(function applyProductCopy() {
  const config = window.ProductConfig;
  if (!config?.identity || !config?.copy) {
    throw new Error("Product configuration is missing or invalid.");
  }

  const { identity, copy, support, newsletter } = config;
  document.title = copy.documentTitle;
  document.querySelector('meta[name="description"]')?.setAttribute("content", copy.metaDescription);

  const textTargets = {
    brandMark: identity.mark,
    brandName: identity.name,
    brandTagline: copy.brandTagline,
    eyebrow: copy.eyebrow,
    briefingDescription: copy.briefingDescription,
    storyCountLabel: copy.storyCountLabel,
    updateCadenceLabel: copy.updateCadenceLabel,
    storyShareButtonLabel: copy.storyShare.buttonLabel,
    storyShareDialogTitle: copy.storyShare.dialogTitle,
    storyShareDialogDescription: copy.storyShare.dialogDescription,
    storyShareUrlLabel: copy.storyShare.urlInputLabel,
    storyShareCopyLabel: copy.storyShare.copyLinkLabel,
    footer: copy.footer,
    loginLabel: copy.loginLabel,
    loginMenuTitle: copy.loginMenuTitle,
    loginMenuDescription: copy.loginMenuDescription,
    guestStreakLabel: copy.guestStreakLabel,
    continueWithGoogleLabel: copy.continueWithGoogleLabel,
    aboutLabel: copy.about.label,
    aboutEyebrow: copy.about.eyebrow,
    aboutDescription: copy.about.description,
        aboutPromise: copy.about.promise,
        supportLabel: support?.copy?.label ?? "",
                supportTitle: support?.copy?.title ?? "",
                        supportDescription: support?.copy?.description ?? "",
                        newsletterTabLabel: newsletter?.copy?.tabLabel ?? "",
                        newsletterTitle: newsletter?.copy?.title ?? "",
                        newsletterDescription: newsletter?.copy?.description ?? "",
                        newsletterEmailLabel: newsletter?.copy?.emailLabel ?? "",
                        newsletterSubscribeLabel: newsletter?.copy?.subscribeLabel ?? "",
                        newsletterPreviewNote: ""
                      };

  for (const [id, text] of Object.entries(textTargets)) {
    document.querySelectorAll(`[data-product-copy="${id}"]`).forEach((target) => {
      target.textContent = text;
    });
  }

  const brand = document.querySelector("[data-product-home]");
  if (brand) brand.setAttribute("aria-label", copy.homeLabel);

  const storyGrid = document.querySelector("#storyGrid");
  if (storyGrid) storyGrid.setAttribute("aria-label", copy.storyGridLabel);

  const headline = document.querySelector("[data-product-headline]");
  if (headline) {
    headline.replaceChildren(document.createTextNode(copy.headline.lead), Object.assign(document.createElement("em"), { textContent: copy.headline.emphasis }));
  }

  const aboutTitle = document.querySelector("[data-product-about-headline]");
  if (aboutTitle) {
    aboutTitle.replaceChildren(Object.assign(document.createElement("em"), { textContent: copy.about.title.emphasis }), document.createTextNode(copy.about.title.lead));
  }
}());
