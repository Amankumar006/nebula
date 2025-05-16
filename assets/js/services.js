/**
 * Nebula - Services Page Functionality
 * Handles service tabs, testimonial slider, parallax effects, and feature animations
 */

class ServicesController {
  constructor() {
    // Tab elements
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');
    
    // Testimonial elements
    this.testimonialSlides = document.querySelectorAll('.testimonial-slide');
    this.testimonialDots = document.querySelectorAll('.testimonial-dots .dot');
    this.currentSlide = 0;
    this.testimonialInterval = null;
    
    // Parallax elements
    this.parallaxElements = document.querySelectorAll('.parallax');
    
    // Staggered animation elements
    this.staggeredContainers = document.querySelectorAll('.staggered');
    
    // Initialize functionality
    this.init();
  }
  
  init() {
    // Initialize tabs
    this.initTabs();
    
    // Initialize testimonial slider
    this.initTestimonials();
    
    // Initialize parallax effect
    this.initParallax();
    
    // Initialize staggered animations
    this.initStaggeredAnimations();
  }
  
  // Tab functionality
  initTabs() {
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        
        // Remove active class from all buttons and contents
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        this.tabContents.forEach(content => {
          content.classList.remove('active');
          content.style.opacity = 0;
        });
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        const activeContent = document.getElementById(tabId);
        
        // Add fade-in animation
        setTimeout(() => {
          activeContent.classList.add('active');
          activeContent.style.opacity = 1;
        }, 50);
        
        // Trigger animations for newly visible content
        this.triggerAnimationsInTab(activeContent);
      });
    });
  }
  
  triggerAnimationsInTab(tabContent) {
    // Reset animations for animate-on-scroll elements
    const animatedElements = tabContent.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => {
      el.classList.remove('animated');
      
      // Trigger animation after a short delay
      setTimeout(() => {
        el.classList.add('animated');
      }, 300);
    });
    
    // Reset staggered animations within the tab
    const staggeredContainers = tabContent.querySelectorAll('.staggered');
    staggeredContainers.forEach(container => {
      this.animateStaggeredItems(container);
    });
  }
  
  // Testimonial slider functionality
  initTestimonials() {
    // Add click events to dots
    this.testimonialDots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.goToSlide(index);
        this.resetInterval();
      });
    });
    
    // Start automatic slider
    this.startInterval();
  }
  
  startInterval() {
    this.testimonialInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }
  
  resetInterval() {
    clearInterval(this.testimonialInterval);
    this.startInterval();
  }
  
  goToSlide(slideIndex) {
    // Remove active class from all slides and dots
    this.testimonialSlides.forEach(slide => {
      slide.classList.remove('active');
      slide.style.opacity = 0;
    });
    this.testimonialDots.forEach(dot => dot.classList.remove('active'));
    
    // Add active class to current slide and dot
    this.currentSlide = slideIndex;
    this.testimonialSlides[slideIndex].classList.add('active');
    this.testimonialDots[slideIndex].classList.add('active');
    
    // Fade in the active slide
    setTimeout(() => {
      this.testimonialSlides[slideIndex].style.opacity = 1;
    }, 50);
  }
  
  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.testimonialSlides.length;
    this.goToSlide(this.currentSlide);
  }
  
  // Parallax effect on scroll
  initParallax() {
    // Initial position
    this.updateParallaxPositions();
    
    // Update on scroll
    window.addEventListener('scroll', () => {
      this.updateParallaxPositions();
    });
  }
  
  updateParallaxPositions() {
    this.parallaxElements.forEach(element => {
      const speed = element.getAttribute('data-parallax-speed') / 10 || 0.5;
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Only apply parallax if element is in view
      if (rect.top < viewportHeight && rect.bottom > 0) {
        // Calculate how far the element is from the center of the viewport (as a percentage)
        const centerOffset = ((rect.top + rect.height / 2) - viewportHeight / 2) / viewportHeight;
        
        // Apply transform based on offset and speed
        const translateY = centerOffset * speed * 100;
        element.style.transform = `translateY(${translateY}px)`;
      }
    });
  }
  
  // Staggered animations
  initStaggeredAnimations() {
    // Initial animation
    this.staggeredContainers.forEach(container => {
      this.setupIntersectionObserver(container);
    });
  }
  
  setupIntersectionObserver(container) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.animateStaggeredItems(container);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2
      }
    );
    
    observer.observe(container);
  }
  
  animateStaggeredItems(container) {
    const items = container.querySelectorAll('.feature-item');
    
    items.forEach((item, index) => {
      // Remove any existing animation classes
      item.classList.remove('animated');
      
      // Add animation class with delay based on index
      setTimeout(() => {
        item.classList.add('animated');
      }, 150 * index);
    });
  }
}

// Initialize the services functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.services-tabs')) {
    window.ServicesController = new ServicesController();
  }
  
  // Add CSS transition to tab content for smooth transitions
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    content.style.transition = 'opacity 0.5s ease';
    
    // Set initial opacity for non-active tabs
    if (!content.classList.contains('active')) {
      content.style.opacity = 0;
    }
  });
});