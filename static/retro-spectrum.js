/**
 * RetroSpectrumVisualizer — Égaliseur spectral rétro à barres segmentées (LED / VFD)
 * Style Windows Media Player / Winamp / Windows 98
 *
 * Fonctionnalités :
 * - Barres verticales découpées en blocs LED discrets (espacement noir de 1 à 2 px)
 * - Grille de fond (blocs éteints VFD/LCD)
 * - Crêtes flottantes (Peak Meters) avec maintien temporaire (hold) puis chute gravitationnelle
 * - Échantillonnage logarithmique des fréquences via Web Audio API (AnalyserNode fftSize 512, smoothing 0.8)
 * - Redimensionnement dynamique (ResizeObserver + window.onresize + devicePixelRatio sans flou)
 * - Gestion propre de la mémoire (destroy() / déconnexion des observateurs et boucles RAF)
 */
(function (global) {
  'use strict';

  // Cache global par élément <audio>/<video> pour éviter l'erreur DOMException
  // si createMediaElementSource est appelé plusieurs fois sur le même élément HTMLMediaElement.
  const mediaSourceMap = new WeakMap();

  class RetroSpectrumVisualizer {
    /**
     * @param {HTMLCanvasElement} canvas - Élément Canvas cible
     * @param {HTMLMediaElement} mediaElement - Élément <audio> ou <video>
     * @param {Object} [options]
     * @param {'green'|'wmp'} [options.colorMode='green'] - 'green' (monochrome vert lumineux Win98) ou 'wmp' (vert -> jaune -> rouge/orange)
     * @param {number} [options.fftSize=512] - Taille FFT (256 ou 512)
     * @param {number} [options.smoothingTimeConstant=0.8] - Lissage temporel (0.0 à 1.0)
     * @param {number} [options.targetBarWidth=8] - Largeur idéale d'une colonne en pixels CSS
     * @param {number} [options.barGap=2] - Espacement horizontal entre deux colonnes (px CSS)
     * @param {number} [options.blockHeight=3] - Hauteur d'un bloc LED (px CSS)
     * @param {number} [options.blockGap=1] - Espacement vertical noir entre deux blocs LED (1 à 2 px CSS)
     * @param {number} [options.peakHoldFrames=16] - Nombre de frames où la crête reste figée au sommet
     * @param {number} [options.peakGravity=0.0045] - Accélération gravitationnelle de la chute des crêtes
     */
    constructor(canvas, mediaElement, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
      this.media = mediaElement;

      this.options = Object.assign({
        colorMode: 'green',
        fftSize: 512,
        smoothingTimeConstant: 0.8,
        targetBarWidth: 8,
        barGap: 2,
        blockHeight: 3,
        blockGap: 1,
        peakHoldFrames: 16,
        peakGravity: 0.0045
      }, options);

      // Web Audio API
      this.audioCtx = null;
      this.analyser = null;
      this.freqData = null;

      // Géométrie calculée dynamiquement au resize
      this.dpr = 1;
      this.logicalWidth = 0;
      this.logicalHeight = 0;
      this.numCols = 0;
      this.numRows = 0;
      this.barWidth = 6;
      this.offsetX = 0;
      this.offsetY = 0;

      // États dynamiques par colonne
      this.barLevels = new Float32Array(0);     // Niveau normalisé [0..1]
      this.peakLevels = new Float32Array(0);    // Position de la crête [0..numRows]
      this.peakVelocities = new Float32Array(0);// Vitesse de chute gravitationnelle
      this.peakHoldTimers = new Int32Array(0);  // Compteur de maintien au sommet
      this.logBinRanges = [];                   // Plages d'indices FFT logarithmiques [startBin, endBin]

      // Contrôle de la boucle d'animation
      this.rafId = null;
      this.isDestroyed = false;
      this._boundLoop = this._loop.bind(this);
      this._boundResize = this.resize.bind(this);
      this._boundOnPlay = this._onPlay.bind(this);
      this._boundOnPause = this._onPause.bind(this);
      this._boundOnEnded = this._onEnded.bind(this);

      this._initObservers();
      this._initMediaEvents();
      this.resize();
      this.renderFrame(false);
    }

    /**
     * Initialise le ResizeObserver sur le conteneur parent et le fallback window.onresize
     */
    _initObservers() {
      if (!this.canvas) return;
      const target = this.canvas.parentElement || this.canvas;
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          if (!this.isDestroyed) this.resize();
        });
        this.resizeObserver.observe(target);
      }
      window.addEventListener('resize', this._boundResize);
    }

    /**
     * Attache les écouteurs sur l'élément audio/vidéo
     */
    _initMediaEvents() {
      if (!this.media) return;
      this.media.addEventListener('play', this._boundOnPlay);
      this.media.addEventListener('playing', this._boundOnPlay);
      this.media.addEventListener('pause', this._boundOnPause);
      this.media.addEventListener('ended', this._boundOnEnded);
    }

    /**
     * Connecte l'élément média au graphe Web Audio API (AnalyserNode)
     */
    _ensureAudioGraph() {
      if (!this.media || this.analyser) return;
      try {
        let shared = mediaSourceMap.get(this.media);
        if (!shared) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          const audioCtx = new AudioCtx();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = this.options.fftSize;
          analyser.smoothingTimeConstant = this.options.smoothingTimeConstant;
          analyser.minDecibels = -88;
          analyser.maxDecibels = -12;

          const sourceNode = audioCtx.createMediaElementSource(this.media);
          sourceNode.connect(analyser);
          analyser.connect(audioCtx.destination);

          shared = { audioCtx, analyser, sourceNode };
          mediaSourceMap.set(this.media, shared);
        }

        this.audioCtx = shared.audioCtx;
        this.analyser = shared.analyser;
        this.analyser.fftSize = this.options.fftSize;
        this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this._computeLogarithmicBins();
      } catch (err) {
        console.warn('[RetroSpectrumVisualizer] Web Audio API fallback activé :', err);
      }
    }

    /**
     * Pré-calcule l'échantillonnage logarithmique des fréquences pour les N colonnes.
     * Privilégie la résolution dans les basses/médiums et regroupe les hautes fréquences
     * pour éviter les barres plates à droite du spectre.
     */
    _computeLogarithmicBins() {
      this.logBinRanges = [];
      const totalBins = this.analyser ? this.analyser.frequencyBinCount : (this.options.fftSize / 2);
      // On exploite ~78% de la bande Nyquist (jusqu'à ~16-17 kHz) où réside l'énergie musicale
      const usableBins = Math.max(8, Math.floor(totalBins * 0.78));
      const cols = Math.max(1, this.numCols);

      // Progression exponentielle : bin(i) = minBin * (usableBins / minBin) ^ (i / cols)
      const minBin = 1;
      const logRatio = Math.log(usableBins / minBin);

      let prevEnd = 0;
      for (let i = 0; i < cols; i++) {
        const t0 = i / cols;
        const t1 = (i + 1) / cols;

        let startBin = Math.floor(minBin * Math.exp(logRatio * Math.pow(t0, 1.15)));
        let endBin = Math.floor(minBin * Math.exp(logRatio * Math.pow(t1, 1.15)));

        // Garantir qu'aucune colonne ne saute ou ne répète un bin vide dans les graves
        if (startBin <= prevEnd && i > 0) {
          startBin = prevEnd;
        }
        if (endBin <= startBin) {
          endBin = startBin + 1;
        }
        startBin = Math.min(usableBins - 1, Math.max(0, startBin));
        endBin = Math.min(usableBins, Math.max(startBin + 1, endBin));
        prevEnd = endBin;

        this.logBinRanges.push([startBin, endBin]);
      }
    }

    /**
     * Recalcule dynamiquement les dimensions du Canvas (avec devicePixelRatio),
     * le nombre de colonnes (N), la largeur des barres et le nombre de blocs verticaux.
     */
    resize() {
      if (!this.canvas || !this.ctx) return;

      const container = this.canvas.parentElement || this.canvas;
      const rect = container.getBoundingClientRect();
      const cssW = Math.max(60, Math.floor(rect.width || container.clientWidth || 260));
      const cssH = Math.max(28, Math.floor(rect.height || container.clientHeight || 52));
      const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));

      if (this.canvas.width !== cssW * dpr || this.canvas.height !== cssH * dpr) {
        this.canvas.width = cssW * dpr;
        this.canvas.height = cssH * dpr;
      }

      this.dpr = dpr;
      this.logicalWidth = cssW;
      this.logicalHeight = cssH;

      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = false;

      const padX = 2;
      const padY = 2;
      const availW = Math.max(16, cssW - padX * 2);
      const availH = Math.max(12, cssH - padY * 2);

      const gapX = this.options.barGap;
      const idealBarW = this.options.targetBarWidth;

      // Calcul dynamique du nombre de colonnes N
      let newCols = Math.max(8, Math.floor((availW + gapX) / (idealBarW + gapX)));
      let barW = Math.max(3, Math.floor((availW - (newCols - 1) * gapX) / newCols));

      // Ajuster N pour remplir tout l'espace horizontal disponible
      const remainingW = availW - (newCols * barW + (newCols - 1) * gapX);
      if (remainingW >= barW + gapX) {
        newCols += Math.floor(remainingW / (barW + gapX));
      }

      const totalUsedW = newCols * barW + (newCols - 1) * gapX;
      this.offsetX = Math.floor((cssW - totalUsedW) / 2);

      // Calcul dynamique du nombre de blocs LED verticaux proportionnel à canvas.height
      const blockStep = this.options.blockHeight + this.options.blockGap;
      const newRows = Math.max(5, Math.floor((availH + this.options.blockGap) / blockStep));
      const totalUsedH = newRows * blockStep - this.options.blockGap;
      this.offsetY = Math.floor((cssH - totalUsedH) / 2);

      this.barWidth = barW;
      this.numRows = newRows;

      if (newCols !== this.numCols) {
        const oldLevels = this.barLevels;
        const oldPeaks = this.peakLevels;
        this.numCols = newCols;
        this.barLevels = new Float32Array(newCols);
        this.peakLevels = new Float32Array(newCols);
        this.peakVelocities = new Float32Array(newCols);
        this.peakHoldTimers = new Int32Array(newCols);

        // Conserver une transition fluide lors du redimensionnement
        const copyLen = Math.min(oldLevels.length, newCols);
        for (let i = 0; i < copyLen; i++) {
          this.barLevels[i] = oldLevels[i];
          this.peakLevels[i] = Math.min(newRows, oldPeaks[i]);
        }

        this._computeLogarithmicBins();
      }

      if (!this.rafId) {
        this.renderFrame(this.media && !this.media.paused && !this.media.ended);
      }
    }

    /**
     * Retourne la couleur d'un bloc LED selon sa hauteur relative (rowRatio in [0..1])
     */
    _getBlockColor(rowRatio) {
      if (this.options.colorMode === 'wmp') {
        // Dégradé classique WMP / Winamp : Vert vif en bas -> Jaune au centre -> Orange/Rouge en haut
        if (rowRatio >= 0.82) return '#ff2a00';
        if (rowRatio >= 0.68) return '#ff8800';
        if (rowRatio >= 0.48) return '#ffee00';
        if (rowRatio >= 0.25) return '#7cff00';
        return '#00e800';
      }
      // Mode 'green' (Windows 98) : couleur verte identique sur toute la barre (aucun dégradé)
      return this.options.barColor || '#00ff2b';
    }

    /**
     * Dessine une frame complète de l'égaliseur spectral
     * @param {boolean} isPlaying - Indique si le média est en cours de lecture
     */
    renderFrame(isPlaying) {
      if (!this.ctx || !this.canvas || this.isDestroyed) return;

      const ctx = this.ctx;
      const w = this.logicalWidth;
      const h = this.logicalHeight;
      const cols = this.numCols;
      const rows = this.numRows;
      const barW = this.barWidth;
      const gapX = this.options.barGap;
      const blockH = this.options.blockHeight;
      const blockGap = this.options.blockGap;
      const stepY = blockH + blockGap;

      // 1. Fond noir profond d'écran LCD / VFD
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // 2. Acquisition des fréquences Web Audio API
      let hasRealSignal = false;
      if (isPlaying && this.analyser && this.freqData) {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        this.analyser.getByteFrequencyData(this.freqData);
        for (let k = 0; k < this.freqData.length; k++) {
          if (this.freqData[k] > 0) {
            hasRealSignal = true;
            break;
          }
        }
      }

      const bottomY = h - this.offsetY;
      let anyResidualMotion = false;

      // 3. Parcourir chaque colonne (barre spectrale)
      for (let c = 0; c < cols; c++) {
        const x = this.offsetX + c * (barW + gapX);

        // a) Grille de fond : blocs LED éteints (trame LCD/VFD sombre)
        ctx.fillStyle = '#001c04';
        for (let r = 0; r < rows; r++) {
          const y = bottomY - (r + 1) * stepY + blockGap;
          ctx.fillRect(x, y, barW, blockH);
        }

        // b) Calcul de l'amplitude normalisée [0..1] sur échelle logarithmique
        let targetNorm = 0;
        if (isPlaying) {
          if (hasRealSignal && this.logBinRanges[c]) {
            const [startBin, endBin] = this.logBinRanges[c];
            let sum = 0;
            let maxVal = 0;
            const count = Math.max(1, endBin - startBin);
            for (let b = startBin; b < endBin; b++) {
              const v = this.freqData[b] || 0;
              sum += v;
              if (v > maxVal) maxVal = v;
            }
            const avg = sum / count;
            // Mix entre valeur crête du groupe et moyenne + légère compensation des aigus (tilt spectral)
            const tiltBoost = 1.0 + (c / cols) * 0.35;
            targetNorm = Math.min(1.0, (((maxVal * 0.65 + avg * 0.35) / 255) * tiltBoost));
          } else {
            // Repli synthétique réaliste si le flux est restreint par CORS
            const t = performance.now() * 0.0065;
            const freqFactor = 1 - (c / cols) * 0.45;
            const wave =
              Math.abs(Math.sin(t * 1.3 + c * 0.38) * Math.cos(t * 0.85 - c * 0.22)) * 0.78 +
              Math.abs(Math.sin(t * 2.7 - c * 0.6)) * 0.22;
            targetNorm = Math.min(1.0, Math.max(0.06, wave * freqFactor));
          }
        }

        // c) Lissage attaque rapide / descente fluide de la barre
        const currentLevel = this.barLevels[c];
        if (targetNorm >= currentLevel) {
          this.barLevels[c] = currentLevel + (targetNorm - currentLevel) * 0.62;
        } else {
          this.barLevels[c] = Math.max(0, currentLevel - 0.055);
        }

        const activeBlocks = Math.min(rows, Math.round(this.barLevels[c] * rows));

        // d) Dessin des blocs LED actifs de la colonne (avec espace noir de blockGap px)
        for (let r = 0; r < activeBlocks; r++) {
          const y = bottomY - (r + 1) * stepY + blockGap;
          const rowRatio = rows > 1 ? r / (rows - 1) : 0;
          ctx.fillStyle = this._getBlockColor(rowRatio);
          ctx.fillRect(x, y, barW, blockH);
        }

        // e) Physique des crêtes flottantes (Peak Meters avec maintien + gravité)
        const currentBlockHeight = activeBlocks;
        if (currentBlockHeight >= this.peakLevels[c]) {
          this.peakLevels[c] = currentBlockHeight;
          this.peakVelocities[c] = 0;
          this.peakHoldTimers[c] = this.options.peakHoldFrames;
        } else {
          if (this.peakHoldTimers[c] > 0) {
            this.peakHoldTimers[c]--;
          } else {
            this.peakVelocities[c] += this.options.peakGravity * rows;
            this.peakLevels[c] = Math.max(0, this.peakLevels[c] - this.peakVelocities[c]);
          }
        }

        // Dessin du bloc de crête flottant au-dessus de la barre
        if (this.peakLevels[c] > 0.35) {
          const peakRowIdx = Math.min(rows - 1, Math.max(0, Math.floor(this.peakLevels[c]) - 1));
          const peakY = bottomY - (peakRowIdx + 1) * stepY + blockGap;
          ctx.fillStyle = this.options.colorMode === 'wmp' ? '#ffffff' : '#b8ffb8';
          ctx.fillRect(x, peakY, barW, blockH);
        }

        if (this.barLevels[c] > 0.005 || this.peakLevels[c] > 0.35) {
          anyResidualMotion = true;
        }
      }

      return anyResidualMotion;
    }

    /**
     * Boucle requestAnimationFrame
     */
    _loop() {
      if (this.isDestroyed) return;
      const isPlaying = !!(this.media && !this.media.paused && !this.media.ended);
      const stillMoving = this.renderFrame(isPlaying);

      if (isPlaying || stillMoving) {
        this.rafId = requestAnimationFrame(this._boundLoop);
      } else {
        this.rafId = null;
      }
    }

    _onPlay() {
      if (this.isDestroyed) return;
      this._ensureAudioGraph();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      if (!this.rafId) {
        this.rafId = requestAnimationFrame(this._boundLoop);
      }
    }

    _onPause() {
      if (this.isDestroyed) return;
      // Laisse la boucle RAF faire redescendre les barres et les crêtes avec gravité jusqu'à 0
      if (!this.rafId) {
        this.rafId = requestAnimationFrame(this._boundLoop);
      }
    }

    _onEnded() {
      if (this.isDestroyed) return;
      if (!this.rafId) {
        this.rafId = requestAnimationFrame(this._boundLoop);
      }
    }

    /**
     * Remet immédiatement toutes les barres et crêtes à zéro (ex: clic sur le bouton Stop ■)
     */
    reset() {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.barLevels.fill(0);
      this.peakLevels.fill(0);
      this.peakVelocities.fill(0);
      this.peakHoldTimers.fill(0);
      this.renderFrame(false);
    }

    /**
     * Libère proprement les écouteurs, le ResizeObserver et la boucle d'animation
     */
    destroy() {
      this.isDestroyed = true;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      window.removeEventListener('resize', this._boundResize);
      if (this.media) {
        this.media.removeEventListener('play', this._boundOnPlay);
        this.media.removeEventListener('playing', this._boundOnPlay);
        this.media.removeEventListener('pause', this._boundOnPause);
        this.media.removeEventListener('ended', this._boundOnEnded);
      }
    }
  }

  global.RetroSpectrumVisualizer = RetroSpectrumVisualizer;
})(window);
