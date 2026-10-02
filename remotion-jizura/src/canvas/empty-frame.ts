export function drawEmptyFrame(
  canvas: HTMLCanvasElement,
  background: string | null,
  active: boolean,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('A 2D canvas context is required.');
  ctx.resetTransform();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (active && background !== null) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  } finally {
    ctx.restore();
  }
}
