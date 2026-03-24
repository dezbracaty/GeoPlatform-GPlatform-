document.getElementById("year").textContent = new Date().getFullYear();

// Simple segmented playback: chain local parts to keep each file under deployment size limits.
document.querySelectorAll("video[data-playlist]").forEach((video) => {
  const list = (video.dataset.playlist || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (list.length <= 1) {
    return;
  }

  let index = 0;

  const currentSrc = video.getAttribute("src") || video.querySelector("source")?.getAttribute("src") || "";
  if (currentSrc) {
    const found = list.indexOf(currentSrc);
    if (found >= 0) {
      index = found;
    }
  }

  video.addEventListener("ended", () => {
    if (index + 1 >= list.length) {
      return;
    }

    index += 1;
    video.src = list[index];
    video.load();
    video.play().catch(() => {});
  });
});

// Mobile floating navigation: FAB toggle + outside click close.
document.querySelectorAll(".mobile-nav").forEach((mobileNav) => {
  const fab = mobileNav.querySelector(".mobile-nav-fab");
  const menu = mobileNav.querySelector(".mobile-nav-menu");
  const links = mobileNav.querySelectorAll(".mobile-nav-link");
  if (!fab || !menu) {
    return;
  }

  const setOpen = (open) => {
    mobileNav.classList.toggle("open", open);
    fab.setAttribute("aria-expanded", open ? "true" : "false");
  };

  fab.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(!mobileNav.classList.contains("open"));
  });

  links.forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("click", (event) => {
    if (!mobileNav.contains(event.target)) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });
});
