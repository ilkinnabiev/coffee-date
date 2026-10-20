const area = document.querySelector(".play-area");
const yes = document.querySelector(".answer-yes");
const no = document.querySelector(".answer-no");
const reaction = document.querySelector(".reaction");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const replies = [
  "Ой, кажется, кнопка стесняется.",
  "Она просто немного волнуется.",
  "Ладно, у неё лапки.",
  "Это всё котик придумал.",
];

let attempts = 0;
let lastEscape = -Infinity;

function escape(pointer) {
  const now = performance.now();
  if (now - lastEscape < 160) return;

  const viewport = window.visualViewport;
  const visibleTop = viewport?.offsetTop ?? 0;
  const visibleBottom = visibleTop + (viewport?.height ?? window.innerHeight);
  let bounds = area.getBoundingClientRect();
  // A short or partly scrolled screen must show the whole landing area.
  if (bounds.top < visibleTop + 8 || bounds.bottom > visibleBottom - 8) {
    area.scrollIntoView({ block: "center", behavior: "instant" });
    bounds = area.getBoundingClientRect();
  }
  const yesBounds = yes.getBoundingClientRect();
  const noBounds = no.getBoundingClientRect();
  const width = no.offsetWidth;
  const height = no.offsetHeight;
  const maxX = bounds.width - width - 8;
  const minY = Math.max(8, visibleTop + 8 - bounds.top);
  const maxY = Math.min(bounds.height - height - 8, visibleBottom - bounds.top - height - 8);
  const current = {
    x: noBounds.left - bounds.left,
    y: noBounds.top - bounds.top,
  };
  const from = pointer ?? {
    x: current.x + width / 2,
    y: current.y + height / 2,
  };
  const yesBox = {
    left: yesBounds.left - bounds.left - 14,
    top: yesBounds.top - bounds.top - 14,
    right: yesBounds.right - bounds.left + 14,
    bottom: yesBounds.bottom - bounds.top + 14,
  };

  const positions = [];
  for (const x of [8, (8 + maxX) / 2, maxX]) {
    for (const y of [minY, (minY + maxY) / 2, maxY]) {
      const overlapsYes = x < yesBox.right && x + width > yesBox.left
        && y < yesBox.bottom && y + height > yesBox.top;
      const underPointer = from.x > x - 18 && from.x < x + width + 18
        && from.y > y - 18 && from.y < y + height + 18;
      if (overlapsYes || underPointer) continue;

      positions.push({
        x,
        y,
        distance: Math.hypot(x + width / 2 - from.x, y + height / 2 - from.y),
      });
    }
  }

  positions.sort((a, b) => b.distance - a.distance);
  const next = positions[0];
  if (!next) return;

  lastEscape = now;
  no.style.left = `${next.x}px`;
  no.style.top = `${next.y}px`;
  no.style.right = "auto";
  reaction.textContent = replies[attempts % replies.length];
  attempts += 1;

  // Change position instantly so the button never travels across “Да”.
  if (!reducedMotion.matches) {
    no.getAnimations().forEach((animation) => animation.cancel());
    no.animate(
      [{ transform: "scale(0.93)" }, { transform: "scale(1)" }],
      { duration: 180, easing: "ease-out" },
    );
  }
}

function pointerPosition(event) {
  const bounds = area.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

no.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary) return;
  event.preventDefault();
  escape(pointerPosition(event));
});

no.addEventListener("pointerenter", (event) => {
  if (event.pointerType === "mouse") escape(pointerPosition(event));
});

area.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse") return;
  const bounds = no.getBoundingClientRect();
  if (event.clientX >= bounds.left - 14 && event.clientX <= bounds.right + 14
    && event.clientY >= bounds.top - 14 && event.clientY <= bounds.bottom + 14) {
    escape(pointerPosition(event));
  }
});

no.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  if (!event.repeat) escape();
});

no.addEventListener("click", (event) => {
  event.preventDefault();
  // Physical presses already escaped on pointerdown; retain assistive clicks.
  if (event.detail === 0) escape();
});

// Reset after viewport changes so a previous position cannot fall outside the area.
window.addEventListener("resize", () => {
  no.style.left = "";
  no.style.top = "";
  no.style.right = "";
});
