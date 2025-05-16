/**
 * Nebula - WebGL Particles System
 * Advanced particle effects using WebGL for background animations
 */

class WebGLParticles {
    constructor(options = {}) {
        this.options = Object.assign({
            container: document.body,
            particleCount: 1000,
            particleSize: 2.0,
            color: [0.5, 0.8, 1.0],
            speed: 0.5,
            connectParticles: true,
            maxConnections: 3,
            connectionDistance: 150,
            responsive: true
        }, options);
        
        // Create canvas and get WebGL context
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'webgl-particles';
        this.canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: -1;';
        this.options.container.appendChild(this.canvas);
        
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }
        
        // Initialize
        this.particles = [];
        this.width = 0;
        this.height = 0;
        this.aspectRatio = 1;
        this.mouse = { x: 0, y: 0, moving: false };
        
        this.init();
        this.animate();
        
        // Make available globally
        window.particleSystem = this;
    }
    
    init() {
        this.createShaders();
        this.createParticles();
        this.resize();
        this.setupEventListeners();
    }
    
    createShaders() {
        // Vertex shader program
        const vsSource = `
            attribute vec4 aVertexPosition;
            attribute vec4 aVertexColor;
            
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform float uPointSize;
            
            varying lowp vec4 vColor;
            
            void main(void) {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
                gl_PointSize = uPointSize;
                vColor = aVertexColor;
            }
        `;
        
        // Fragment shader program
        const fsSource = `
            precision mediump float;
            varying lowp vec4 vColor;
            
            void main(void) {
                float distance = distance(gl_PointCoord, vec2(0.5, 0.5));
                if (distance > 0.5) {
                    discard;
                }
                float alpha = 1.0 - (distance * 2.0);
                gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
            }
        `;
        
        // Create shader program
        this.program = this.createProgram(vsSource, fsSource);
        
        // Get locations of attributes and uniforms
        this.programInfo = {
            program: this.program,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.program, 'aVertexPosition'),
                vertexColor: this.gl.getAttribLocation(this.program, 'aVertexColor'),
            },
            uniformLocations: {
                projectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix'),
                modelViewMatrix: this.gl.getUniformLocation(this.program, 'uModelViewMatrix'),
                pointSize: this.gl.getUniformLocation(this.program, 'uPointSize'),
            },
        };
        
        // Create buffers
        this.positionBuffer = this.gl.createBuffer();
        this.colorBuffer = this.gl.createBuffer();
    }
    
    createProgram(vsSource, fsSource) {
        const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);
        
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Unable to initialize shader program: ' + this.gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }
    
    loadShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createParticles() {
        const { particleCount, color } = this.options;
        this.particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = {
                x: Math.random() * 2 - 1, // -1 to 1
                y: Math.random() * 2 - 1, // -1 to 1
                z: Math.random() * 2 - 1, // -1 to 1
                vx: (Math.random() - 0.5) * 0.01,
                vy: (Math.random() - 0.5) * 0.01,
                vz: (Math.random() - 0.5) * 0.01,
                color: [
                    color[0] + (Math.random() * 0.2 - 0.1),
                    color[1] + (Math.random() * 0.2 - 0.1),
                    color[2] + (Math.random() * 0.2 - 0.1),
                    Math.random() * 0.5 + 0.5
                ]
            };
            
            this.particles.push(particle);
        }
    }
    
    updateParticles() {
        const { speed } = this.options;
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // Update position
            p.x += p.vx * speed;
            p.y += p.vy * speed;
            p.z += p.vz * speed;
            
            // Bounce when edge is hit
            if (Math.abs(p.x) > 1) {
                p.vx = -p.vx;
            }
            
            if (Math.abs(p.y) > 1) {
                p.vy = -p.vy;
            }
            
            if (Math.abs(p.z) > 1) {
                p.vz = -p.vz;
            }
            
            // Mouse attraction
            if (this.mouse.moving) {
                const dx = p.x - (this.mouse.x * 2 - 1) * this.aspectRatio;
                const dy = p.y - (1 - this.mouse.y * 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 0.1) {
                    p.vx += dx * 0.01;
                    p.vy += dy * 0.01;
                }
            }
        }
    }
    
    render() {
        const gl = this.gl;
        
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Enable blending
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        
        // Create and bind position buffer
        const positions = [];
        this.particles.forEach(p => {
            positions.push(p.x, p.y, p.z);
        });
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        gl.vertexAttribPointer(
            this.programInfo.attribLocations.vertexPosition,
            3, // 3 components per vertex
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        
        // Create and bind color buffer
        const colors = [];
        this.particles.forEach(p => {
            colors.push(...p.color);
        });
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        gl.vertexAttribPointer(
            this.programInfo.attribLocations.vertexColor,
            4, // 4 components per color (RGBA)
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexColor);
        
        // Set shader uniforms
        const projectionMatrix = this.createPerspectiveMatrix(45, this.aspectRatio, 0.1, 100.0);
        const modelViewMatrix = this.createModelViewMatrix();
        
        gl.useProgram(this.programInfo.program);
        
        gl.uniformMatrix4fv(
            this.programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix
        );
        
        gl.uniformMatrix4fv(
            this.programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix
        );
        
        gl.uniform1f(
            this.programInfo.uniformLocations.pointSize,
            this.options.particleSize
        );
        
        // Draw points
        gl.drawArrays(gl.POINTS, 0, this.particles.length);
    }
    
    createPerspectiveMatrix(fieldOfViewInRadians, aspect, near, far) {
        const f = 1.0 / Math.tan(fieldOfViewInRadians / 2);
        const rangeInv = 1 / (near - far);
        
        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ];
    }
    
    createModelViewMatrix() {
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, -2.5, 1  // Position camera at z=-2.5
        ];
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.updateParticles();
        this.render();
    }
    
    resize() {
        const { responsive } = this.options;
        
        if (responsive) {
            this.width = this.canvas.width = window.innerWidth;
            this.height = this.canvas.height = window.innerHeight;
            this.aspectRatio = this.width / this.height;
            this.gl.viewport(0, 0, this.width, this.height);
        }
    }
    
    setupEventListeners() {
        window.addEventListener('resize', this.resize.bind(this));
        
        document.addEventListener('mousemove', (event) => {
            this.mouse.x = event.clientX / this.width;
            this.mouse.y = event.clientY / this.height;
            this.mouse.moving = true;
            
            // Reset moving flag after some time of no movement
            clearTimeout(this.mouseTimeout);
            this.mouseTimeout = setTimeout(() => {
                this.mouse.moving = false;
            }, 100);
        });
        
        document.addEventListener('touchmove', (event) => {
            if (event.touches.length > 0) {
                this.mouse.x = event.touches[0].clientX / this.width;
                this.mouse.y = event.touches[0].clientY / this.height;
                this.mouse.moving = true;
                
                // Reset moving flag after some time of no movement
                clearTimeout(this.mouseTimeout);
                this.mouseTimeout = setTimeout(() => {
                    this.mouse.moving = false;
                }, 100);
            }
        });
    }
    
    // Public method to create burst of particles at specific coordinates
    createBurst(x, y, count = 10) {
        const nx = (x / this.width) * 2 - 1;
        const ny = -((y / this.height) * 2 - 1);
        
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * this.particles.length);
            const p = this.particles[randomIndex];
            
            // Position at burst point
            p.x = nx * this.aspectRatio;
            p.y = ny;
            
            // Random velocity away from burst point
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.02 + Math.random() * 0.02;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            
            // Enhance color
            p.color[3] = 1.0; // Full opacity
        }
    }
}

// Export for use in other files
window.WebGLParticles = WebGLParticles;