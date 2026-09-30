// CEP can expose mp4-muxer through CommonJS instead of the browser global.
if (!window.Mp4Muxer && typeof module !== 'undefined' && module && module.exports && module.exports.Muxer) {
  window.Mp4Muxer = module.exports;
}
