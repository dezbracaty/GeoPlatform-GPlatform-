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

// Auto-play videos when they enter viewport (scroll/drag), pause when leaving.
(() => {
  const videos = Array.from(document.querySelectorAll("video"));
  if (!videos.length) {
    return;
  }

  const autoState = new WeakMap();

  const safePlay = (video) => {
    const p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
  };

  videos.forEach((video) => {
    // Ensure browser autoplay policy compatibility.
    video.setAttribute("playsinline", "");
    if (!video.hasAttribute("muted")) {
      video.muted = true;
    }
    autoState.set(video, { inView: false, hover: false });

    video.addEventListener("mouseenter", () => {
      const state = autoState.get(video);
      if (!state) return;
      state.hover = true;
      safePlay(video);
    });

    video.addEventListener("mouseleave", () => {
      const state = autoState.get(video);
      if (!state) return;
      state.hover = false;
      if (!state.inView) {
        video.pause();
      }
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        const state = autoState.get(video);
        if (!state) return;

        state.inView = entry.isIntersecting && entry.intersectionRatio >= 0.45;
        if (state.inView) {
          safePlay(video);
        } else if (!state.hover) {
          video.pause();
        }
      });
    },
    {
      threshold: [0, 0.2, 0.45, 0.7, 1]
    }
  );

  videos.forEach((video) => observer.observe(video));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      videos.forEach((video) => video.pause());
      return;
    }
    videos.forEach((video) => {
      const state = autoState.get(video);
      if (state && (state.inView || state.hover)) {
        safePlay(video);
      }
    });
  });
})();
