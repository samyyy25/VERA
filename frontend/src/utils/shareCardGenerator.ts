import { Complaint } from '../types';

export interface ShareDataResult {
  title: string;
  text: string;
  blob?: Blob;
  file?: File;
}

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

/** roundRect polyfill for contexts that don't support it natively */
function roundRectFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function roundRectStroke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.stroke();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let linesDrawn = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trimEnd(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
      linesDrawn++;
      if (linesDrawn >= maxLines - 1) {
        // Truncate remaining words into last line
        const remaining = words.slice(n + 1).join(' ');
        const lastLine = line + remaining;
        const truncated = truncateToFit(ctx, lastLine.trimEnd(), maxWidth, '…');
        ctx.fillText(truncated, x, currentY);
        return currentY + lineHeight;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trimEnd(), x, currentY);
  return currentY + lineHeight;
}

function truncateToFit(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  ellipsis: string
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + ellipsis).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + ellipsis;
}

/** Load an image URL (data: URI or remote URL) into an HTMLImageElement */
async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
    // Timeout after 8s
    setTimeout(() => resolve(null), 8000);
  });
}

/** Draw an image cropped to fill a rect (object-fit: cover) with rounded corners */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  radius: number
) {
  // Clip to rounded rect
  ctx.save();
  roundRectFill(ctx, dx, dy, dw, dh, radius);
  ctx.clip();

  // Compute object-fit: cover source rect
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const destAspect = dw / dh;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (imgAspect > destAspect) {
    sw = img.naturalHeight * destAspect;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / destAspect;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();
}

/** Draw the risk badge pill */
function drawRiskBadge(
  ctx: CanvasRenderingContext2D,
  riskScore: number,
  riskLevel: string,
  rightEdge: number,
  y: number
) {
  const colors: Record<string, { bg: string; text: string }> = {
    CRITICAL: { bg: '#7f1d1d', text: '#fca5a5' },
    HIGH:     { bg: '#7c2d12', text: '#fed7aa' },
    MEDIUM:   { bg: '#713f12', text: '#fde68a' },
    LOW:      { bg: '#064e3b', text: '#6ee7b7' },
  };
  const c = colors[riskLevel] || colors.LOW;
  const label = `RISK ${riskScore}/100 · ${riskLevel}`;
  ctx.font = 'bold 13px monospace';
  const tw = ctx.measureText(label).width;
  const bw = tw + 28;
  const bh = 28;
  const bx = rightEdge - bw - 32;
  const by = y;

  ctx.fillStyle = c.bg;
  roundRectFill(ctx, bx, by, bw, bh, 14);
  ctx.fillStyle = c.text;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + 14, by + bh / 2);
  ctx.textBaseline = 'alphabetic';
}

// ─────────────────────────────────────────────────────────────
//  Main composite card generator (Section 46)
// ─────────────────────────────────────────────────────────────

/**
 * Generates ONE composite share card (800×1000px) that embeds:
 * header → category+risk → photo (or video placeholder, or nothing) →
 * description → location → footer
 *
 * A recipient seeing this card alone understands: what happened, how
 * serious it is, where it happened, and what it actually looks like.
 */
export const generateCompositeShareCard = async (
  complaint: Complaint
): Promise<ShareDataResult> => {
  const CARD_W = 800;
  const PHOTO_SLOT_H = 400; // height of photo zone
  const isEmergency = complaint.risk_score >= 60;

  // Determine if we have media
  const hasPhoto = Boolean(complaint.photo_url);
  const hasVideo = Boolean(complaint.video_url) && !hasPhoto;
  const hasMedia = hasPhoto || hasVideo;

  // Load photo image first (so we know actual dimensions before sizing canvas)
  let photoImg: HTMLImageElement | null = null;
  if (hasPhoto && complaint.photo_url) {
    photoImg = await loadImage(complaint.photo_url);
  }

  // Canvas height: with media = 1000, without = 680
  const CARD_H = hasMedia ? 1000 : 680;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      title: `VERA Incident: ${complaint.category}`,
      text: formatShareText(complaint),
    };
  }

  const PAD = 32;

  // ── 1. Background gradient ───────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0, isEmergency ? '#150508' : '#070c18');
  grad.addColorStop(0.5, '#0c1427');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ── Outer border glow ────────────────────────────────────────
  ctx.strokeStyle = isEmergency ? 'rgba(239,68,68,0.6)' : 'rgba(13,148,136,0.5)';
  ctx.lineWidth = 3;
  roundRectStroke(ctx, 2, 2, CARD_W - 4, CARD_H - 4, 18);

  // ── 2. Header bar ─────────────────────────────────────────────
  const HEADER_H = 80;
  ctx.fillStyle = isEmergency ? 'rgba(239,68,68,0.12)' : 'rgba(13,148,136,0.12)';
  roundRectFill(ctx, 4, 4, CARD_W - 8, HEADER_H, 14);

  // Shield icon (drawn via canvas path)
  const iconX = PAD + 18;
  const iconY = HEADER_H / 2;
  ctx.save();
  ctx.fillStyle = isEmergency ? '#ef4444' : '#0d9488';
  ctx.translate(iconX, iconY);
  ctx.scale(1.2, 1.2);
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(12, -8);
  ctx.lineTo(12, 2);
  ctx.quadraticCurveTo(12, 14, 0, 18);
  ctx.quadraticCurveTo(-12, 14, -12, 2);
  ctx.lineTo(-12, -8);
  ctx.closePath();
  ctx.fill();
  // "V" letter inside shield
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('V', 0, 2);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Header title
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('VERA Emergency & Civic Response', iconX + 20, HEADER_H / 2 - 5);

  // Header subtitle: ref ID + timestamp
  ctx.font = '11px monospace';
  ctx.fillStyle = isEmergency ? '#fca5a5' : '#5eead4';
  ctx.fillText(
    `INCIDENT #${complaint.id.slice(0, 8).toUpperCase()} · ${new Date(complaint.created_at).toLocaleString()}`,
    iconX + 20,
    HEADER_H / 2 + 14
  );

  let curY = HEADER_H + 24;

  // ── 3. Category title ─────────────────────────────────────────
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(complaint.category, PAD, curY + 10);

  // Risk badge (right-aligned, same row)
  drawRiskBadge(ctx, complaint.risk_score, complaint.risk_level, CARD_W, curY - 8);

  curY += 42;

  // ── 4. Thin separator ─────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, curY);
  ctx.lineTo(CARD_W - PAD, curY);
  ctx.stroke();

  curY += 20;

  // ── 5. Photo / Video / Nothing ───────────────────────────────
  if (hasPhoto) {
    if (photoImg) {
      // Draw actual photo
      drawImageCover(ctx, photoImg, PAD, curY, CARD_W - PAD * 2, PHOTO_SLOT_H, 12);
    } else {
      // Photo URL present but failed to load
      ctx.fillStyle = 'rgba(30,41,59,0.8)';
      roundRectFill(ctx, PAD, curY, CARD_W - PAD * 2, PHOTO_SLOT_H, 12);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText('📷 Photo could not be loaded', CARD_W / 2, curY + PHOTO_SLOT_H / 2);
      ctx.textAlign = 'left';
    }
    curY += PHOTO_SLOT_H + 20;
  } else if (hasVideo) {
    // Video placeholder
    ctx.fillStyle = 'rgba(15,23,42,0.9)';
    roundRectFill(ctx, PAD, curY, CARD_W - PAD * 2, PHOTO_SLOT_H, 12);
    ctx.strokeStyle = 'rgba(239,68,68,0.3)';
    ctx.lineWidth = 1.5;
    roundRectStroke(ctx, PAD, curY, CARD_W - PAD * 2, PHOTO_SLOT_H, 12);

    // Play triangle
    const cx = CARD_W / 2;
    const cy = curY + PHOTO_SLOT_H / 2 - 24;
    ctx.fillStyle = 'rgba(239,68,68,0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 18);
    ctx.lineTo(cx - 14, cy + 18);
    ctx.lineTo(cx + 20, cy);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#fca5a5';
    ctx.textAlign = 'center';
    ctx.fillText('▶  Video Evidence Attached', CARD_W / 2, curY + PHOTO_SLOT_H / 2 + 36);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Open the incident report to view the video', CARD_W / 2, curY + PHOTO_SLOT_H / 2 + 56);
    ctx.textAlign = 'left';
    curY += PHOTO_SLOT_H + 20;
  }
  // If no media: no slot, card is shorter

  // ── 6. Description box ───────────────────────────────────────
  const DESC_BOX_H = 100;
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  roundRectFill(ctx, PAD, curY, CARD_W - PAD * 2, DESC_BOX_H, 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  roundRectStroke(ctx, PAD, curY, CARD_W - PAD * 2, DESC_BOX_H, 10);

  ctx.font = 'italic 15px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('"', PAD + 16, curY + 26);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#e2e8f0';
  wrapText(ctx, complaint.description, PAD + 28, curY + 26, CARD_W - PAD * 2 - 56, 22, 3);
  ctx.font = 'italic 15px sans-serif';
  ctx.fillStyle = '#94a3b8';

  curY += DESC_BOX_H + 20;

  // ── 7. Location block ─────────────────────────────────────────
  ctx.fillStyle = 'rgba(13,148,136,0.08)';
  roundRectFill(ctx, PAD, curY, CARD_W - PAD * 2, 56, 10);
  ctx.strokeStyle = 'rgba(13,148,136,0.2)';
  ctx.lineWidth = 1;
  roundRectStroke(ctx, PAD, curY, CARD_W - PAD * 2, 56, 10);

  // Pin icon
  ctx.fillStyle = '#0d9488';
  ctx.font = '18px sans-serif';
  ctx.fillText('📍', PAD + 12, curY + 34);

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#38bdf8';
  const locationText = complaint.address ||
    `${complaint.latitude.toFixed(5)}, ${complaint.longitude.toFixed(5)}`;
  ctx.fillText(
    truncateToFit(ctx, locationText, CARD_W - PAD * 2 - 70, '…'),
    PAD + 44, curY + 26
  );

  if (complaint.routed_department) {
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText(`🏢 Routed: ${complaint.routed_department}`, PAD + 44, curY + 43);
  }

  curY += 72;

  // ── 8. Footer ─────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, curY);
  ctx.lineTo(CARD_W - PAD, curY);
  ctx.stroke();
  curY += 18;

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Reported via VERA — Voice Emergency Response Assistant | Smart Public Issue Management',
    CARD_W / 2,
    curY + 12
  );
  ctx.textAlign = 'left';

  const text = formatShareText(complaint);
  const title = `VERA Incident: ${complaint.category}`;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File(
          [blob],
          `vera-incident-${complaint.id.slice(0, 8)}.png`,
          { type: 'image/png' }
        );
        resolve({ title, text, blob, file });
      } else {
        resolve({ title, text });
      }
    }, 'image/png');
  });
};

// ─────────────────────────────────────────────────────────────
//  Share text formatter
// ─────────────────────────────────────────────────────────────

export function formatShareText(complaint: Complaint): string {
  const isEmergency = complaint.risk_score >= 60;
  return `${isEmergency ? '🚨 EMERGENCY REPORT' : '📢 CIVIC REPORT'} via VERA
Category: ${complaint.category} (Risk: ${complaint.risk_score}/100 · ${complaint.risk_level})
Location: ${complaint.address || `${complaint.latitude.toFixed(5)}, ${complaint.longitude.toFixed(5)}`}
Description: "${complaint.description}"
${complaint.routed_department ? `Routed To: ${complaint.routed_department}` : ''}`.trim();
}

// ─────────────────────────────────────────────────────────────
//  Share orchestrator (Section 46 — single composite file)
// ─────────────────────────────────────────────────────────────

/**
 * Generates ONE composite card image and shares it via Web Share API.
 * Fallback: download the composite image + copy text to clipboard.
 *
 * The composite card is self-explanatory: it embeds the incident photo,
 * category, risk score, description, and location all in one image.
 * No separate raw photo is sent.
 */
export const shareIncident = async (
  complaint: Complaint
): Promise<{ shared: boolean; method: 'web_share' | 'download_fallback' }> => {
  const cardData = await generateCompositeShareCard(complaint);

  // 1. Try Web Share with the single composite file
  if (
    navigator.share &&
    cardData.file &&
    navigator.canShare &&
    navigator.canShare({ files: [cardData.file] })
  ) {
    try {
      await navigator.share({
        title: cardData.title,
        text: cardData.text,
        files: [cardData.file],
      });
      return { shared: true, method: 'web_share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'web_share' };
      }
      // Non-abort error: fall through to text-only share
    }
  }

  // 2. Text-only Web Share fallback (desktop browsers that support share but not file share)
  if (navigator.share) {
    try {
      await navigator.share({
        title: cardData.title,
        text: cardData.text,
      });
      return { shared: true, method: 'web_share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'web_share' };
      }
    }
  }

  // 3. Desktop fallback: download composite image + copy text
  if (cardData.blob) {
    const url = URL.createObjectURL(cardData.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vera-incident-${complaint.id.slice(0, 8)}-card.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  try {
    await navigator.clipboard.writeText(cardData.text);
  } catch {
    // Clipboard write may fail in some browser contexts; non-fatal
  }

  return { shared: true, method: 'download_fallback' };
};
