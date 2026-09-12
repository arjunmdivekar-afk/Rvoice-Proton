// Multi-Layer Fluid Aurora Audio Ribbon Canvas Renderer

export class AuroraRibbonRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private freqData: Uint8Array = new Uint8Array(64);
  private phase: number = 0;
  private colorTheme: string = 'cyan';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot get 2d context for Aurora ribbon');
    this.ctx = context;
  }

  public setTheme(theme: 'cyan' | 'violet' | 'emerald' | 'amber') {
    this.colorTheme = theme;
  }

  public updateFrequencies(frequencies: Uint8Array) {
    this.freqData = frequencies;
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public start() {
    if (this.animFrameId) return;
    const render = () => {
      this.draw();
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  public stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private draw() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    this.phase += 0.025;
    const numLayers = 3;

    // Base colors according to theme
    let strokeColors = [
      'rgba(0, 242, 254, 0.4)',
      'rgba(139, 92, 246, 0.3)',
      'rgba(56, 239, 125, 0.25)'
    ];

    if (this.colorTheme === 'violet') {
      strokeColors = [
        'rgba(139, 92, 246, 0.45)',
        'rgba(236, 72, 153, 0.35)',
        'rgba(192, 132, 252, 0.25)'
      ];
    } else if (this.colorTheme === 'emerald') {
      strokeColors = [
        'rgba(16, 185, 129, 0.45)',
        'rgba(0, 242, 254, 0.35)',
        'rgba(52, 211, 153, 0.25)'
      ];
    } else if (this.colorTheme === 'amber') {
      strokeColors = [
        'rgba(245, 158, 11, 0.45)',
        'rgba(249, 115, 22, 0.35)',
        'rgba(251, 191, 36, 0.25)'
      ];
    }

    for (let layer = 0; layer < numLayers; layer++) {
      this.ctx.beginPath();
      this.ctx.lineWidth = 2.5 - layer * 0.5;
      this.ctx.strokeStyle = strokeColors[layer];

      const baseline = height * 0.55 + layer * 6;
      const speed = this.phase * (1 + layer * 0.4);

      // Average low-mid frequencies
      let audioBoost = 0;
      if (this.freqData.length > 0) {
        const sampleIdx = (layer * 8) % this.freqData.length;
        audioBoost = (this.freqData[sampleIdx] / 255) * 35;
      }

      this.ctx.moveTo(0, baseline);

      for (let x = 0; x <= width; x += 10) {
        const normX = x / width;
        const wave1 = Math.sin(normX * 5 + speed) * (14 + audioBoost);
        const wave2 = Math.cos(normX * 8 - speed * 0.8) * (8 + audioBoost * 0.5);
        const y = baseline + wave1 + wave2;

        this.ctx.lineTo(x, y);
      }

      this.ctx.stroke();
    }
  }
}
