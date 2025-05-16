/**
 * Nebula - Main JavaScript
 * Core functionality and initialization
 */

class NebulaApp {
  constructor() {
    // Store references to DOM elements
    this.nav = document.querySelector('.main-nav');
    this.menuToggle = document.querySelector('.menu-toggle');
    this.navLinks = document.querySelector('.nav-links');
    this.projectCards = document.querySelectorAll('[data-tilt]');
    
    this.init();
  }
  
  init() {
    // Initialize navigation functionality
    this.initNavigation();
    
    // Initialize 3D card tilt effect
    this.init3DCards();
    
    // Initialize WebGL background effects
    this.initWebGLBackgrounds();
    
    // Handle scroll events
    this.setupScrollEvents();
  }
  
  initNavigation() {
    // Mobile menu toggle
    if (this.menuToggle) {
      this.menuToggle.addEventListener('click', () => {
        this.menuToggle.classList.toggle('active');
        this.navLinks.classList.toggle('active');
        document.body.classList.toggle('menu-open');
      });
    }
    
    // Close mobile menu when clicking on a link
    const navItems = document.querySelectorAll('.nav-links a');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          this.menuToggle.classList.remove('active');
          this.navLinks.classList.remove('active');
          document.body.classList.remove('menu-open');
        }
      });
    });
  }
  
  init3DCards() {
    // Add 3D rotation effect to project cards
    this.projectCards.forEach(card => {
      card.addEventListener('mousemove', this.handleCardTilt.bind(this));
      card.addEventListener('mouseleave', this.resetCardTilt.bind(this));
    });
  }
  
  handleCardTilt(e) {
    const card = e.currentTarget;
    const cardRect = card.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;
    
    // Calculate mouse position relative to card center
    const mouseX = e.clientX - cardCenterX;
    const mouseY = e.clientY - cardCenterY;
    
    // Calculate rotation based on mouse position
    const rotateY = (mouseX / (cardRect.width / 2)) * 10; // Max 10 degrees
    const rotateX = -((mouseY / (cardRect.height / 2)) * 10); // Max 10 degrees
    
    // Apply transform
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
    
    // Add highlight effect based on mouse position
    const shine = card.querySelector('.card-shine') || this.createShineElement(card);
    shine.style.background = `radial-gradient(circle at ${e.offsetX}px ${e.offsetY}px, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 80%)`;
    
    // Create WebGL interactive elements when hovering over cards
    if (window.particleSystem && Math.random() < 0.3) {
      window.particleSystem.createBurst(e.clientX, e.clientY, 5);
    }
    
    if (window.fluidSimulation && Math.random() < 0.2) {
      window.fluidSimulation.addSplat(
        e.clientX,
        e.clientY,
        mouseX * 0.0002,
        mouseY * 0.0002
      );
    }
  }
  
  createShineElement(card) {
    const shine = document.createElement('div');
    shine.className = 'card-shine';
    shine.style.position = 'absolute';
    shine.style.top = '0';
    shine.style.left = '0';
    shine.style.width = '100%';
    shine.style.height = '100%';
    shine.style.borderRadius = 'inherit';
    shine.style.pointerEvents = 'none';
    card.style.position = 'relative';
    card.style.overflow = 'hidden';
    card.appendChild(shine);
    return shine;
  }
  
  resetCardTilt(e) {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    
    // Remove or fade out shine effect
    const shine = card.querySelector('.card-shine');
    if (shine) {
      shine.style.background = 'none';
    }
  }

  initWebGLBackgrounds() {
    // Only initialize these if not already created by a page-specific script
    
    // Initialize WebGL Particles
    if (window.WebGLParticles && !window.particleSystem) {
      const particlesOptions = {
        particleCount: 1000, // Default particle count (can be adjusted per page)
        particleSize: 2.0,
        color: [0.5, 0.8, 1.0], // Light blue color that matches nebula theme
        speed: 0.4,
        connectParticles: true,
        maxConnections: 3,
        connectionDistance: 150
      };
      
      window.particleSystem = new WebGLParticles(particlesOptions);
      
      // Add interactive particle bursts on page elements
      document.addEventListener('mousemove', (e) => {
        if (Math.random() < 0.05) { // Occasional particle burst for subtle effect
          window.particleSystem.createBurst(e.clientX, e.clientY, 3);
        }
      });
    }
    
    // Initialize Fluid Simulation
    if (window.FluidSimulation && !window.fluidSimulation) {
      const fluidOptions = {
        TEXTURE_DOWNSAMPLE: 1,
        DENSITY_DISSIPATION: 0.98,
        VELOCITY_DISSIPATION: 0.99,
        PRESSURE_DISSIPATION: 0.8,
        PRESSURE_ITERATIONS: 20,
        CURL: 30,
        SPLAT_RADIUS: 0.005,
        COLORFUL: true,
        TRANSPARENT: true,
        BLOOM: true,
        BLOOM_ITERATIONS: 8,
        BLOOM_RESOLUTION: 256,
        BLOOM_INTENSITY: 0.8,
        BLOOM_THRESHOLD: 0.6,
        BLOOM_SOFT_KNEE: 0.7
      };
      
      window.fluidSimulation = new FluidSimulation(fluidOptions);
      
      // Add some initial splats to make the fluid simulation visible
      setTimeout(() => {
        for (let i = 0; i < 3; i++) {
          const x = Math.random() * window.innerWidth;
          const y = Math.random() * window.innerHeight;
          window.fluidSimulation.addSplat(
            x, 
            y, 
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01
          );
        }
      }, 100);
      
      // Add occasional fluid splats on scroll for dynamic effect
      let lastScrollY = window.scrollY;
      window.addEventListener('scroll', () => {
        const deltaY = window.scrollY - lastScrollY;
        lastScrollY = window.scrollY;
        
        if (Math.abs(deltaY) > 10 && Math.random() < 0.3) {
          const x = Math.random() * window.innerWidth;
          const y = window.innerHeight / 2;
          window.fluidSimulation.addSplat(
            x, 
            y, 
            (Math.random() - 0.5) * 0.01,
            deltaY * 0.0001
          );
        }
      });
    }
  }
  
  setupScrollEvents() {
    // Change navigation background on scroll
    window.addEventListener('scroll', () => {
      if (window.scrollY > 100) {
        this.nav.classList.add('scrolled');
      } else {
        this.nav.classList.remove('scrolled');
      }
    });
    
    // Add fluid dynamics to hero section on scroll
    const heroSection = document.querySelector('.hero-section');
    if (heroSection && window.fluidSimulation) {
      let lastScrollY = window.scrollY;
      let scrollTimer;
      
      window.addEventListener('scroll', () => {
        if (window.scrollY < heroSection.offsetHeight) {
          const deltaY = window.scrollY - lastScrollY;
          lastScrollY = window.scrollY;
          
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(() => {
            const x = window.innerWidth / 2;
            const y = window.innerHeight / 2;
            window.fluidSimulation.addSplat(
              x, 
              y, 
              deltaY * 0.0001, 
              deltaY * 0.0002
            );
          }, 50);
        }
      });
    }
  }
  
  // Method to initialize lazy-loaded content
  initLazyContent() {
    // For content that might be loaded via AJAX or after page transitions
    this.projectCards = document.querySelectorAll('[data-tilt]');
    this.init3DCards();
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.nebulaApp = new NebulaApp();
});