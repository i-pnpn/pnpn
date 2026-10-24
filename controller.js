/* =====================================================================
   CONTROLLER — listens to the user, updates the Model, tells the View.
   ===================================================================== */

const Controller = {

  transitioning: false,
  audioUnlocked: false,

  init() {
  View.init();
  this.bindMenu();
  this.bindKeyboard();
  this.bindAudioUnlock();
  this.bindMusic();
},

  /* ---------- Navigation ---------- */
goTo(screen) { 
  if (this.transitioning || screen === Model.state.screen) return; 
  this.transitioning = true; 
  this.play(); 

  View.wipe( 
      () => {                       // mid-wipe: swap screens while covered
        Model.state.screen = screen;
        View.showScreen(screen);
        if (screen === "projects") this.loadVideos();
      },
      () => { this.transitioning = false; }
    );
  },

  select(index) {
    const n = View.els.menuItems.length;
    const next = (index + n) % n;
    if (next !== Model.state.menuIndex) this.play();
    Model.state.menuIndex = next;
    View.setMenuSelection(next);
  },

  /* ---------- Screen data loading ---------- */
  loadVideos() {
    View.renderVideos(Model.videos);
    Model.state.videosLoaded = true;
  },

  /* ---------- Sound (browsers block audio until first user gesture) ---------- */
  play() {
    if (this.audioUnlocked) View.playSelect();
  },

  /* ---------- Background song ---------- */
  bindMusic() {
    const bgm = document.getElementById("bgm");
    const btn = document.getElementById("music-toggle");
    if (!bgm || !btn) return;
    bgm.volume = 0.5;
    let userPaused = false;
    const paint = () => {
      const on = !bgm.paused;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", on);
      btn.firstElementChild.textContent = on ? "♪ Music on" : "♪ Music off";
    };
    const play = () => { bgm.play().then(paint).catch(paint); };

    // Browsers only allow sound after a tap/key press, so start on the first one
    const first = e => {
      if (e.target.closest && e.target.closest("#music-toggle")) return;
      if (!userPaused) play();
    };
    addEventListener("pointerdown", first, { once: true, capture: true });
    addEventListener("keydown", first, { once: true, capture: true });

    btn.addEventListener("click", () => {
      if (bgm.paused) { userPaused = false; play(); }
      else { userPaused = true; bgm.pause(); paint(); }
    });
    // Starting a video pauses the song so the two never overlap
    document.addEventListener("video-play", () => { if (!bgm.paused) { bgm.pause(); paint(); } });
    bgm.addEventListener("play", paint);
    bgm.addEventListener("pause", paint);
  },

  bindAudioUnlock() {
    const unlock = () => { this.audioUnlocked = true; };
    addEventListener("pointerdown", unlock, { once: true, capture: true });
    addEventListener("keydown", unlock, { once: true, capture: true });
  },

  /* ---------- Input bindings ---------- */
  bindMenu() {
    View.els.menuItems.forEach((item, i) => {
      item.addEventListener("mouseenter", () => this.select(i));
      item.addEventListener("click", () => this.goTo(item.dataset.target));
    });

    document.querySelectorAll("[data-back]").forEach(b =>
      b.addEventListener("click", () => this.goTo("home")));

    // Clicking the name always takes you home
    document.getElementById("big-name").addEventListener("click", () => {
      if (Model.state.screen !== "home") this.goTo("home");
      else this.play();
    });
  },

  bindKeyboard() {
    addEventListener("keydown", e => {
      if (Model.state.screen === "home") {
        if (e.key === "ArrowDown") { this.select(Model.state.menuIndex + 1); e.preventDefault(); }
        else if (e.key === "ArrowUp") { this.select(Model.state.menuIndex - 1); e.preventDefault(); }
        else if (e.key === "Enter") {
          this.goTo(View.els.menuItems[Model.state.menuIndex].dataset.target);
        }
      } else if (e.key === "Escape") {
        this.goTo("home");
      }
    });
  },
};

Controller.init();
