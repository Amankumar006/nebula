/*
 * Nebula - Contact Page JS
 * Form validation, map integration, and interactive elements for the contact page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize contact page functionality
    initContactForm();
    initMapLocation();
    initFaqToggle();
    
    // Initialize WebGL background elements
    initWebGLElements();
    
    // Initialize animations for elements when they come into view
    if ('IntersectionObserver' in window) {
        observeElements();
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        document.querySelectorAll('.animate-on-scroll').forEach(function(element) {
            element.classList.add('animated');
        });
    }
});

// Initialize WebGL background elements
function initWebGLElements() {
    // Initialize WebGL Particles if the script exists
    if (window.WebGLParticles) {
        const particlesOptions = {
            particleCount: 1500,
            particleSize: 2.5,
            color: [0.5, 0.8, 1.0], // Light blue color that matches nebula theme
            speed: 0.35,
            connectParticles: true,
            maxConnections: 5,
            connectionDistance: 180,
        };
        
        window.nebulaParticles = new WebGLParticles(particlesOptions);
    }
    
    // Initialize Fluid Simulation if the script exists
    if (window.FluidSimulation) {
        const fluidOptions = {
            TEXTURE_DOWNSAMPLE: 1,
            DENSITY_DISSIPATION: 0.97,
            VELOCITY_DISSIPATION: 0.98,
            PRESSURE_DISSIPATION: 0.8,
            PRESSURE_ITERATIONS: 25,
            CURL: 22,
            SPLAT_RADIUS: 0.004,
            COLORFUL: true,
            BLOOM: true,
            BLOOM_INTENSITY: 0.7,
            BLOOM_THRESHOLD: 0.5,
            BLOOM_SOFT_KNEE: 0.7
        };
        
        window.nebulaFluid = new FluidSimulation(fluidOptions);
        
        // Add some initial splats to make the fluid simulation visible
        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                const x = Math.random() * window.innerWidth;
                const y = Math.random() * window.innerHeight;
                window.nebulaFluid.addSplat(
                    x, 
                    y, 
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01
                );
            }
        }, 100);
    }
    
    // Add interactions to link particles and fluid simulation with user interactions
    document.addEventListener('mousemove', function(e) {
        if (Math.random() < 0.1) { // Reduce frequency of fluid interactions for performance
            if (window.nebulaFluid) {
                window.nebulaFluid.addSplat(
                    e.clientX,
                    e.clientY,
                    (e.movementX || 0) * 0.001,
                    (e.movementY || 0) * 0.001
                );
            }
        }
    });
    
    // Add interaction to form submit button
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('mouseenter', function(e) {
            if (window.nebulaParticles) {
                window.nebulaParticles.createBurst(e.clientX, e.clientY, 20);
            }
            if (window.nebulaFluid) {
                window.nebulaFluid.createInteraction(e.clientX, e.clientY, 2.0);
            }
        });
    }
}

// Form validation and submission handling
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.querySelector('.form-success-message');
    const resetButton = document.getElementById('resetForm');
    
    if (!contactForm) return;
    
    // Form submission
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm(contactForm)) {
            // Normally we would submit the form to a backend here
            // For now, we'll just show the success message after a brief delay
            
            // Show loading state
            const submitBtn = contactForm.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn-text-inner">Sending...</span>';
            
            // Simulate form submission (replace with actual AJAX call in production)
            setTimeout(() => {
                formSuccess.classList.add('active');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span class="btn-text-inner">Send Message</span>';
            }, 1500);
        }
    });
    
    // Reset form after success
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            formSuccess.classList.remove('active');
            contactForm.reset();
        });
    }
    
    // Real-time validation for fields
    const fields = contactForm.querySelectorAll('input[required], textarea[required]');
    fields.forEach(field => {
        field.addEventListener('blur', function() {
            validateField(field);
        });
        
        field.addEventListener('input', function() {
            // If field was previously marked as error, check if it's valid now
            if (field.parentElement.classList.contains('error')) {
                validateField(field);
            }
        });
    });
}

// Validate a specific form field
function validateField(field) {
    const formGroup = field.parentElement;
    let errorElement = formGroup.querySelector('.error-message');
    
    // Create error message element if it doesn't exist
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        formGroup.appendChild(errorElement);
    }
    
    // Check field validity
    if (!field.validity.valid) {
        formGroup.classList.add('error');
        
        if (field.validity.valueMissing) {
            errorElement.textContent = 'This field is required.';
        } else if (field.validity.typeMismatch) {
            if (field.type === 'email') {
                errorElement.textContent = 'Please enter a valid email address.';
            } else {
                errorElement.textContent = 'Please enter a valid value.';
            }
        } else {
            errorElement.textContent = 'Please enter a valid value.';
        }
        
        return false;
    } else {
        formGroup.classList.remove('error');
        return true;
    }
}

// Validate entire form
function validateForm(form) {
    const requiredFields = form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    return isValid;
}

// Initialize the map with office location
function initMapLocation() {
    const mapElement = document.getElementById('map');
    
    if (!mapElement) return;
    
    // We're using Leaflet.js for the map (an open-source alternative to Google Maps)
    // Bangalore Technological Institute coordinates
    const lat = 12.9086;
    const lng = 77.6539;
    
    // Create the map with smoother zoom animation
    const map = L.map('map', {
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true
    }).setView([lat, lng], 15);
    
    // Use a dark theme map layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    // Create a fly-to animation when the map loads
    setTimeout(() => {
        map.flyTo([lat, lng], 16, {
            duration: 2,
            easeLinearity: 0.25
        });
    }, 800);
    
    // Custom marker with office location and dynamic pulse effect
    const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div class="marker-inner">
                <div class="marker-pulse"></div>
                <svg viewBox="0 0 24 24" width="32" height="32">
                    <path fill="currentColor" d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z" />
                </svg>
               </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    });
    
    // Add marker with bounce animation on add
    const marker = L.marker([lat, lng], { 
        icon: customIcon,
        bounceOnAdd: true,
        bounceOnAddOptions: {
            duration: 700,
            height: 40
        }
    }).addTo(map);
    
    // Add popup with office info
    const popup = `
        <div class="map-popup">
            <h3>Bangalore Technological Institute</h3>
            <p>Kodathi, Off Bangalore - Sarjapur Road<br>Bangalore East Taluk, Chikkakannalli<br>Bengaluru, Karnataka 560035</p>
            <a href="https://www.google.com/maps/dir//VMMX%2BWP7+Bangalore+Technological+Institute,+Kodathi,+Off+Bangalore+-+Sarjapur+Road,+Bangalore+East+Taluk,+Chikkakannalli,+Bengaluru,+Karnataka+560035/" target="_blank" class="btn-text">Get Directions</a>
        </div>
    `;
    
    marker.bindPopup(popup);
    
    // Make popup appear when the map element comes into view
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            setTimeout(() => {
                marker.openPopup();
                observer.unobserve(mapElement);
            }, 1200);
        }
    }, { threshold: 0.4 });
    
    observer.observe(mapElement);
    
    // Add zoom controls with custom positioning
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);
    
    // Make map interactive with click and drag effects
    map.on('click', function(e) {
        if (window.particleSystem) {
            window.particleSystem.createBurst(e.originalEvent.clientX, e.originalEvent.clientY, 8);
        }
        
        if (window.nebulaFluid) {
            window.nebulaFluid.createInteraction(e.originalEvent.clientX, e.originalEvent.clientY, 1.5);
        }
    });
    
    map.on('dragend', function() {
        if (window.nebulaFluid) {
            const center = map.getCenter();
            const point = map.latLngToContainerPoint(center);
            window.nebulaFluid.createInteraction(point.x, point.y, 2.0);
        }
    });
    
    // Adjust map on window resize for better responsiveness
    window.addEventListener('resize', function() {
        map.invalidateSize();
    });
}

// FAQ toggle functionality
function initFaqToggle() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Check if this item is already active
            const isActive = item.classList.contains('active');
            
            // Close all FAQs
            faqItems.forEach(faq => {
                faq.classList.remove('active');
            });
            
            // If the clicked item wasn't active, open it
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// Observe elements for scroll animations
function observeElements() {
    const elements = document.querySelectorAll('.animate-on-scroll, .info-box, .contact-form-container, .contact-map, .faq-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
                
                // Create fluid and particle effects when elements come into view
                if (window.nebulaFluid) {
                    const rect = entry.target.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    window.nebulaFluid.createInteraction(centerX, centerY, 1.0);
                }
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    elements.forEach(element => {
        observer.observe(element);
    });
}

// Add styles for custom map marker
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .custom-map-marker {
            background: none !important;
        }
        
        .marker-inner {
            color: var(--color-secondary);
            animation: pulse 1.5s infinite;
        }
        
        .map-popup {
            text-align: center;
            padding: 5px;
            font-family: var(--font-body);
        }
        
        .map-popup h3 {
            margin-bottom: 5px;
            font-family: var(--font-heading);
            font-size: 16px;
        }
        
        .map-popup p {
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .leaflet-popup-content-wrapper {
            border-radius: 10px;
            background-color: #252525;
            color: #f9f9f9;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        
        .leaflet-popup-tip {
            background-color: #252525;
        }
        
        /* WebGL background element styles */
        .webgl-particles, 
        .fluid-simulation {
            pointer-events: none;
        }
    </style>
`);