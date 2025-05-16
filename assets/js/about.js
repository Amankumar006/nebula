/*
 * Nebula - About Page JS
 * Specific functionality for the About page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all About page specific functionality
    initStatsCounter();
    initTeamHoverEffects();
    initStoryAnimation();
    initValuesAnimation();
    
    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
        // Add additional observers specific to About page
        observeElements();
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        document.querySelectorAll('.animate-on-scroll').forEach(function(element) {
            element.classList.add('animated');
        });
    }
});

// Stats counter animation
function initStatsCounter() {
    const stats = document.querySelectorAll('.stat-number');
    let animated = false;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animated = true;
                stats.forEach(stat => {
                    const targetValue = parseInt(stat.getAttribute('data-count'));
                    animateCounter(stat, targetValue);
                });
            }
        });
    }, { threshold: 0.5 });
    
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        observer.observe(statsSection);
    }
}

// Animate number counting up
function animateCounter(element, target) {
    let count = 0;
    const duration = 2000; // 2 seconds
    const increment = Math.ceil(target / (duration / 30)); // Update every 30ms
    
    const timer = setInterval(() => {
        count += increment;
        if (count > target) {
            count = target;
            clearInterval(timer);
        }
        element.textContent = count;
    }, 30);
}

// Team member hover effects
function initTeamHoverEffects() {
    const teamMembers = document.querySelectorAll('.team-member');
    
    teamMembers.forEach(member => {
        member.addEventListener('mouseenter', () => {
            // Add class for hover effect
            member.classList.add('team-hover');
            
            // Add magnetic effect to social links
            const socialLinks = member.querySelectorAll('.social-link');
            socialLinks.forEach(link => {
                link.addEventListener('mousemove', magneticEffect);
                link.addEventListener('mouseleave', resetMagneticEffect);
            });
        });
        
        member.addEventListener('mouseleave', () => {
            member.classList.remove('team-hover');
        });
    });
}

// Magnetic effect for elements
function magneticEffect(event) {
    const target = event.currentTarget;
    const boundingRect = target.getBoundingClientRect();
    const x = event.clientX - boundingRect.left - boundingRect.width / 2;
    const y = event.clientY - boundingRect.top - boundingRect.height / 2;
    
    target.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
}

function resetMagneticEffect(event) {
    event.currentTarget.style.transform = '';
}

// Story section scroll animation
function initStoryAnimation() {
    const storySection = document.querySelector('.story-section');
    if (!storySection) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                storySection.classList.add('story-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    
    observer.observe(storySection);
}

// Values section animation
function initValuesAnimation() {
    const valueCards = document.querySelectorAll('.value-card');
    
    valueCards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
        
        // Add hover animation to icons
        const icon = card.querySelector('.value-icon');
        if (icon) {
            card.addEventListener('mouseenter', () => {
                icon.classList.add('icon-pulse');
            });
            
            card.addEventListener('mouseleave', () => {
                icon.classList.remove('icon-pulse');
            });
        }
    });
}

// Additional IntersectionObserver for about page elements
function observeElements() {
    const elements = document.querySelectorAll('.story-image, .story-content, .team-member, .stat-box, .partner-logo');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });
    
    elements.forEach(element => {
        observer.observe(element);
    });
}