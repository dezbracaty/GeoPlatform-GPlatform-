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

// Video playback policy:
// 1) User manual play has priority and should not be force-paused immediately.
// 2) Auto-play only for in-view videos.
// 3) Keep exactly one video playing at a time.
(() => {
  const videos = Array.from(document.querySelectorAll("video"));
  if (!videos.length) {
    return;
  }

  const autoState = new WeakMap();
  const AUTO_MIN_RATIO = 0.2;
  const OUT_OF_VIEW_RATIO = 0.05;
  const MANUAL_PLAY_WINDOW_MS = 1500;
  const USER_PAUSE_COOLDOWN_MS = 4000;

  let activeVideo = null;
  const internalPlay = new WeakSet();
  const internalPause = new WeakSet();

  const safePlay = (video, reason = "auto") => {
    const state = autoState.get(video);
    if (!state) return;
    state.lastPlayReason = reason;
    internalPlay.add(video);
    const p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        internalPlay.delete(video);
      });
    }
    setTimeout(() => internalPlay.delete(video), 0);
  };

  const pauseVideo = (video, reason = "auto") => {
    if (!video || video.paused) return;
    const state = autoState.get(video);
    if (!state) return;
    state.lastPauseReason = reason;
    internalPause.add(video);
    video.pause();
    setTimeout(() => internalPause.delete(video), 0);
  };

  const pickAutoCandidate = (nowTs) => {
    let candidate = null;
    let bestRatio = 0;
    videos.forEach((video) => {
      const state = autoState.get(video);
      if (!state) return;
      if (state.blockAutoUntil > nowTs) return;
      if (state.ratio >= AUTO_MIN_RATIO && state.ratio > bestRatio) {
        bestRatio = state.ratio;
        candidate = video;
      }
    });
    return candidate;
  };

  const switchToVideo = (video, reason = "auto") => {
    if (!video) return;
    videos.forEach((other) => {
      if (other !== video) {
        pauseVideo(other, "auto");
      }
    });
    activeVideo = video;
    safePlay(video, reason);
  };

  const syncPlayback = () => {
    const nowTs = Date.now();

    if (document.hidden) {
      videos.forEach((video) => pauseVideo(video, "auto"));
      activeVideo = null;
      return;
    }

    if (activeVideo) {
      const activeState = autoState.get(activeVideo);
      if (!activeState) {
        activeVideo = null;
      } else if (activeState.ratio < OUT_OF_VIEW_RATIO) {
        pauseVideo(activeVideo, "auto");
        activeState.manual = false;
        activeVideo = null;
      }
    }

    if (activeVideo) {
      // Keep manual-selected video until it leaves viewport.
      videos.forEach((other) => {
        if (other !== activeVideo) {
          pauseVideo(other, "auto");
        }
      });
      if (activeVideo.paused) {
        safePlay(activeVideo, "auto");
      }
      return;
    }

    const candidate = pickAutoCandidate(nowTs);
    if (!candidate) {
      videos.forEach((video) => pauseVideo(video, "auto"));
      return;
    }

    switchToVideo(candidate, "auto");
  };

  videos.forEach((video) => {
    // Browser autoplay compatibility + smoother buffering.
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    if (!video.hasAttribute("muted")) {
      video.muted = true;
    }
    autoState.set(video, {
      ratio: 0,
      manual: false,
      userIntentAt: 0,
      blockAutoUntil: 0,
      lastPlayReason: "auto",
      lastPauseReason: "auto"
    });

    const markUserIntent = () => {
      const state = autoState.get(video);
      if (!state) return;
      state.userIntentAt = Date.now();
    };

    video.addEventListener("pointerdown", markUserIntent);
    video.addEventListener("touchstart", markUserIntent, { passive: true });
    video.addEventListener("click", markUserIntent);

    video.addEventListener("play", () => {
      if (internalPlay.has(video)) {
        return;
      }
      const state = autoState.get(video);
      if (!state) return;
      const nowTs = Date.now();
      const manualLike = nowTs - state.userIntentAt <= MANUAL_PLAY_WINDOW_MS;
      if (manualLike) {
        state.manual = true;
      }
      switchToVideo(video, manualLike ? "manual" : "auto");
    });

    video.addEventListener("pause", () => {
      const state = autoState.get(video);
      if (!state) return;
      if (internalPause.has(video)) {
        return;
      }
      // User pause: avoid immediate auto-resume loop.
      state.manual = false;
      state.blockAutoUntil = Date.now() + USER_PAUSE_COOLDOWN_MS;
      if (activeVideo === video) {
        activeVideo = null;
      }
      syncPlayback();
    });
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
