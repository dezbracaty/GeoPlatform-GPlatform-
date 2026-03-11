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
