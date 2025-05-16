/**
 * Nebula - Animations
 * Handles all animations and effects throughout the site
 */

class AnimationController {
  constructor() {
    // Elements to animate
    this.scrollAnimElements = document.querySelectorAll('.scroll-animate, .animate-on-scroll, .staggered');
    this.splitTextElements = document.querySelectorAll('.split-text');
    this.magneticElements = document.querySelectorAll('.magnetic');
    this.parallaxElements = document.querySelectorAll('.parallax, .parallax-deep');
    this.scrollLinkedElements = document.querySelectorAll('.scroll-linked');
    this.colorTransitionSections = document.querySelectorAll('.scroll-color-transition');
    
    // Initialize animations
    this.initScrollAnimations();
    this.initSplitText();
    this.initMagneticElements();
    this.initParallaxEffects();
    this.initScrollLinkedEffects();
    this.initScrollColorTransitions();
    
    // Create scroll progress indicator
    this.createScrollProgress();
    
    // Create particles for animated elements if needed
    this.initParticles();
    
    // Dispatch event when animations are initialized
    document.dispatchEvent(new CustomEvent('animations-initialized'));
  }
  
  /**
   * Initialize scroll-triggered animations with IntersectionObserver
   */
  initScrollAnimations() {
    // Initial check for elements already in viewport on page load
    this.checkScrollAnimations();
    
    // Create intersection observer for scroll animations
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.2, // 20% of element must be visible
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          
          // If element should only animate once, unobserve it
          if (entry.target.hasAttribute('data-animate-once')) {
            observer.unobserve(entry.target);
          }
        } else if (!entry.target.hasAttribute('data-animate-once')) {
          entry.target.classList.remove('animated');
        }
      });
    }, observerOptions);
    
    // Observe all elements with animation classes
    this.scrollAnimElements.forEach(el => {
      observer.observe(el);
    });
    
    // Also check on scroll with throttling for older browsers
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.checkScrollAnimations();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }
  
  /**
   * Check which elements should be animated based on scroll position
   */
  checkScrollAnimations() {
    this.scrollAnimElements.forEach(el => {
      if (this.isInViewport(el, 0.2)) {
        el.classList.add('animated');
      } else if (!el.hasAttribute('data-animate-once')) {
        el.classList.remove('animated');
      }
    });
  }
  
  /**
   * Check if element is in the viewport
   * @param {Element} el - The element to check
   * @param {number} offset - Percentage of viewport that element must be visible in
   * @return {boolean} Whether element is in viewport
   */
  isInViewport(el, offset = 0) {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    
    return (
      (rect.top <= windowHeight * (1 - offset) && rect.bottom >= 0) ||
      (rect.bottom >= 0 && rect.top <= windowHeight) ||
      (rect.top <= 0 && rect.bottom >= windowHeight)
    );
  }
  
  /**
   * Initialize text splitting for character-based animations
   */
  initSplitText() {
    if (this.splitTextElements.length === 0) return;
    
    this.splitTextElements.forEach(el => {
      const text = el.textContent;
      let html = '';
      
      // Split text into individual characters with staggered delays
      for (let i = 0; i < text.length; i++) {
        const char = text[i] === ' ' ? '&nbsp;' : text[i];
        const delay = i * 0.05; // 50ms delay between each character
        html += `<span class="char" style="transition-delay: ${delay}s">${char}</span>`;
      }
      
      el.innerHTML = html;
      el.style.visibility = 'visible';
      
      // Create intersection observer for text elements
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animated');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      
      observer.observe(el);
    });
  }
  
  /**
   * Initialize magnetic effect for buttons and elements
   */
  initMagneticElements() {
    this.magneticElements.forEach(el => {
      el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        // Calculate distance from center as a percentage
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const magnetStrength = 0.5; // Adjust for stronger/weaker effect
        
        // The farther from center, the more movement
        const moveX = (x / centerX) * magnetStrength * 20;
        const moveY = (y / centerY) * magnetStrength * 20;
        
        el.style.transform = `translate(${moveX}px, ${moveY}px)`;
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0, 0)';
      });
    });
  }
  
  /**
   * Initialize parallax effects for background and floating elements
   */
  initParallaxEffects() {
    if (this.parallaxElements.length === 0) return;
    
    // Mouse movement parallax
    document.addEventListener('mousemove', e => {
      const mouseX = e.clientX / window.innerWidth;
      const mouseY = e.clientY / window.innerHeight;
      
      this.parallaxElements.forEach(el => {
        const depth = el.classList.contains('parallax-deep') ? 30 : 15; 
        const speed = parseFloat(el.dataset.speed || 0.1);
        const moveX = (mouseX - 0.5) * depth * speed;
        const moveY = (mouseY - 0.5) * depth * speed;
        
        el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
      });
    });
    
    // Scroll-based parallax
    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      document.querySelectorAll('[data-parallax-scroll]').forEach(el => {
        const speed = parseFloat(el.dataset.parallaxScroll || 0.2);
        const yPos = -(scrollTop * speed);
        el.style.transform = `translate3d(0, ${yPos}px, 0)`;
      });
    }, { passive: true });
  }
  
  /**
   * Initialize scroll-linked effects for elements that change based on scroll position
   */
  initScrollLinkedEffects() {
    if (this.scrollLinkedElements.length === 0) return;
    
    // Handle scroll events for linked elements
    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      
      this.scrollLinkedElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const elementTop = rect.top + scrollTop;
        const elementHeight = rect.height;
        
        // Calculate element's position in the viewport
        const viewportPosition = (windowHeight - rect.top) / (windowHeight + elementHeight);
        const clampedPosition = Math.max(0, Math.min(1, viewportPosition));
        
        // Get animation settings from data attributes
        const speed = parseFloat(el.dataset.speed || 0.2);
        const direction = el.dataset.direction || 'up';
        const type = el.dataset.type || 'transform';
        
        // Apply different effects based on scroll position
        switch (type) {
          case 'transform':
            let moveY = 0;
            if (direction === 'up') {
              moveY = (1 - clampedPosition) * speed * 100;
            } else if (direction === 'down') {
              moveY = clampedPosition * speed * -100;
            }
            el.style.transform = `translate3d(0, ${moveY}px, 0)`;
            break;
            
          case 'opacity':
            el.style.opacity = clampedPosition;
            break;
            
          case 'scale':
            const scale = 0.8 + (clampedPosition * speed);
            el.style.transform = `scale(${scale})`;
            break;
            
          case 'rotate':
            const rotate = clampedPosition * speed * 360;
            el.style.transform = `rotate(${rotate}deg)`;
            break;
        }
      });
    }, { passive: true });
  }
  
  /**
   * Initialize color transitions based on scroll position
   */
  initScrollColorTransitions() {
    if (this.colorTransitionSections.length === 0) return;
    
    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      
      this.colorTransitionSections.forEach(el => {
        const rect = el.getBoundingClientRect();
        
        if (rect.top < windowHeight && rect.bottom > 0) {
          const progress = 1 - (rect.top / windowHeight);
          const clampedProgress = Math.max(0, Math.min(1, progress));
          
          // Get colors from data attributes or use defaults
          const startColor = el.dataset.startColor || 'rgba(18, 18, 18, 1)';
          const endColor = el.dataset.endColor || 'rgba(90, 49, 244, 0.2)';
          
          // Create gradient background based on scroll position
          el.style.backgroundColor = this.lerpColor(startColor, endColor, clampedProgress);
        }
      });
    }, { passive: true });
  }
  
  /**
   * Linear interpolation between two colors based on progress
   */
  lerpColor(startColor, endColor, progress) {
    // Parse rgba colors
    const parseRGBA = (color) => {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/);
      if (match) {
        return {
          r: parseInt(match[1], 10),
          g: parseInt(match[2], 10),
          b: parseInt(match[3], 10),
          a: match[4] ? parseFloat(match[4]) : 1
        };
      }
      return { r: 0, g: 0, b: 0, a: 1 };
    };
    
    const start = parseRGBA(startColor);
    const end = parseRGBA(endColor);
    
    const r = Math.round(start.r + (end.r - start.r) * progress);
    const g = Math.round(start.g + (end.g - start.g) * progress);
    const b = Math.round(start.b + (end.b - start.b) * progress);
    const a = start.a + (end.a - start.a) * progress;
    
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  
  /**
   * Create scroll progress indicator at the top of the page
   */
  createScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      
      progressBar.style.width = scrolled + '%';
    }, { passive: true });
  }
  
  /**
   * Initialize particle animations for elements with particle class
   */
  initParticles() {
    const particleContainers = document.querySelectorAll('.particle-container');
    
    particleContainers.forEach(container => {
      const particleCount = parseInt(container.dataset.particles || '10', 10);
      
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Randomize particle properties
        const size = Math.random() * 10 + 5;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = Math.random() * 3 + 2;
        const opacity = Math.random() * 0.5 + 0.3;
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.animationDuration = `${duration}s`;
        particle.style.opacity = opacity.toString();
        
        container.appendChild(particle);
      }
    });
  }
}

class TextFx {
  constructor() {
    this.init();
  }
  
  init() {
    // Find all elements with data-text-fx attribute
    const textElements = document.querySelectorAll('[data-text-fx]');
    
    textElements.forEach(el => {
      const fxType = el.getAttribute('data-text-fx');
      
      switch (fxType) {
        case 'glitch':
          this.setupGlitchEffect(el);
          break;
        case 'typewriter':
          this.setupTypewriterEffect(el);
          break;
        case 'gradient':
          this.setupGradientEffect(el);
          break;
      }
    });
  }
  
  setupGlitchEffect(el) {
    const text = el.textContent;
    el.setAttribute('data-text', text);
    el.classList.add('glitch');
  }
  
  setupTypewriterEffect(el) {
    const text = el.textContent;
    const duration = parseInt(el.getAttribute('data-duration') || '2000', 10);
    
    // Clear the element's content
    el.textContent = '';
    
    // Create a wrapper for the cursor
    const wrapper = document.createElement('span');
    wrapper.className = 'typewriter-wrapper';
    
    const textElement = document.createElement('span');
    textElement.className = 'typewriter-text';
    
    const cursorElement = document.createElement('span');
    cursorElement.className = 'typewriter-cursor';
    cursorElement.textContent = '|';
    
    wrapper.appendChild(textElement);
    wrapper.appendChild(cursorElement);
    el.appendChild(wrapper);
    
    // Create intersection observer for typewriter effect
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.typeText(textElement, text, duration);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    
    observer.observe(el);
  }
  
  typeText(element, text, duration) {
    const characters = text.split('');
    const charDuration = duration / characters.length;
    
    characters.forEach((char, index) => {
      setTimeout(() => {
        element.textContent += char;
      }, charDuration * index);
    });
  }
  
  setupGradientEffect(el) {
    const text = el.textContent;
    const colors = el.getAttribute('data-colors') || '5a31f4,06d6a0,ff6b35';
    const colorArray = colors.split(',').map(color => '#' + color.trim().replace('#', ''));
    
    // Create style for gradient animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes gradient-${this.generateUniqueId()} {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);
    
    // Apply gradient
    el.style.background = `linear-gradient(120deg, ${colorArray.join(', ')})`;
    el.style.backgroundSize = '200% 200%';
    el.style.color = 'transparent';
    el.style.webkitBackgroundClip = 'text';
    el.style.backgroundClip = 'text';
    el.style.animation = `gradient-${this.generateUniqueId()} 5s ease infinite`;
  }
  
  generateUniqueId() {
    return Math.random().toString(36).substring(2, 9);
  }
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.AnimationController = new AnimationController();
  window.TextFx = new TextFx();
});