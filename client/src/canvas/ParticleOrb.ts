// 60 FPS 3D Morphing Particle Orb Canvas Engine with Magnetic Cursor Physics

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'meeting';

interface Particle {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
  color: string;
  alpha: number;
  vx: number;
  vy: number;
  vz: number;
}

export class ParticleOrbRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private numParticles: number = 380;
  private radius: number = 130;
  private angleX: number = 0;
  private angleY: number = 0;
  private animFrameId: number | null = null;
  private state: OrbState = 'idle';
  private audioLevel: number = 0; // 0 to 1
  private mousePos = { x: -9999, y: -9999, active: false };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot get 2d context');
    this.ctx = context;

    this.initParticles();
    this.setupListeners();
  }

  private initParticles() {
    this.particles = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < this.numParticles; i++) {
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / this.numParticles);

      const x = this.radius * Math.sin(phi) * Math.cos(theta);
      const y = this.radius * Math.sin(phi) * Math.sin(theta);
      const z = this.radius * Math.cos(phi);

      this.particles.push({
        x, y, z,
        baseX: x, baseY: y, baseZ: z,
        size: Math.random() * 2 + 1.5,
        color: '#00f2fe',
        alpha: Math.random() * 0.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        vz: (Math.random() - 0.5) * 0.5
      });
    }
  }

  private setupListeners() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos = {
        x: e.clientX - rect.left - this.canvas.width / 2,
        y: e.clientY - rect.top - this.canvas.height / 2,
        active: true
      };
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mousePos.active = false;
    });
  }

  public setState(state: OrbState) {
    this.state = state;
  }

  public setAudioLevel(level: number) {
    this.audioLevel = Math.max(0, Math.min(1, level));
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.radius = Math.min(width, height) * 0.22;
    this.initParticles();
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
    const centerX = width / 2;
    const centerY = height / 2;

    this.ctx.clearRect(0, 0, width, height);

    // State-based dynamic rotation speeds
    let rotSpeedX = 0.003;
    let rotSpeedY = 0.005;

    if (this.state === 'thinking') {
      rotSpeedX = 0.02;
      rotSpeedY = 0.035;
    } else if (this.state === 'listening') {
      rotSpeedX = 0.006 + this.audioLevel * 0.02;
      rotSpeedY = 0.009 + this.audioLevel * 0.02;
    } else if (this.state === 'speaking') {
      rotSpeedX = 0.008 + this.audioLevel * 0.03;
      rotSpeedY = 0.012 + this.audioLevel * 0.03;
    }

    this.angleX += rotSpeedX;
    this.angleY += rotSpeedY;

    // State theme colors
    let coreColor = '#00f2fe';
    let haloColor = 'rgba(0, 242, 254, 0.15)';
    if (this.state === 'thinking') {
      coreColor = '#8b5cf6';
      haloColor = 'rgba(139, 92, 246, 0.2)';
    } else if (this.state === 'speaking') {
      coreColor = '#10b981';
      haloColor = 'rgba(16, 185, 129, 0.2)';
    } else if (this.state === 'meeting') {
      coreColor = '#f59e0b';
      haloColor = 'rgba(245, 158, 11, 0.2)';
    }

    // Draw central ambient glow core
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, this.radius * (1 + this.audioLevel * 0.5)
    );
    gradient.addColorStop(0, haloColor);
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, this.radius * (1 + this.audioLevel * 0.5), 0, Math.PI * 2);
    this.ctx.fill();

    // Transform and project particles
    const time = performance.now() * 0.002;
    const sortedParticles: { x2d: number; y2d: number; z: number; size: number; alpha: number; color: string }[] = [];

    for (const p of this.particles) {
      // Dynamic morphing displacement based on mode
      let targetRadius = this.radius;
      if (this.state === 'listening') {
        targetRadius += this.audioLevel * 45 * Math.sin(time * 3 + p.baseY * 0.05);
      } else if (this.state === 'speaking') {
        targetRadius += this.audioLevel * 60 * Math.cos(time * 4 + p.baseX * 0.05);
      } else if (this.state === 'thinking') {
        // Swirling vortex accretion ring effect
        const vortexDist = Math.sqrt(p.baseX * p.baseX + p.baseY * p.baseY);
        targetRadius = this.radius * (0.8 + 0.4 * Math.sin(vortexDist * 0.04 - time * 5));
      } else {
        // Idle breathing
        targetRadius += Math.sin(time + p.baseZ * 0.02) * 8;
      }

      // Normalization
      const dist = Math.sqrt(p.baseX * p.baseX + p.baseY * p.baseY + p.baseZ * p.baseZ) || 1;
      let currX = (p.baseX / dist) * targetRadius;
      let currY = (p.baseY / dist) * targetRadius;
      let currZ = (p.baseZ / dist) * targetRadius;

      // Magnetic cursor repulsion / attraction
      if (this.mousePos.active) {
        const dx = currX - this.mousePos.x;
        const dy = currY - this.mousePos.y;
        const mouseDist = Math.sqrt(dx * dx + dy * dy);
        if (mouseDist < 120) {
          const force = (1 - mouseDist / 120) * 28;
          currX += (dx / mouseDist) * force;
          currY += (dy / mouseDist) * force;
        }
      }

      // 3D Rotation around Y and X axes
      const cosY = Math.cos(this.angleY);
      const sinY = Math.sin(this.angleY);
      const cosX = Math.cos(this.angleX);
      const sinX = Math.sin(this.angleX);

      // Rotate Y
      const x1 = currX * cosY - currZ * sinY;
      const z1 = currZ * cosY + currX * sinY;

      // Rotate X
      const y1 = currY * cosX - z1 * sinX;
      const z2 = z1 * cosX + currY * sinX;

      // Perspective Projection
      const fov = 400;
      const scale = fov / (fov + z2);
      const x2d = centerX + x1 * scale;
      const y2d = centerY + y1 * scale;

      const alpha = Math.max(0.1, Math.min(1, ((z2 + this.radius) / (2 * this.radius)) * 0.85 + 0.15));
      sortedParticles.push({
        x2d,
        y2d,
        z: z2,
        size: p.size * scale * (1 + this.audioLevel * 0.4),
        alpha,
        color: coreColor
      });
    }

    // Sort by depth (back to front)
    sortedParticles.sort((a, b) => a.z - b.z);

    // Render particles
    for (const sp of sortedParticles) {
      this.ctx.fillStyle = sp.color;
      this.ctx.globalAlpha = sp.alpha;
      this.ctx.beginPath();
      this.ctx.arc(sp.x2d, sp.y2d, Math.max(0.8, sp.size), 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1.0;
  }
}
