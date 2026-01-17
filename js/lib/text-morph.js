/**
 * Text morphing animation utility
 * Animates text changes with a glitch effect using random glyphs
 */

const GLYPHS = "░▒▓█▀▄▌▐╔╗╚╝║═╠╣╦╩╬├┤┬┴┼│─■□◊◦•○●";

export const TextMorph = {
  morph(element, targetText, duration = 400) {
    if (element._morphing && element._targetText === targetText) return;

    element._morphing = true;
    element._targetText = targetText;

    const startText = element.textContent;
    const maxLength = Math.max(startText.length, targetText.length);
    const startTimestamp = performance.now();
    const characterDelays = Array.from(
      { length: maxLength },
      () => Math.random() * 0.5,
    );

    const animate = (timestamp) => {
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      let result = "";
      for (let i = 0; i < maxLength; i++) {
        const charDelay = characterDelays[i];
        const charProgress = (easedProgress - charDelay * 0.3) / 0.7;
        const targetChar = targetText[i] || "";
        const startChar = startText[i] || " ";

        if (charProgress >= 1) {
          result += targetChar;
        } else if (charProgress > 0) {
          result += this._getMorphChar(charProgress, startChar, targetChar);
        } else {
          result += startChar;
        }
      }

      element.textContent = result;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = targetText;
        element._morphing = false;
      }
    };

    requestAnimationFrame(animate);
  },

  _getMorphChar(charProgress, startChar, targetChar) {
    const phase = charProgress * 4;

    if (phase < 1) {
      return Math.random() < 0.3
        ? GLYPHS[~~(Math.random() * GLYPHS.length)]
        : startChar;
    } else if (phase < 2) {
      return GLYPHS[~~(Math.random() * GLYPHS.length)];
    } else if (phase < 3) {
      return Math.random() < 0.5
        ? targetChar
        : GLYPHS[~~(Math.random() * GLYPHS.length)];
    } else {
      return Math.random() < 0.15
        ? GLYPHS[~~(Math.random() * GLYPHS.length)]
        : targetChar;
    }
  },
};
