/* =====================================================================
   VIEW — everything that draws to the screen. No app logic lives here;
   the Controller tells the View what to show.
   ===================================================================== */

const View = {

  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,

  els: {
    screens:    {},   // filled in init()
    menuItems:  [],
    wipe:       document.getElementById("wipe"),
    videoGrid:  document.getElementById("video-grid"),
    sfx:        document.getElementById("sfx-select"),
    cursor:     document.getElementById("cursor"),
    clock:      document.getElementById("clock"),
  },

  init() {
    document.querySelectorAll(".screen").forEach(s => {
      this.els.screens[s.id.replace("screen-", "")] = s;
    });
    this.els.menuItems = [...document.querySelectorAll(".menu-item")];
    document.querySelectorAll("[data-ransom]").forEach(el => this.ransomize(el));
    this.els.sfx.volume = 0.45;
    this.startClock();
    this.startParallax();
    this.startCursor();
    document.body.classList.add("loaded");
  },

  // Deterministic pseudo-random hash (so letters look the same every visit)
  hash(str) {
    let h = 9;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 387420489);
    return (h ^ h >>> 9) >>> 0;
  },

  /* ---------- Ransom-note lettering ---------- */
  ransomize(el) {
    const text = el.dataset.ransom || el.textContent;
    el.textContent = "";
    [...text].forEach((c, i) => {
      const span = document.createElement("span");
      span.className = "ch display";
      span.textContent = c;
      const h = this.hash(text + i);
      const rot = (h % 17) - 8;                 // -8..8 degrees
      const scale = 0.86 + ((h >> 3) % 30) / 100; // 0.86..1.15
      const dy = ((h >> 5) % 9) - 4;            // -4..4 px
      const t = `rotate(${rot}deg) scale(${scale}) translateY(${dy}px)`;
      span.style.setProperty("--t", t);
      span.style.transform = t;
    const variant = (h >> 7) % 10;

// Force one letter of the name to have a black box
if (text === "PUNPUN" && i === 2) {
  span.classList.add("box");
}
else if (variant === 0) {
  span.classList.add("box");
}
else if (variant === 1) {
  span.classList.add("boxw");
}
else if (variant === 2) {
  span.classList.add("red");
}

el.appendChild(span);
    });
  },

  /* ---------- Screens & menu ---------- */
  showScreen(name) {
    const s = this.els.screens;
    Object.values(s).forEach(sc => sc.classList.remove("active"));
    s[name].classList.add("active");
    s[name].scrollTop = 0;
    document.body.dataset.screen = name;
  },

  setMenuSelection(index) {
    this.els.menuItems.forEach((m, j) => m.classList.toggle("sel", j === index));
  },

  // Diagonal wipe; calls swap() mid-way while the screen is covered
  wipe(swap, done) {
    if (this.reducedMotion) { swap(); done(); return; }
    const w = this.els.wipe;
    w.classList.remove("go"); void w.offsetWidth;  // restart animation
    w.classList.add("go");
    setTimeout(swap, 340);
    setTimeout(done, 720);
  },

  /* ---------- Sound ---------- */
  playSelect() {
    try {
      this.els.sfx.currentTime = 0;
      const p = this.els.sfx.play();
      if (p && p.catch) p.catch(() => {});  // blocked before first user gesture — fine
    } catch {}
  },

  /* ---------- Video cards ---------- */
  // First word of the title renders in the accent colour
  setTitle(h3, title) {
    const first = title.split(" ")[0];
    h3.textContent = "";
    const em = document.createElement("em");
    em.textContent = first;
    h3.append(em, title.slice(first.length));
  },

  renderVideos(list) {
    if (this.els.videoGrid.childElementCount) return;
    list.forEach((v, i) => {
      const card = document.createElement("div");
      card.className = "card feat vcard";
      card.style.setProperty("--tilt", ((this.hash(v.id) % 5) - 2) * 0.8 + "deg");
      card.style.setProperty("--d", i * 90 + "ms");
      card.innerHTML = `
        <div class="frame"><button class="play" type="button" aria-label="Play video ${i + 1}">
          <img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy"></button></div>
        <span class="lang" style="--lc:#ff3b3b">YouTube</span>
        <h3></h3>
        <div class="meta"><span>#${i + 1}</span>
          <a class="go" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">Open on YouTube</a></div>`;
      // Light page: the heavy YouTube player only loads when you tap play
      card.querySelector(".play").addEventListener("click", e => {
        document.dispatchEvent(new Event("video-play")); // pause the background song
        const f = document.createElement("iframe");
        f.src = `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&playsinline=1`;
        f.title = "YouTube video " + (i + 1);
        f.setAttribute("allow", "autoplay; accelerometer; encrypted-media; picture-in-picture");
        f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        f.allowFullscreen = true;
        e.currentTarget.parentElement.replaceChildren(f);
      });
      const h3 = card.querySelector("h3");
      this.setTitle(h3, "Video " + (i + 1));
      Model.fetchTitle(v.id).then(t => { if (t) this.setTitle(h3, t); });
      this.els.videoGrid.appendChild(card);
    });
  },

  /* ---------- Ambient: clock, parallax, animated cursor ---------- */
  startClock() {
    if (matchMedia("(pointer:coarse)").matches) return;
    setInterval(() => {
      this.els.clock.textContent =
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ;
    }, 1000);
  },

  startParallax() {
    if (this.reducedMotion || matchMedia("(pointer:coarse)").matches) return;
    const stripes = document.getElementById("bg-stripes");
    const halftone = document.getElementById("bg-halftone");
    const arts = [...document.querySelectorAll(".menu-art")];
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener("mousemove", e => {
      tx = e.clientX / innerWidth - 0.5;
      ty = e.clientY / innerHeight - 0.5;
    }, { passive: true });
    const loop = () => {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      stripes.style.transform = `translate(${cx * 22}px, ${cy * 14}px)`;
      halftone.style.transform = `translate(${cx * -34}px, ${cy * -22}px)`;
      arts.forEach(a => {
        if (a.isConnected)
          a.style.transform = `translate(${cx * 14}px, ${cy * 9}px) scale(1.04)`;
      });
      requestAnimationFrame(loop);
    };
    loop();
  },

  // 30-frame sprite-strip cursor extracted from the original .ani files
  startCursor() {
    if (!matchMedia("(pointer:fine)").matches || this.reducedMotion) return;
    const cur = this.els.cursor;
    document.body.classList.add("cursor-on");
    let x = -100, y = -100, frame = 0, last = 0, visible = false;

    addEventListener("mousemove", e => {
      x = e.clientX; y = e.clientY;
      if (!visible) { cur.style.display = "block"; visible = true; }
      const t = e.target;
      const overLink = t.closest &&
        t.closest("a,button,.card,.menu-item,.back-hint,.contact-chip,#big-name");
      cur.classList.toggle("link", !!overLink);
    }, { passive: true });

    document.addEventListener("mouseover", e => {
      if (e.target.tagName === "IFRAME") { cur.style.display = "none"; visible = false; }
    });

    document.documentElement.addEventListener("mouseleave", () => {
      cur.style.display = "none"; visible = false;
    });

    const tick = ts => {
      if (ts - last >= 50) {                       // 50ms = original .ani frame rate
        frame = (frame + 1) % 30; last = ts;
        cur.style.backgroundPosition = -frame * 48 + "px 0";
      }
      cur.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
};
