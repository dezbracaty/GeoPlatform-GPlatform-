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

// Auto-play video when it enters viewport, pause when leaving.
// Keep exactly one video playing at a time (highest visible ratio).
(() => {
  const videos = Array.from(document.querySelectorAll("video"));
  if (!videos.length) {
    return;
  }

  const autoState = new WeakMap();
  const MIN_ACTIVE_RATIO = 0.5;

  const safePlay = (video) => {
    const p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
  };

  const syncPlayback = () => {
    if (document.hidden) {
      videos.forEach((video) => video.pause());
      return;
    }

    let activeVideo = null;
    let bestRatio = 0;

    videos.forEach((video) => {
      const state = autoState.get(video);
      if (!state) return;
      if (state.ratio >= MIN_ACTIVE_RATIO && state.ratio > bestRatio) {
        bestRatio = state.ratio;
        activeVideo = video;
      }
    });

    videos.forEach((video) => {
      if (video === activeVideo) {
        safePlay(video);
      } else {
        video.pause();
      }
    });
  };

  videos.forEach((video) => {
    // Ensure browser autoplay policy compatibility.
    video.setAttribute("playsinline", "");
    if (!video.hasAttribute("muted")) {
      video.muted = true;
    }
    autoState.set(video, { ratio: 0 });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        const state = autoState.get(video);
        if (!state) return;
        state.ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
      });
      syncPlayback();
    },
    {
      threshold: [0, 0.2, 0.35, 0.5, 0.7, 0.9, 1]
    }
  );

  videos.forEach((video) => observer.observe(video));

  document.addEventListener("visibilitychange", () => {
    syncPlayback();
  });
})();
