/**
 * Nebula - Transitions
 * Handles smooth page transitions between different pages and scroll animations
 */

class PageTransition {
  constructor() {
    this.transitionContainerEl = null;
    this.transitionPanels = [];
    this.transitionLogo = null;
    this.isAnimating = false;
    this.links = document.querySelectorAll('a[href^="/"]:not([target]), a[href^="./"]:not([target]), a[href^="../"]:not([target]), a[href^="about.html"]:not([target]), a[href^="portfolio.html"]:not([target]), a[href^="services.html"]:not([target]), a[href^="contact.html"]:not([target])');
    
    this.init();
  }
  
  init() {
    // Create transition overlay element
    this.createOverlay();
    
    // Setup event listeners for links
    this.setupEventListeners();
    
    // Add page loaded class after the page has fully loaded
    window.addEventListener('load', () => {
      document.body.classList.add('page-loaded');
    });

    // Create a progress indicator
    this.createScrollProgress();
  }
  
  createOverlay() {
    // Create advanced transition container if it doesn't exist
    if (!document.querySelector('.page-transition-container')) {
      this.transitionContainerEl = document.createElement('div');
      this.transitionContainerEl.className = 'page-transition-container';
      
      // Create three panels for layered transitions
      for (let i = 0; i < 3; i++) {
        const panel = document.createElement('div');
        panel.className = 'transition-panel';
        this.transitionContainerEl.appendChild(panel);
        this.transitionPanels.push(panel);
      }
      
      // Create transition logo
      this.transitionLogo = document.createElement('div');
      this.transitionLogo.className = 'transition-logo';
      this.transitionLogo.textContent = 'Nebula';
      this.transitionContainerEl.appendChild(this.transitionLogo);
      
      document.body.appendChild(this.transitionContainerEl);
    } else {
      this.transitionContainerEl = document.querySelector('.page-transition-container');
      this.transitionPanels = Array.from(this.transitionContainerEl.querySelectorAll('.transition-panel'));
      this.transitionLogo = this.transitionContainerEl.querySelector('.transition-logo');
    }

    // Create a page content container if it doesn't exist
    if (!document.querySelector('.page-content')) {
      const content = document.createElement('div');
      content.className = 'page-content';
      
      // Move all body children into the content container (except the transition container)
      while (document.body.children.length > 1) {
        if (document.body.children[0] !== this.transitionContainerEl) {
          content.appendChild(document.body.children[0]);
        } else {
          content.appendChild(document.body.children[1]);
        }
      }
      
      document.body.appendChild(content);
    }
  }

  createScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      progressBar.style.width = scrolled + "%";
    });
  }
  
  setupEventListeners() {
    // Add click event to all internal links
    this.links.forEach(link => {
      link.addEventListener('click', (e) => {
        // Don't handle if modifier keys are pressed
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        
        const href = link.getAttribute('href');
        
        // Ignore if link is the current page
        if (href === window.location.pathname) return;
        
        e.preventDefault();
        this.navigate(href);
      });
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.navigate(window.location.pathname, true);
    });
  }
  
  async navigate(url, isPopState = false) {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    // Start page exit animation
    this.transitionContainerEl.classList.add('transition-active');
    
    // Wait for exit animation to complete (panels slide in)
    await this.waitForAnimation(600);
    
    try {
      // Fetch new page content
      const response = await fetch(url);
      const html = await response.text();
      
      // Parse the HTML and get the new content
      const parser = new DOMParser();
      const newDocument = parser.parseFromString(html, 'text/html');
      
      // Update page title
      document.title = newDocument.title;
      
      // Update URL if not triggered by popstate
      if (!isPopState) {
        history.pushState({}, document.title, url);
      }
      
      // Get the content container from new page
      let newContent = newDocument.querySelector('.page-content');
      
      // If there's no page-content container in the new page, wrap everything in one
      if (!newContent) {
        newContent = document.createElement('div');
        newContent.className = 'page-content';
        
        // Move all body elements to new container
        Array.from(newDocument.body.children).forEach(el => {
          // Skip transition container if it exists
          if (!el.classList.contains('page-transition-container') && 
              !el.classList.contains('scroll-progress')) {
            newContent.appendChild(el.cloneNode(true));
          }
        });
      }
      
      // Replace page content
      const currentContent = document.querySelector('.page-content');
      if (currentContent) {
        currentContent.innerHTML = newContent.innerHTML;
      } else {
        document.body.innerHTML = '';
        const pageContent = document.createElement('div');
        pageContent.className = 'page-content';
        pageContent.innerHTML = newContent.innerHTML;
        document.body.appendChild(pageContent);
      }
      
      // Prepare for exit animation
      this.transitionContainerEl.classList.add('transition-exit');
      
      // Re-initialize scripts and animations
      this.reinitializeScripts();
      
      // Wait for the exit animation before removing transition classes
      await this.waitForAnimation(600);
      
      // Remove all transition classes
      this.transitionContainerEl.classList.remove('transition-active');
      this.transitionContainerEl.classList.remove('transition-exit');
      
      this.isAnimating = false;
      
      // Scroll to top of the page
      window.scrollTo(0, 0);
      
      // Re-initialize scroll animations
      if (window.AnimationController) {
        window.AnimationController.initScrollAnimations();
      }
      
    } catch (error) {
      console.error('Page transition error:', error);
      this.isAnimating = false;
      
      // Fallback to traditional navigation on error
      window.location.href = url;
    }
  }
  
  waitForAnimation(duration) {
    return new Promise(resolve => {
      setTimeout(resolve, duration);
    });
  }
  
  reinitializeScripts() {
    // Re-initialize all our JavaScript components
    
    // We need to attach ourselves to links again
    this.links = document.querySelectorAll('a[href^="/"]:not([target]), a[href^="./"]:not([target]), a[href^="../"]:not([target]), a[href^="about.html"]:not([target]), a[href^="portfolio.html"]:not([target]), a[href^="services.html"]:not([target]), a[href^="contact.html"]:not([target])');
    this.setupEventListeners();
    
    // Re-initialize all components
    if (window.particleSystem) {
      new ParticleSystem();
    }
    
    if (window.AnimationController) {
      window.AnimationController = new AnimationController();
    }
    
    if (window.TextFx) {
      window.TextFx = new TextFx();
    }
    
    new CustomCursor();
    
    // Re-create our progress indicator
    this.createScrollProgress();
  }
}

/**
 * Animation controller for scroll-based animations
 */
class AnimationController {
  constructor() {
    this.scrollAnimElements = document.querySelectorAll('.scroll-animate, .animate-on-scroll, .staggered');
    this.magneticElements = document.querySelectorAll('.magnetic');
    
    this.initScrollAnimations();
    this.initMagneticElements();
    this.initParallaxElements();
    
    // Dispatch a custom event in case other scripts need to know when animations are initialized
    document.dispatchEvent(new CustomEvent('animations-initialized'));
  }
  
  initScrollAnimations() {
    // Initial check for elements in viewport
    this.checkScrollAnimations();
    
    // Add scroll event listener with throttling
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.checkScrollAnimations();
          ticking = false;
        });
        ticking = true;
      }
    });
    
    // Also check on resize
    window.addEventListener('resize', () => {
      this.checkScrollAnimations();
    });
  }
  
  checkScrollAnimations() {
    this.scrollAnimElements.forEach(el => {
      if (this.isInViewport(el, 0.2)) { // 20% of element must be in viewport
        el.classList.add('animated');
      } else if (el.hasAttribute('data-animate-once') === false) {
        // Only remove animation if not set to animate once
        el.classList.remove('animated');
      }
    });
  }
  
  isInViewport(el, offset = 0) {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    
    // Element is considered in viewport if its top is in view or its bottom is in view
    // or it takes up the entire viewport
    return (
      (rect.top <= windowHeight * (1 - offset) && rect.bottom >= 0) ||
      (rect.bottom >= 0 && rect.top <= windowHeight) ||
      (rect.top <= 0 && rect.bottom >= windowHeight)
    );
  }
  
  initMagneticElements() {
    this.magneticElements.forEach(el => {
      el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        // Calculate distance from center as a percentage
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const distance = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
        const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
        const magnetStrength = 0.4; // Adjust this for more/less movement
        
        // The farther from center, the more movement
        const moveX = (x / maxDistance) * magnetStrength * 30;
        const moveY = (y / maxDistance) * magnetStrength * 30;
        
        el.style.transform = `translate(${moveX}px, ${moveY}px)`;
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0, 0)';
      });
    });
  }
  
  initParallaxElements() {
    const parallaxElements = document.querySelectorAll('.parallax, .parallax-deep');
    
    if (parallaxElements.length > 0) {
      window.addEventListener('mousemove', e => {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        parallaxElements.forEach(el => {
          const depth = el.classList.contains('parallax-deep') ? 30 : 15;
          const moveX = (mouseX - 0.5) * depth;
          const moveY = (mouseY - 0.5) * depth;
          
          el.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
      });
    }
    
    // Handle scroll-linked parallax elements
    const scrollParallaxElements = document.querySelectorAll('.scroll-linked');
    if (scrollParallaxElements.length > 0) {
      window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        
        scrollParallaxElements.forEach(el => {
          const speed = parseFloat(el.getAttribute('data-speed') || 0.2);
          const direction = el.getAttribute('data-direction') || 'up';
          const rect = el.getBoundingClientRect();
          const elTop = rect.top + scrollTop;
          
          // Calculate how far the element is from the top of the viewport
          const distanceFromViewportTop = rect.top;
          const distanceFromViewportBottom = windowHeight - rect.bottom;
          
          // Only apply effect when element is visible
          if (distanceFromViewportTop < windowHeight && distanceFromViewportBottom > -rect.height) {
            let moveY = 0;
            let scale = 1;
            let opacity = 1;
            
            // Calculate scroll progress through element (-1 to 1 range where 0 is centered)
            const progress = 1 - (distanceFromViewportTop + rect.height / 2) / (windowHeight + rect.height);
            
            switch (direction) {
              case 'up':
                moveY = progress * speed * 100;
                break;
              case 'down':
                moveY = -progress * speed * 100;
                break;
              case 'fade':
                opacity = 1 - Math.abs(progress) * speed * 2;
                break;
              case 'scale':
                scale = 1 + progress * speed * 0.5;
                break;
            }
            
            el.style.transform = `translateY(${moveY}px) scale(${scale})`;
            el.style.opacity = opacity;
          }
        });
      }, { passive: true });
    }
  }

  // This method adds text splitting functionality for advanced text animations
  splitTextNodes() {
    const elements = document.querySelectorAll('.split-text');
    
    elements.forEach(el => {
      const text = el.textContent;
      let html = '';
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i] === ' ' ? '&nbsp;' : text[i];
        const delay = i * 0.05; // 50ms incremental delays
        html += `<span class="char" style="transition-delay: ${delay}s">${char}</span>`;
      }
      
      el.innerHTML = html;
      el.style.visibility = 'visible';
    });
  }
}

// Initialize page transitions when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.PageTransition = new PageTransition();
  window.AnimationController = new AnimationController();
});