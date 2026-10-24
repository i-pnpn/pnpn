/* =====================================================================
   MODEL — the data and state of the app. Never touches the DOM.
   Add a video: put its YouTube ID (the part after v=) in the list below.
   ===================================================================== */

const Model = {

  state: {
    screen: "home",     // which screen is showing
    menuIndex: 0,       // selected item on the home menu
    videosLoaded: false,
  },

  // ---- Videos (YouTube IDs) ----
  videos: [
    { id: "NuHKimxRPU4" },
    { id: "SYUgqcXrF5s" },
    { id: "1uK7q8jlbo4" },
  ],

  // Fetch the real video title from YouTube; null if it can't be reached
  async fetchTitle(id) {
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
      );
      if (!res.ok) throw new Error(res.status);
      return (await res.json()).title;
    } catch {
      return null;
    }
  },
};
