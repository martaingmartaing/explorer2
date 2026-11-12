/*
 * Animation de copie « à l'ancienne » : une feuille sort du dossier source ouvert,
 * décrit un arc en se retournant (vrille 3D, coin qui se corne) puis plonge dans
 * le dossier de destination. Rendu 100 % canvas, base 300 x 70 px logiques.
 *
 * Usage : const anim = FlyingDocAnimation.create(canvas); anim.start(); anim.stop();
 */
(function () {
  const W = 300, H = 70;
  const CYCLE_MS = 1500;      // durée d'un vol complet
  const FRAMES = 32;          // images par vol (rendu saccadé façon AVI d'époque)

  const K = '#000000';
  const BG = '#c0c0c0';
  const PAPER = '#ffffff';
  const PAPER_BACK = '#e4e4e4';
  const FOLD = '#bdbdbd';
  const TEXT = '#808080';
  const F_BACK = '#c8a000';
  const F_BACK_HI = '#e0b800';
  const F_FRONT = '#ffe65c';
  const F_FRONT_HI = '#fff6b0';

  // Dossiers ouverts (coin haut-gauche, taille ~46 x 34)
  const SRC = { x: 18, y: 26 };
  const DST = { x: 236, y: 26 };
  const FW = 44, FH = 34;

  // Feuille volante (dimensions locales)
  const PW = 28, PH = 19;   // feuille au format paysage
  const PERSP = 90;

  function create(canvas) {
    if (!canvas) return { start() {}, stop() {} };
    let raf = null;
    let t0 = 0;
    let lastFrame = -1;
    let ctx = null;

    function setup() {
      const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
    }

    function poly(pts, fill, stroke = K, lw = 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    }

    // --- Dossier ouvert : partie arrière (dos + onglet + feuilles rangées) ---
    function folderBack(f, papers) {
      const x = f.x, y = f.y;
      poly([
        [x, y + 6], [x + 3, y + 2], [x + 14, y + 2], [x + 17, y + 6],
        [x + FW - 4, y + 6], [x + FW - 4, y + FH], [x, y + FH]
      ], F_BACK);
      ctx.fillStyle = F_BACK_HI;
      ctx.fillRect(x + 1.5, y + 7, FW - 7, 1.5);
      if (papers) {
        // Feuilles qui dépassent du dossier
        poly([[x + 6, y + 3], [x + 30, y + 1], [x + 31, y + 18], [x + 7, y + 20]], PAPER);
        poly([[x + 9, y + 5], [x + 34, y + 4], [x + 34, y + 20], [x + 9, y + 21]], PAPER);
        ctx.fillStyle = TEXT;
        for (let i = 0; i < 3; i++) ctx.fillRect(x + 13, y + 8 + i * 3, 16 - i * 3, 1);
      }
    }

    // --- Dossier ouvert : rabat avant incliné ---
    function folderFront(f) {
      const x = f.x, y = f.y;
      poly([[x, y + FH], [x + FW - 4, y + FH], [x + FW + 2, y + 14], [x + 6, y + 14]], F_FRONT);
      ctx.strokeStyle = F_FRONT_HI;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 7.5, y + 15.5);
      ctx.lineTo(x + FW, y + 15.5);
      ctx.stroke();
    }

    // Projection 3D d'un point local de la feuille -> [écranX, écranY, z, x3D, y3D]
    function projector(cx, cy, rx, ry, rz) {
      const cX = Math.cos(rx), sX = Math.sin(rx);
      const cY = Math.cos(ry), sY = Math.sin(ry);
      const cZ = Math.cos(rz), sZ = Math.sin(rz);
      return function (px, py, pz = 0) {
        // rotation X : la feuille fait un salto (retournement en l'air)
        const y1 = py * cX - pz * sX;
        const z1 = py * sX + pz * cX;
        // rotation Y : léger roulis
        const x2 = px * cY + z1 * sY;
        const z2 = -px * sY + z1 * cY;
        // rotation Z : vrille dans le plan de l'écran
        const x3 = x2 * cZ - y1 * sZ;
        const y3 = x2 * sZ + y1 * cZ;
        const k = PERSP / (PERSP + z2);
        return [cx + x3 * k, cy + y3 * k, z2, x3, y3];
      };
    }

    function shade(base, light) {
      const v = Math.round(base * (0.72 + 0.28 * light));
      return `rgb(${v},${v},${v})`;
    }

    // --- Feuille souple qui vole : surface légèrement bombée par l'air ---
    function drawSheet(cx, cy, rx, ry, rz, bend, curl) {
      const P = projector(cx, cy, rx, ry, rz);
      const hw = PW / 2, hh = PH / 2;
      // La feuille se bombe sur sa largeur et ondule un peu sur sa hauteur
      const S = (u, v) => P(u, v, bend * ((u / hw) * (u / hw) - 0.35) + bend * 0.35 * (v / hh) * (u / hw));

      // Normale au centre -> face visible + éclairage
      const a = S(-hw * 0.5, 0), b = S(hw * 0.5, 0), c = S(0, -hh * 0.5), d = S(0, hh * 0.5);
      const ux = b[3] - a[3], uy = b[4] - a[4], uz = b[2] - a[2];
      const vx = d[3] - c[3], vy = d[4] - c[4], vz = d[2] - c[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      const facing = nz / nl;             // > 0 : recto vers le spectateur
      const front = facing >= 0;
      const light = Math.abs(facing);

      // Contour échantillonné (bords courbes) avec coin supérieur droit corné
      const N = 6, cc = curl;
      const outline = [];
      for (let i = 0; i <= N; i++) outline.push(S(-hw + (2 * hw - cc) * i / N, -hh));        // haut
      for (let i = 0; i <= N; i++) outline.push(S(hw, -hh + cc + (2 * hh - cc) * i / N));     // droite
      for (let i = 1; i <= N; i++) outline.push(S(hw - 2 * hw * i / N, hh));                  // bas
      for (let i = 1; i < N; i++) outline.push(S(-hw, hh - 2 * hh * i / N));                  // gauche

      // Ombre portée
      ctx.save();
      ctx.globalAlpha = 0.16;
      poly(outline.map(p => [p[0] + 3, p[1] + 4]), K, null);
      ctx.restore();

      poly(outline, front ? shade(255, light) : shade(214, light));

      if (front && light > 0.25) {
        // Lignes de texte (uniquement au recto)
        ctx.strokeStyle = TEXT;
        ctx.lineWidth = 0.9;
        const lines = [[-hw + 4, -hh + 6, hw - 9], [-hw + 4, -hh + 10, hw - 5], [-hw + 4, -hh + 14, hw - 12]];
        for (const [x0, yy, x1] of lines) {
          ctx.beginPath();
          for (let i = 0; i <= 4; i++) {
            const q = S(x0 + (x1 - x0) * i / 4, yy);
            if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
          }
          ctx.stroke();
        }
      }

      // Coin corné
      const t1 = S(hw - cc, -hh), t2 = S(hw, -hh + cc);
      const lift = Math.min(cc, 5);
      const f = P(hw - cc, -hh + cc, (front ? -1 : 1) * lift);
      poly([t1, t2, f], front ? shade(200, light) : shade(240, light));
    }

    const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    function drawFrame(phase) {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      folderBack(SRC, true);
      folderBack(DST, false);

      // Trajectoire : arc du dossier source au dossier destination
      const sx = SRC.x + FW / 2 - 2, sy = SRC.y + 16;
      const dx = DST.x + FW / 2 - 2, dy = DST.y + 16;
      const e = easeInOut(phase);
      const px = sx + (dx - sx) * (0.2 * phase + 0.8 * e);
      const py = sy + (dy - sy) * phase - Math.sin(Math.PI * phase) * 25;

      // Retournement complet en l'air : salto de 360° concentré au milieu du vol
      // Retournement autour de l'axe horizontal (le bord haut passe par-dessus),
      // un tour complet pour retomber recto visible dans le dossier destination.
      const flipT = Math.min(1, Math.max(0, (phase - 0.1) / 0.8));
      const rx = -2 * Math.PI * easeInOut(flipT);
      const ry = 0;
      // Légère inclinaison qui suit la pente de l'arc (axe de retournement quasi horizontal)
      const slope = Math.atan2((dy - sy) - 25 * Math.PI * Math.cos(Math.PI * phase), dx - sx);
      const rz = slope * 0.25;
      const air = Math.sin(Math.PI * phase);
      const bend = 1.5 * air;                 // très léger bombé dû à l'air
      const curl = 4;

      drawSheet(px, py, rx, ry, rz, bend, curl);

      // Rabats avant dessinés par-dessus : la feuille sort / rentre DANS les dossiers
      folderFront(SRC);
      folderFront(DST);
    }

    function loop(now) {
      const elapsed = now - t0;
      const frame = Math.floor((elapsed % CYCLE_MS) / (CYCLE_MS / FRAMES));
      if (frame !== lastFrame) {
        lastFrame = frame;
        drawFrame(frame / FRAMES);
      }
      raf = requestAnimationFrame(loop);
    }

    return {
      start() {
        this.stop();
        setup();
        t0 = performance.now();
        lastFrame = -1;
        drawFrame(0);
        raf = requestAnimationFrame(loop);
      },
      stop() {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
      },
      drawFrame(phase) { if (!ctx) setup(); drawFrame(phase); }
    };
  }

  window.FlyingDocAnimation = { create };
})();
