# Nebula - Interactive Digital Portfolio

![Nebula Background](/assets/img/nebula-bg.jpg)

Nebula is a cutting-edge interactive portfolio website featuring advanced animations, WebGL effects, and responsive design. This project showcases the latest frontend technologies including fluid simulations, particle systems, and interactive UI elements that respond to user interactions.

## Features

### WebGL Background Elements
- **Advanced Particle System**: 3D interactive particles with depth perception, connections, and mouse interactions
- **Fluid Simulation**: Physics-based fluid dynamics that respond to user movements and page interactions
- **Interactive Elements**: Special effects triggered by hovering over projects and UI elements

### UI/UX Design
- Responsive layout optimized for all devices
- Custom animated cursors that respond to interactive elements
- Smooth page transitions and scroll-based animations
- 3D tilt effects on project cards

### Pages
- **Home**: Feature showcase with interactive elements
- **Portfolio**: Project grid with detailed project pages
- **Services**: Service offerings with interactive sections
- **About**: Team information and company story
- **Contact**: Interactive contact form with map integration

## Technology Stack

- **HTML5/CSS3**: Modern markup and styling
- **JavaScript**: ES6+ for interactive features
- **WebGL**: Hardware-accelerated graphics for particles and fluid simulations
- **CSS Animations**: Subtle animations for UI elements
- **Responsive Design**: Mobile-first approach
- **Map Integration**: Interactive location map

## Project Structure

```
nebula/
├── index.html               # Homepage
├── portfolio.html           # Portfolio showcase
├── services.html            # Services offered
├── about.html               # About the team
├── contact.html             # Contact information and form
├── assets/
│   ├── css/                 # Stylesheets
│   │   ├── main.css         # Core styles
│   │   ├── animations.css   # Animation definitions
│   │   ├── cursor.css       # Custom cursor styles
│   │   └── responsive.css   # Media queries
│   ├── js/                  # JavaScript files
│   │   ├── main.js          # Core functionality
│   │   ├── webgl-particles.js # WebGL particle system
│   │   ├── fluid-simulation.js # WebGL fluid physics
│   │   ├── particles.js     # Basic canvas particles
│   │   ├── animations.js    # Animation controllers
│   │   ├── cursor.js        # Custom cursor functionality
│   │   ├── transitions.js   # Page transition effects
│   │   ├── portfolio.js     # Portfolio specific scripts
│   │   ├── services.js      # Services page functionality
│   │   ├── about.js         # About page functionality
│   │   └── contact.js       # Contact form and map integration
│   └── img/                 # Image assets
│       ├── portfolio/       # Portfolio images
│       └── team/            # Team member photos
└── fonts/                   # Custom fonts
```

## WebGL Features

### Particle System
The custom WebGL particle system creates an immersive background effect:
- 3D particle positioning with depth perception
- Dynamic connections between nearby particles
- Interaction with mouse movements and clicks
- Special burst effects on user interactions

### Fluid Simulation
The physics-based fluid simulation creates flowing, organic visuals:
- Navier-Stokes equations for realistic fluid dynamics
- Velocity, pressure, and density calculations
- Vorticity confinement for natural swirls
- Interactive splats that respond to user actions
- Bloom shading effects for enhanced visual appeal

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome for Android)

## Performance Considerations

The WebGL effects are optimized for performance:
- Automatic downsampling on lower-end devices
- Reduced particle count on mobile devices
- Limited connections between particles
- Optimized shader compilation

## Credits

- Fonts: Inter, Montserrat, Playfair Display (Google Fonts)
- Fluid simulation inspired by Pavel Dobryakov's work (MIT License)
- Leaflet.js for map integration

## License

MIT License - See LICENSE file for details

---

© 2025 Nebula. All rights reserved.
