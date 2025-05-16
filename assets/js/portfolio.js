/**
 * Nebula - Portfolio Functionality
 * Handles project filtering, modals, and gallery interactions
 */

class PortfolioController {
  constructor() {
    // Filter elements
    this.filterButtons = document.querySelectorAll('.filter-btn');
    this.portfolioItems = document.querySelectorAll('.portfolio-item');
    
    // Modal elements
    this.modalTriggers = document.querySelectorAll('.portfolio-modal-trigger');
    this.modalContainer = document.querySelector('.project-modal-container');
    this.modals = document.querySelectorAll('.project-modal');
    this.modalCloseButtons = document.querySelectorAll('.modal-close');
    
    // Gallery elements (will be set when modal opens)
    this.activeGallery = null;
    this.activeGalleryMain = null;
    this.activeGalleryThumbs = null;
    
    this.init();
  }
  
  init() {
    // Initialize portfolio filtering
    this.initFiltering();
    
    // Initialize portfolio modals
    this.initModals();
  }
  
  initFiltering() {
    // Add click event to filter buttons
    this.filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        this.filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get filter value
        const filterValue = button.getAttribute('data-filter');
        
        // Filter items
        this.filterItems(filterValue);
      });
    });
  }
  
  filterItems(filterValue) {
    // Show/hide items based on filter value
    this.portfolioItems.forEach(item => {
      const categories = item.getAttribute('data-category');
      
      // Reset animation classes for re-animation
      item.classList.remove('animated');
      
      // Short timeout before applying animations again
      setTimeout(() => {
        if (filterValue === 'all' || categories.includes(filterValue)) {
          item.style.display = 'block';
          
          // Animate items after filter
          setTimeout(() => {
            item.classList.add('animated');
          }, 50);
        } else {
          item.style.display = 'none';
        }
      }, 300);
    });
    
    // Animate layout change with FLIP animation technique
    this.animateLayoutChange();
  }
  
  animateLayoutChange() {
    // First: measure the current positions of items
    const itemPositions = Array.from(this.portfolioItems)
      .filter(item => item.style.display !== 'none')
      .map(item => {
        const rect = item.getBoundingClientRect();
        return { 
          item, 
          rect: { top: rect.top, left: rect.left }
        };
      });
    
    // Last: Let items flow to their new positions
    requestAnimationFrame(() => {
      // Invert: Calculate the differences and apply transforms
      itemPositions.forEach(({ item, rect }) => {
        const newRect = item.getBoundingClientRect();
        const deltaX = rect.left - newRect.left;
        const deltaY = rect.top - newRect.top;
        
        if (deltaX !== 0 || deltaY !== 0) {
          item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          
          // Play: Animate to remove the transforms
          requestAnimationFrame(() => {
            item.style.transition = 'transform 0.5s cubic-bezier(0.26, 0.86, 0.44, 0.985)';
            item.style.transform = 'translate(0, 0)';
            
            // Clear transition after animation
            item.addEventListener('transitionend', () => {
              item.style.transition = '';
            }, { once: true });
          });
        }
      });
    });
  }
  
  initModals() {
    // Open modal
    this.modalTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        
        const modalId = trigger.getAttribute('href');
        const modal = document.querySelector(modalId);
        
        if (modal) {
          this.openModal(modal);
        }
      });
    });
    
    // Close modal with close button
    this.modalCloseButtons.forEach(button => {
      button.addEventListener('click', () => {
        const modal = button.closest('.project-modal');
        this.closeModal(modal);
      });
    });
    
    // Close modal when clicking outside
    this.modals.forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });
    
    // Close modal with escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.querySelector('.project-modal.active')) {
        this.closeModal(document.querySelector('.project-modal.active'));
      }
    });
  }
  
  openModal(modal) {
    // Close any open modal first
    const activeModal = document.querySelector('.project-modal.active');
    if (activeModal) {
      this.closeModal(activeModal);
    }
    
    // Open the modal
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    
    // Initialize gallery if present
    this.initGallery(modal);
    
    // Add animation class to modal content
    const modalContent = modal.querySelector('.modal-content');
    modalContent.classList.add('animate-modal');
  }
  
  closeModal(modal) {
    // Add closing animation
    const modalContent = modal.querySelector('.modal-content');
    modalContent.classList.add('animate-modal-out');
    
    // Remove modal after animation
    setTimeout(() => {
      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
      
      // Reset animation classes
      modalContent.classList.remove('animate-modal', 'animate-modal-out');
    }, 500);
  }
  
  initGallery(modal) {
    // Set active gallery elements
    this.activeGalleryMain = modal.querySelector('.gallery-main img');
    this.activeGalleryThumbs = modal.querySelectorAll('.gallery-thumbs img');
    
    // Add click event to thumbnails
    if (this.activeGalleryThumbs.length > 0) {
      this.activeGalleryThumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
          // Get large image URL
          const largeImageSrc = thumb.getAttribute('src').replace('-thumb', '-full');
          
          // Create image element
          const newImage = new Image();
          newImage.src = largeImageSrc;
          newImage.alt = thumb.alt;
          
          // Create animation for image transition
          this.activeGalleryMain.style.opacity = '0';
          
          // When new image is loaded
          newImage.onload = () => {
            setTimeout(() => {
              // Replace image
              this.activeGalleryMain.src = largeImageSrc;
              this.activeGalleryMain.alt = thumb.alt;
              
              // Fade in
              this.activeGalleryMain.style.opacity = '1';
            }, 300);
          };
          
          // Remove active class from all thumbs
          this.activeGalleryThumbs.forEach(t => t.classList.remove('active'));
          
          // Add active class to clicked thumb
          thumb.classList.add('active');
        });
      });
      
      // Set first thumb as active
      this.activeGalleryThumbs[0].classList.add('active');
    }
  }
}

// Initialize the portfolio functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.portfolio-items')) {
    window.PortfolioController = new PortfolioController();
  }
});