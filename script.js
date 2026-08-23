const subscribeButton = document.querySelector("#subscribeButton");
const subscribeDialog = document.querySelector("#subscribeDialog");
const dialogClose = document.querySelector("#dialogClose");
const subscribeForm = document.querySelector("#subscribeForm");
const formMessage = document.querySelector("#formMessage");
const colorModeToggle = document.querySelector("#colorModeToggle");

function updateColorModeToggle() {
  const isDark = document.documentElement.dataset.colorMode === "dark";
  colorModeToggle.setAttribute("aria-pressed", String(isDark));
  colorModeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
}

colorModeToggle.addEventListener("click", () => {
  const nextMode = document.documentElement.dataset.colorMode === "dark" ? "light" : "dark";
  document.documentElement.dataset.colorMode = nextMode;
  localStorage.setItem("ai-nuggets-color-mode", nextMode);
  updateColorModeToggle();
});

updateColorModeToggle();

subscribeButton.addEventListener("click", () => {
  subscribeDialog.showModal();
});

dialogClose.addEventListener("click", () => {
  subscribeDialog.close();
});

subscribeDialog.addEventListener("click", (event) => {
  if (event.target === subscribeDialog) {
    subscribeDialog.close();
  }
});

subscribeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(subscribeForm);
  const email = data.get("email");
  formMessage.textContent = `Thanks - ${email} is on the early-access list.`;
  subscribeForm.reset();
});
