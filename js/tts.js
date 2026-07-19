/* ===== Text-to-Speech Module ===== */

const TTSManager = (() => {
  let synth = null;
  let currentUtterance = null;
  let isSupported = false;

  function init() {
    if ('speechSynthesis' in window) {
      synth = window.speechSynthesis;
      isSupported = true;
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
  }

  function speak(text, lang = 'en-US', rate = 0.9) {
    if (!isSupported || !text) return;

    // Cancel any ongoing speech
    stop();

    // ALL-CAPS input ("AT", "HEN", "ICE CREAM") gets spelled out
    // letter-by-letter by most speech engines — lowercase it so it's read
    // as words. Mixed-case text (real sentences) passes through untouched.
    if (lang.startsWith('en') && /^[A-Z][A-Z .'-]*$/.test(text.trim())) {
      text = text.trim().toLowerCase();
    }

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = lang;
    currentUtterance.rate = rate;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    synth.speak(currentUtterance);
  }

  function stop() {
    if (synth && synth.speaking) {
      synth.cancel();
    }
  }

  function isSpeaking() {
    return synth && synth.speaking;
  }

  /**
   * Create a TTS button element
   * @param {string} text - The text to speak
   * @param {string} lang - Language code (default: 'en-US')
   * @param {string} label - Button label (default: '🔊')
   * @returns {HTMLButtonElement}
   */
  function createButton(text, lang = 'en-US', label = '🔊') {
    const btn = document.createElement('button');
    btn.className = 'tts-btn';
    btn.innerHTML = label;
    btn.title = '點擊聆聽發音';
    btn.setAttribute('aria-label', 'Listen to pronunciation');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isSpeaking()) {
        stop();
        btn.classList.remove('speaking');
      } else {
        speak(text, lang);
        btn.classList.add('speaking');

        // Remove speaking class when done
        setTimeout(() => {
          btn.classList.remove('speaking');
        }, text.length * 50 + 1000); // Rough estimate
      }
    });

    return btn;
  }

  /**
   * Create an inline TTS icon that can be inserted into text
   * @param {string} text - The text to speak
   * @param {string} lang - Language code (default: 'en-US')
   * @returns {HTMLSpanElement}
   */
  function createInlineIcon(text, lang = 'en-US') {
    const span = document.createElement('span');
    span.className = 'tts-inline';
    span.innerHTML = '🔊';
    span.title = '點擊聆聽';
    span.style.cursor = 'pointer';
    span.style.marginLeft = '8px';
    span.style.fontSize = '0.85em';

    span.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      speak(text, lang);
    });

    return span;
  }

  return {
    init,
    speak,
    stop,
    isSpeaking,
    createButton,
    createInlineIcon,
    isSupported: () => isSupported
  };
})();

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TTSManager.init());
} else {
  TTSManager.init();
}
