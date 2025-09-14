/*
 vd-card.js
 Minimal reusable video card initializer with HLS support.
 Usage: include hls.js (cdn) before this script or let this script load it.
*/

(function(window, document){
  const DEFAULTS = {
    hlsCdn: "https://cdn.jsdelivr.net/npm/hls.js@latest",
    autoInit: true, // auto run on DOMContentLoaded
    lazyLoad: false // if true, only attach source when user clicks play
  };

  function loadScript(src, cb){
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => cb && cb(null);
    s.onerror = () => cb && cb(new Error("Failed load " + src));
    document.head.appendChild(s);
  }

  function attachHls(videoEl, src){
    try {
      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        hls.loadSource(src);
        hls.attachMedia(videoEl);
      } else if (videoEl.canPlayType && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        // native HLS (Safari)
        videoEl.src = src;
      } else {
        console.warn("No HLS support in this browser.");
      }
    } catch (err){
      console.error("vd-card attach error:", err);
    }
  }

  function createPosterOverlay(posterUrl, onClick){
    const overlay = document.createElement('div');
    overlay.className = 'vd-poster';
    if (posterUrl) overlay.style.backgroundImage = `url("${posterUrl}")`;
    const btn = document.createElement('div');
    btn.className = 'vd-playbtn';
    overlay.appendChild(btn);
    overlay.addEventListener('click', onClick);
    return overlay;
  }

  function initOne(card, opts){
    const src = card.getAttribute('data-src');
    if(!src) return;
    const title = card.getAttribute('data-title') || card.querySelector('.vd-title')?.textContent || "";
    const desc = card.getAttribute('data-desc') || card.querySelector('.vd-desc')?.textContent || "";
    const poster = card.getAttribute('data-poster') || "";
    const wrapper = document.createElement('div');
    wrapper.className = 'vd-wrapper';

    const video = document.createElement('video');
    video.setAttribute('controls','');
    video.setAttribute('playsinline','');
    video.setAttribute('preload','metadata');

    wrapper.appendChild(video);
    // create poster overlay (click to load & play)
    const overlay = createPosterOverlay(poster, function(){
      // when clicked: attach source and play
      if (!video.src && !video.childElementCount) {
        attachHls(video, src);
      } else if (!video.src && video.src !== src) {
        video.src = src;
      }
      // hide overlay then play
      overlay.remove();
      try { video.play(); } catch(e){}
    });

    wrapper.appendChild(overlay);

    // clear existing content and inject structured DOM
    card.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'vd-head';
    if (title) head.innerHTML = `<div class="vd-title">${title}</div>`;
    if (desc) head.innerHTML += `<div class="vd-desc">${desc}</div>`;
    card.appendChild(head);
    card.appendChild(wrapper);
  }

  function initAll(options){
    const opts = Object.assign({}, DEFAULTS, options || {});
    const cards = document.querySelectorAll('.vd-card[data-src]');
    if (cards.length === 0) return;

    // ensure hls.js is available if needed
    const needHls = true; // we will attach later on click, but prefer hls available
    const proceed = function(){
      cards.forEach(function(card){
        initOne(card, opts);
      });
    };

    if (typeof window.Hls === 'undefined') {
      loadScript(opts.hlsCdn, function(err){
        if (err) console.warn("Could not load hls.js from CDN.");
        proceed();
      });
    } else {
      proceed();
    }
  }

  // expose global API
  window.VdCard = {
    init: initAll,
    version: "1.0.0"
  };

  if (DEFAULTS.autoInit) {
    document.addEventListener('DOMContentLoaded', function(){
      initAll();
    });
  }

})(window, document);
