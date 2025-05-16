/**
 * Nebula - Particle System
 * Creates an interactive particle background that responds to user movement
 */

class ParticleSystem {
  constructor() {
    this.canvas = document.getElementById('particle-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = window.innerWidth < 768 ? 50 : 100;
    this.mouseX = 0;
    this.mouseY = 0;
    this.isActive = true;
    this.hoverStrength = 200; // Distance at which particles respond to mouse
    this.colorPalette = [
      { r: 90, g: 49, b: 244 },  // Primary color
      { r: 6, g: 214, b: 160 },  // Secondary color
      { r: 255, g: 107, b: 53 }  // Accent color
    ];
    
    this.init();
  }
  
  init() {
    this.resize();
    this.createParticles();
    this.setupEventListeners();
    this.animate();
    
    // Add page transition event listeners
    document.addEventListener('page-transition-start', () => {
      this.isActive = false;
      this.fadeOut();
    });
    
    document.addEventListener('page-transition-end', () => {
      this.isActive = true;
      this.fadeIn();
    });
    
    // If window is not focused, slow down animation
    window.addEventListener('blur', () => {
      this.isActive = false;
    });
    
    window.addEventListener('focus', () => {
      this.isActive = true;
    });
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    
    // Scale for retina displays
    if (dpr > 1) {
      this.canvas.style.width = this.canvas.width + 'px';
      this.canvas.style.height = this.canvas.height + 'px';
      this.canvas.width *= dpr;
      this.canvas.height *= dpr;
      this.ctx.scale(dpr, dpr);
    }
  }
  
  createParticles() {
    this.particles = [];
    
    for (let i = 0; i < this.particleCount; i++) {
      const colorIndex = Math.floor(Math.random() * this.colorPalette.length);
      const color = this.colorPalette[colorIndex];
      
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 2 + 0.5,
        originalRadius: Math.random() * 2 + 0.5,
        color: `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.random() * 0.6 + 0.1})`,
        speed: {
          x: Math.random() * 0.5 - 0.25,
          y: Math.random() * 0.5 - 0.25
        },
        direction: Math.random() * Math.PI * 2,
        vx: 0,
        vy: 0,
        opacity: Math.random() * 0.6 + 0.2,
        targetOpacity: Math.random() * 0.6 + 0.2,
        originalOpacity: Math.random() * 0.6 + 0.2,
      });
    }
  }
  
  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.resize();
      this.createParticles();
    });
    
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    
    // Respond to scroll events by changing particle behavior
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const scrollProgress = scrollY / maxScroll;
      
      // Change particle behavior based on scroll position
      this.particles.forEach(particle => {
        // Make particles move faster as user scrolls down
        const speedMultiplier = 1 + scrollProgress * 2;
        particle.speed.x = particle.speed.x * speedMultiplier;
        particle.speed.y = particle.speed.y * speedMultiplier;
        
        // Add a bit of turbulence on scroll
        if (Math.random() > 0.95) {
          particle.vx += (Math.random() - 0.5) * 2;
          particle.vy += (Math.random() - 0.5) * 2;
        }
      });
    }, { passive: true });
  }
  
  animate() {
    if (!this.ctx) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(particle => {
      // Update particle opacity with smooth transition
      if (particle.opacity < particle.targetOpacity) {
        particle.opacity += 0.01;
      } else if (particle.opacity > particle.targetOpacity) {
        particle.opacity -= 0.01;
      }
      
      // Calculate distance to mouse
      if (this.mouseX && this.mouseY) {
        const dx = this.mouseX - particle.x;
        const dy = this.mouseY - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Particles react to mouse proximity
        if (dist < this.hoverStrength && this.isActive) {
          // Push particles away from mouse
          const forceDirectionX = dx / dist;
          const forceDirectionY = dy / dist;
          const force = (this.hoverStrength - dist) / this.hoverStrength;
          
          particle.vx -= forceDirectionX * force * 0.6;
          particle.vy -= forceDirectionY * force * 0.6;
          
          // Highlight particles near mouse
          particle.targetOpacity = particle.originalOpacity * 1.5;
          particle.radius = particle.originalRadius * (1 + force * 1.5);
        } else {
          // Return to normal state
          particle.targetOpacity = particle.originalOpacity;
          particle.radius = particle.originalRadius;
        }
      }
      
      // Apply velocity and damping
      particle.x += particle.vx + particle.speed.x;
      particle.y += particle.vy + particle.speed.y;
      particle.vx *= 0.94;
      particle.vy *= 0.94;
      
      // Boundary checking with smooth wrapping
      if (particle.x < 0) {
        particle.x = this.canvas.width;
      } else if (particle.x > this.canvas.width) {
        particle.x = 0;
      }
      
      if (particle.y < 0) {
        particle.y = this.canvas.height;
      } else if (particle.y > this.canvas.height) {
        particle.y = 0;
      }
      
      // Draw the particle
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      
      // Set the particle color with updated opacity
      const rgbaColor = particle.color.replace(/[\d\.]+\)$/g, `${particle.opacity})`);
      this.ctx.fillStyle = rgbaColor;
      
      this.ctx.fill();
    });
    
    // Draw connections between nearby particles
    this.drawConnections();
    
    // Continue animation loop
    requestAnimationFrame(this.animate.bind(this));
  }
  
  drawConnections() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Only connect particles within certain distance
        if (dist < 100) {
          // Calculate opacity based on distance
          const opacity = (1 - dist / 100) * 0.3;
          
          // Draw connection line
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }
  }
  
  fadeOut() {
    // Fade out particles for page transitions
    this.particles.forEach(particle => {
      particle.targetOpacity = 0;
    });
  }
  
  fadeIn() {
    // Fade in particles after page transitions
    this.particles.forEach(particle => {
      particle.targetOpacity = particle.originalOpacity;
    });
  }
  
  // Create a burst of particles from a specific point (for click effects)
  createBurst(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const colorIndex = Math.floor(Math.random() * this.colorPalette.length);
      const color = this.colorPalette[colorIndex];
      
      this.particles.push({
        x: x,
        y: y,
        radius: Math.random() * 3 + 1,
        originalRadius: Math.random() * 3 + 1,
        color: `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.random() * 0.9 + 0.1})`,
        speed: {
          x: Math.random() * 6 - 3,
          y: Math.random() * 6 - 3
        },
        direction: Math.random() * Math.PI * 2,
        vx: 0,
        vy: 0,
        opacity: 1,
        targetOpacity: 0,
        originalOpacity: 1,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.01
      });
    }
  }
}

// Initialize particle system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.particleSystem = new ParticleSystem();
  
  // Add click effect for particle bursts
  document.addEventListener('click', (e) => {
    if (window.particleSystem) {
      window.particleSystem.createBurst(e.clientX, e.clientY, 20);
    }
  });
});