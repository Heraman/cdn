/*
 vd-card.js
 Reusable video card initializer with HLS (.m3u8) + direct file support (mp4, webm, etc).
 Usage: include this script (defer ok). hls.js will be loaded automatically only when needed.
*/

(function(window, document){
  const DEFAULTS = {
    hlsCdn: "https://cdn.jsdelivr.net/npm/hls.js@latest",
    autoInit: true,
    lazyLoad: false // default behavior; can be overridden with options or data-lazy="1" on element
  };

  function loadScript(src, cb){
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => cb && cb(null);
    s.onerror = () => cb && cb(new Error("Failed load " + src));
    document.head.appendChild(s);
  }

  function isHlsSource(src){
    if (!src) return false;
    return /\.m3u8(\?|#|$)/i.test(src) || src.indexOf('application/vnd.apple.mpegurl') !== -1;
  }

  function attachHls(videoEl, src, startLevel){
    try {
      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        if (typeof startLevel !== 'undefined' && startLevel !== null && !Number.isNaN(startLevel)) {
          hls.startLevel = parseInt(startLevel, 10);
          hls.autoLevelEnabled = false;
        }
        hls.loadSource(src);
        hls.attachMedia(videoEl);
      } else if (videoEl.canPlayType && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        // native HLS (Safari)
        videoEl.src = src;
      } else {
        console.warn("No HLS support in this browser.");
      }
    } catch (err){
      console.error("vd-card attachHls error:", err);
    }
  }

  function attachDirectFile(videoEl, src){
    // create <source> for best compatibility (mp4, webm, etc)
    // but set videoEl.src as fallback for some browsers
    const type = detectMimeTypeFromUrl(src);
    // remove existing sources
    while (videoEl.firstChild) videoEl.removeChild(videoEl.firstChild);
    const source = document.createElement('source');
    source.src = src;
    if (type) source.type = type;
    videoEl.appendChild(source);
    // also set video.src for non-source-using players
    try { videoEl.src = src; } catch(e) {}
  }

  function detectMimeTypeFromUrl(url){
    if (!url) return '';
    const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
    switch(ext){
      case 'mp4': return 'video/mp4';
      case 'webm': return 'video/webm';
      case 'ogg': return 'video/ogg';
      case 'mov': return 'video/quicktime';
      default: return '';
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
    if (!src) return;
    const title = card.getAttribute('data-title') || card.querySelector('.vd-title')?.textContent || "";
    const desc = card.getAttribute('data-desc') || card.querySelector('.vd-desc')?.textContent || "";
    const poster = card.getAttribute('data-poster') || "";
    const lazyAttr = card.getAttribute('data-lazy');
    const lazy = (lazyAttr === '1' || lazyAttr === 'true') || !!opts.lazyLoad;
    const startLevelAttr = card.getAttribute('data-startlevel');
    const startLevel = (startLevelAttr != null && startLevelAttr !== '') ? parseInt(startLevelAttr, 10) : null;

    const wrapper = document.createElement('div');
    wrapper.className = 'vd-wrapper';

    const video = document.createElement('video');
    video.setAttribute('controls','');
    video.setAttribute('playsinline','');
    // don't preload full data if lazy is enabled
    video.preload = lazy ? 'none' : 'metadata';

    wrapper.appendChild(video);

    // click handler: attach correct source type and play
    const onPlayClick = function(){
      // attach HLS or direct file depending on src
      if (isHlsSource(src)) {
        // attach HLS (ensure hls.js is loaded)
        if (typeof window.Hls === 'undefined') {
          loadScript(opts.hlsCdn, function(err){
            if (err) {
              console.warn("Could not load hls.js from CDN, trying native fallback.");
              // try native fallback
              if (video.canPlayType && video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = src;
              }
            } else {
              attachHls(video, src, startLevel);
            }
            // remove overlay and play anyway (if possible)
            overlay.remove();
            try { video.play(); } catch(e){}
          });
        } else {
          attachHls(video, src, startLevel);
          overlay.remove();
          try { video.play(); } catch(e){}
        }
      } else {
        // direct file (mp4/webm/ogg)
        attachDirectFile(video, src);
        overlay.remove();
        try { video.play(); } catch(e){}
      }
    };

    // create poster overlay (click to load & play)
    const overlay = createPosterOverlay(poster, onPlayClick);

    wrapper.appendChild(overlay);

    // If not lazy, attach immediately (but only attach source; keep poster overlay if present)
    if (!lazy) {
      if (isHlsSource(src)) {
        // load hls.js if needed and attach
        if (typeof window.Hls === 'undefined') {
          loadScript(opts.hlsCdn, function(err){
            if (err) {
              // fallback to native if possible
              if (video.canPlayType && video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = src;
              }
            } else {
              attachHls(video, src, startLevel);
            }
          });
        } else {
          attachHls(video, src, startLevel);
        }
      } else {
        attachDirectFile(video, src);
      }
      // if poster present, keep overlay to require user click for play (but not for loading)
      // if no poster, don't attach overlay (so user can use native controls)
      if (!poster) {
        overlay.remove();
      }
    }

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

    cards.forEach(function(card){
      initOne(card, opts);
    });
  }

  // expose global API
  window.VdCard = {
    init: initAll,
    version: "1.1.0"
  };

  if (DEFAULTS.autoInit) {
    document.addEventListener('DOMContentLoaded', function(){
      initAll();
    });
  }

})(window, document);
