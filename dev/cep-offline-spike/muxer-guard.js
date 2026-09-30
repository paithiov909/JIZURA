// Preserve build_cep.py's CommonJS/global recovery in a source-controlled step.
if (!window.Mp4Muxer && typeof module !== 'undefined' && module && module.exports && module.exports.Muxer) {
  window.Mp4Muxer = module.exports;
}
