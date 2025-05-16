/**
 * Nebula - WebGL Fluid Simulation
 * Physics-based fluid animation for background effects
 * Based on Pavel Dobryakov's fluid simulation (MIT License)
 */

class FluidSimulation {
    constructor(options = {}) {
        this.options = Object.assign({
            container: document.body,
            TEXTURE_DOWNSAMPLE: 1,
            DENSITY_DISSIPATION: 0.98,
            VELOCITY_DISSIPATION: 0.99,
            PRESSURE_DISSIPATION: 0.8,
            PRESSURE_ITERATIONS: 25,
            CURL: 30,
            SPLAT_RADIUS: 0.005,
            SPLAT_FORCE: 6000,
            SHADING: true,
            COLORFUL: true,
            PAUSED: false,
            BACK_COLOR: { r: 0, g: 0, b: 0 },
            TRANSPARENT: true,
            BLOOM: true,
            BLOOM_ITERATIONS: 8,
            BLOOM_RESOLUTION: 256,
            BLOOM_INTENSITY: 0.8,
            BLOOM_THRESHOLD: 0.6,
            BLOOM_SOFT_KNEE: 0.7
        }, options);
        
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'fluid-simulation';
        this.canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: -2;';
        this.options.container.prepend(this.canvas);
        
        this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }
        
        const { gl } = this;
        this.ext = {
            formatRGBA: gl.getExtension('EXT_sRGB') ? gl.SRGB8_ALPHA8 : gl.RGBA,
            formatRG: gl.getExtension('EXT_color_buffer_half_float') ? gl.RG16F : gl.RGBA,
            formatR: gl.getExtension('OES_texture_half_float') ? gl.R16F : gl.RGBA,
            halfFloatTexType: gl.getExtension('OES_texture_half_float') ? gl.HALF_FLOAT_OES : gl.UNSIGNED_BYTE,
            supportLinearFiltering: gl.getExtension('OES_texture_half_float_linear') !== null
        };
        
        this.width = 0;
        this.height = 0;
        this.pointers = [];
        this.splatStack = [];
        this.bloomFramebuffers = [];
        
        this.init();
        this.lastUpdateTime = Date.now();
        this.colorUpdateTimer = 0;
        
        // Make available globally
        window.fluidSimulation = this;
    }
    
    init() {
        this.resizeCanvas();
        this.compileShaders();
        this.initFramebuffers();
        this.initBloomFramebuffers();
        this.setupEventListeners();
        this.update();
    }
    
    compileShaders() {
        const gl = this.gl;
        
        // Base vertex shader for all programs
        const baseVertexShaderSource = `
            precision highp float;
            attribute vec2 aPosition;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform vec2 texelSize;
            void main () {
                vUv = aPosition * 0.5 + 0.5;
                vL = vUv - vec2(texelSize.x, 0.0);
                vR = vUv + vec2(texelSize.x, 0.0);
                vT = vUv + vec2(0.0, texelSize.y);
                vB = vUv - vec2(0.0, texelSize.y);
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }
        `;
        
        // Create various shader programs
        const shaderSources = {
            clearShader: {
                fragment: `
                    precision mediump float;
                    precision mediump sampler2D;
                    varying highp vec2 vUv;
                    uniform sampler2D uTexture;
                    uniform float value;
                    void main () {
                        gl_FragColor = value * texture2D(uTexture, vUv);
                    }
                `
            },
            
            displayShader: {
                fragment: `
                    precision highp float;
                    precision highp sampler2D;
                    varying vec2 vUv;
                    uniform sampler2D uTexture;
                    void main () {
                        vec3 C = texture2D(uTexture, vUv).rgb;
                        float a = max(C.r, max(C.g, C.b));
                        gl_FragColor = vec4(C, a);
                    }
                `
            },
            
            bloomPrefilterShader: {
                fragment: `
                    precision mediump float;
                    precision mediump sampler2D;
                    varying vec2 vUv;
                    uniform sampler2D uTexture;
                    uniform vec3 curve;
                    uniform float threshold;
                    void main () {
                        vec3 c = texture2D(uTexture, vUv).rgb;
                        float br = max(c.r, max(c.g, c.b));
                        float rq = clamp(br - curve.x, 0.0, curve.y);
                        rq = curve.z * rq * rq;
                        c *= max(rq, br - threshold) / max(br, 0.0001);
                        gl_FragColor = vec4(c, 0.0);
                    }
                `
            },
            
            bloomBlurShader: {
                fragment: `
                    precision mediump float;
                    precision mediump sampler2D;
                    varying vec2 vL;
                    varying vec2 vR;
                    varying vec2 vT;
                    varying vec2 vB;
                    uniform sampler2D uTexture;
                    void main () {
                        vec4 sum = vec4(0.0);
                        sum += texture2D(uTexture, vL);
                        sum += texture2D(uTexture, vR);
                        sum += texture2D(uTexture, vT);
                        sum += texture2D(uTexture, vB);
                        sum *= 0.25;
                        gl_FragColor = sum;
                    }
                `
            },
            
            bloomFinalShader: {
                fragment: `
                    precision mediump float;
                    precision mediump sampler2D;
                    varying vec2 vUv;
                    uniform sampler2D uTexture;
                    uniform float intensity;
                    void main () {
                        vec3 c = texture2D(uTexture, vUv).rgb;
                        gl_FragColor = vec4(c * intensity, 1.0);
                    }
                `
            },
            
            splatShader: {
                fragment: `
                    precision highp float;
                    precision highp sampler2D;
                    varying vec2 vUv;
                    uniform sampler2D uTarget;
                    uniform float aspectRatio;
                    uniform vec3 color;
                    uniform vec2 point;
                    uniform float radius;
                    void main () {
                        vec2 p = vUv - point.xy;
                        p.x *= aspectRatio;
                        vec3 splat = exp(-dot(p, p) / radius) * color;
                        vec3 base = texture2D(uTarget, vUv).xyz;
                        gl_FragColor = vec4(base + splat, 1.0);
                    }
                `
            },
            
            advectionShader: {
                fragment: `
                    precision highp float;
                    precision highp sampler2D;
                    varying vec2 vUv;
                    uniform sampler2D uVelocity;
                    uniform sampler2D uSource;
                    uniform vec2 texelSize;
                    uniform float dt;
                    uniform float dissipation;
                    void main () {
                        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                        gl_FragColor = dissipation * texture2D(uSource, coord);
                        gl_FragColor.a = 1.0;
                    }
                `
            },
            
            divergenceShader: {
                fragment: `
                    precision mediump float;
                    precision mediump sampler2D;
                    varying highp vec2 vUv;
                    varying highp vec2 vL;
                    varying highp vec2 vR;
                    varying highp vec2 vT;
                    varying highp vec2 vB;
                    uniform sampler2D uVelocity;
                    void main () {
                        float L = texture2D(uVelocity, vL).x;
                        float R = texture2D(uVelocity, vR).x;
                        float T = texture2D(uVelocity, vT).y;
                        float B = texture2D(uVelocity, vB).y;
                        vec2 C = texture2D(uVelocity, vUv).xy;
                        float div = 0.5 * (R - L + T - B);
                        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
                    }
                `
            },
            
            curlShader: {
                fragment: `
                    precision mediump float;
                    precision mediump sampler2D;
                    varying highp vec2 vUv;
                    varying highp vec2 vL;
                    varying highp vec2 vR;
                    varying highp vec2 vT;
                    varying highp vec2 vB;
                    uniform sampler2D uVelocity;
                    void main () {
                        float L = texture2D(uVelocity, vL).y;
                        float R = texture2D(uVelocity, vR).y;
                        float T = texture2D(uVelocity, vT).x;
                        float B = texture2D(uVelocity, vB).x;
                        float vorticity = R - L - T + B;
                        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
                    }
                `
            },
            
            vorticityShader: {
                fragment: `
                    precision highp float;
                    precision highp sampler2D;
                    varying vec2 vUv;
                    varying vec2 vL;
                    varying vec2 vR;
                    varying vec2 vT;
                    varying vec2 vB;
                    uniform sampler2D uVelocity;
                    uniform sampler2D uCurl;
                    uniform float curl;
                    uniform float dt;
                    void main () {
                        float L = texture2D(uCurl, vL).x;
                        float R = texture2D(uCurl, vR).x;
                        float T = texture2D(uCurl, vT).x;
                        float B = texture2D(uCurl, vB).x;
                        float C = texture2D(uCurl, vUv).x;
                        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
                        force /= length(force) + 0.0001;
                        force *= curl * C;
                        force.y *= -1.0;
                        vec2 velocity = texture2D(uVelocity, vUv).xy;
                        velocity += force * dt;
                        velocity = min(max(velocity, -1000.0), 1000.0);
                        gl_FragColor = vec4(velocity, 0.0, 1.0);
                    }
                `
            },
            
            pressureShader: {
                fragment: `
                    precision mediump float;
                    precision mediump sampler2D;
                    varying highp vec2 vUv;
                    varying highp vec2 vL;
                    varying highp vec2 vR;
                    varying highp vec2 vT;
                    varying highp vec2 vB;
                    uniform sampler2D uPressure;
                    uniform sampler2D uDivergence;
                    void main () {
                        float L = texture2D(uPressure, vL).x;
                        float R = texture2D(uPressure, vR).x;
                        float T = texture2D(uPressure, vT).x;
                        float B = texture2D(uPressure, vB).x;
                        float C = texture2D(uPressure, vUv).x;
                        float divergence = texture2D(uDivergence, vUv).x;
                        float pressure = (L + R + B + T - divergence) * 0.25;
                        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
                    }
                `
            },
            
            gradientSubtractShader: {
                fragment: `
                    precision mediump float;
                    precision mediump sampler2D;
                    varying highp vec2 vUv;
                    varying highp vec2 vL;
                    varying highp vec2 vR;
                    varying highp vec2 vT;
                    varying highp vec2 vB;
                    uniform sampler2D uPressure;
                    uniform sampler2D uVelocity;
                    void main () {
                        float L = texture2D(uPressure, vL).x;
                        float R = texture2D(uPressure, vR).x;
                        float T = texture2D(uPressure, vT).x;
                        float B = texture2D(uPressure, vB).x;
                        vec2 velocity = texture2D(uVelocity, vUv).xy;
                        velocity.xy -= vec2(R - L, T - B) * 0.5;
                        gl_FragColor = vec4(velocity, 0.0, 1.0);
                    }
                `
            }
        };
        
        // Compile all shaders
        this.programs = {};
        for (const name in shaderSources) {
            const source = shaderSources[name];
            this.programs[name] = this.createProgram(baseVertexShaderSource, source.fragment);
        }
        
        // Create a quad to render to
        this.quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        // Create and compile vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
            throw gl.getShaderInfoLog(vertexShader);
        
        // Create and compile fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
            throw gl.getShaderInfoLog(fragmentShader);
        
        // Create shader program
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            throw gl.getProgramInfoLog(program);
        
        // Create uniforms map
        const uniforms = {};
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            const uniform = gl.getActiveUniform(program, i);
            uniforms[uniform.name] = gl.getUniformLocation(program, uniform.name);
        }
        
        return {
            program,
            uniforms
        };
    }
    
    createTexture(format, type, width, height, filter) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0);
        
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter || gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, gl.RGBA, type, null);
        
        return texture;
    }
    
    createFBO(width, height, format, type, filter) {
        const gl = this.gl;
        
        const texture = this.createTexture(format, type, width, height, filter);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        
        return {
            fbo,
            texture
        };
    }
    
    initFramebuffers() {
        const gl = this.gl;
        const simRes = this.getResolution(this.options.TEXTURE_DOWNSAMPLE);
        const dyeRes = this.getResolution(1);
        
        this.textureWidth = dyeRes.width;
        this.textureHeight = dyeRes.height;
        
        const texType = this.ext.halfFloatTexType;
        const formatRGBA = this.ext.formatRGBA;
        const formatRG = this.ext.formatRG;
        const formatR = this.ext.formatR;
        
        gl.disable(gl.BLEND);
        
        // Velocity framebuffer
        this.velocity = this.createDoubleFBO(simRes.width, simRes.height, formatRG, texType, 
            this.ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST);
        
        // Divergence framebuffer
        this.divergence = this.createFBO(simRes.width, simRes.height, formatR, texType, gl.NEAREST);
        
        // Curl framebuffer
        this.curl = this.createFBO(simRes.width, simRes.height, formatR, texType, gl.NEAREST);
        
        // Pressure framebuffer
        this.pressure = this.createDoubleFBO(simRes.width, simRes.height, formatR, texType, gl.NEAREST);
        
        // Dye framebuffer
        this.dye = this.createDoubleFBO(dyeRes.width, dyeRes.height, formatRGBA, texType,
            this.ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST);
    }
    
    createDoubleFBO(width, height, format, type, filter) {
        let fbo1 = this.createFBO(width, height, format, type, filter);
        let fbo2 = this.createFBO(width, height, format, type, filter);
        
        return {
            read: fbo1,
            write: fbo2,
            swap() {
                let temp = this.read;
                this.read = this.write;
                this.write = temp;
            }
        };
    }
    
    getResolution(scale) {
        const aspectRatio = this.width / this.height;
        return {
            width: Math.round(this.width / scale),
            height: Math.round(this.height / scale)
        };
    }
    
    initBloomFramebuffers() {
        if (!this.options.BLOOM) return;
        
        const gl = this.gl;
        
        const texType = this.ext.halfFloatTexType;
        const formatRGBA = this.ext.formatRGBA;
        
        const filterStrength = this.options.BLOOM_ITERATIONS;
        const knee = this.options.BLOOM_THRESHOLD * this.options.BLOOM_SOFT_KNEE + 0.0001;
        const curve0 = this.options.BLOOM_THRESHOLD - knee;
        const curve1 = knee * 2;
        const curve2 = 0.25 / knee;
        
        this.bloomPrefilterProgram = this.programs.bloomPrefilterShader;
        this.bloomBlurProgram = this.programs.bloomBlurShader;
        this.bloomFinalProgram = this.programs.bloomFinalShader;
        
        gl.uniform3f(this.bloomPrefilterProgram.uniforms.curve, curve0, curve1, curve2);
        gl.uniform1f(this.bloomPrefilterProgram.uniforms.threshold, this.options.BLOOM_THRESHOLD);
        gl.uniform1f(this.bloomFinalProgram.uniforms.intensity, this.options.BLOOM_INTENSITY);
        
        // Initialize bloom framebuffers
        const bloomRes = this.getResolution(this.options.BLOOM_RESOLUTION);
        const bloomWidth = bloomRes.width;
        const bloomHeight = bloomRes.height;
        
        this.bloomFramebuffers = [];
        for (let i = 0; i < filterStrength; i++) {
            const width = bloomWidth >> i;
            const height = bloomHeight >> i;
            
            if (width < 2 || height < 2) break;
            
            const fbo1 = this.createFBO(width, height, formatRGBA, texType, gl.LINEAR);
            const fbo2 = this.createFBO(width, height, formatRGBA, texType, gl.LINEAR);
            
            this.bloomFramebuffers.push({
                width, height, 
                texelSizeX: 1.0 / width,
                texelSizeY: 1.0 / height,
                read: fbo1,
                write: fbo2,
                swap() {
                    const temp = this.read;
                    this.read = this.write;
                    this.write = temp;
                }
            });
        }
    }
    
    setupEventListeners() {
        window.addEventListener('resize', this.resizeCanvas.bind(this));
    }
    
    resizeCanvas() {
        const { canvas } = this;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Re-initialize framebuffers if they exist
        if (this.velocity && this.velocity.read) {
            this.initFramebuffers();
            this.initBloomFramebuffers();
        }
    }
    
    update() {
        const dt = Math.min((Date.now() - this.lastUpdateTime) / 1000, 0.016);
        this.lastUpdateTime = Date.now();
        
        this.colorUpdateTimer += dt;
        if (this.colorUpdateTimer >= 0.1) {
            this.colorUpdateTimer = 0;
            this.pointers.forEach(p => {
                if (p.moved) {
                    p.moved = false;
                } else {
                    p.down = false;
                }
            });
        }
        
        if (!this.options.PAUSED) {
            this.step(dt);
        }
        
        this.render();
        
        requestAnimationFrame(this.update.bind(this));
    }
    
    step(dt) {
        const gl = this.gl;
        
        // Update velocity
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);
        
        // Handle splatting
        this.splatStack.forEach(splat => {
            this.splat(splat.x, splat.y, splat.dx, splat.dy, splat.color);
        });
        this.splatStack.length = 0;
        
        // Create random splats occasionally
        if (Math.random() < 0.01) {
            const color = this.generateColor();
            const x = Math.random();
            const y = Math.random();
            const dx = (Math.random() - 0.5) * 0.01;
            const dy = (Math.random() - 0.5) * 0.01;
            this.splat(x, y, dx, dy, color);
        }
        
        // Advect velocity
        const velocityProgram = this.programs.advectionShader;
        gl.useProgram(velocityProgram.program);
        gl.uniform2f(velocityProgram.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        gl.uniform1i(velocityProgram.uniforms.uVelocity, this.velocity.read.texture);
        gl.uniform1i(velocityProgram.uniforms.uSource, this.velocity.read.texture);
        gl.uniform1f(velocityProgram.uniforms.dt, dt);
        gl.uniform1f(velocityProgram.uniforms.dissipation, this.options.VELOCITY_DISSIPATION);
        this.blit(this.velocity.write.fbo);
        this.velocity.swap();
        
        // Advect dye
        gl.useProgram(velocityProgram.program);
        gl.uniform2f(velocityProgram.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        gl.uniform1i(velocityProgram.uniforms.uVelocity, this.velocity.read.texture);
        gl.uniform1i(velocityProgram.uniforms.uSource, this.dye.read.texture);
        gl.uniform1f(velocityProgram.uniforms.dt, dt);
        gl.uniform1f(velocityProgram.uniforms.dissipation, this.options.DENSITY_DISSIPATION);
        this.blit(this.dye.write.fbo);
        this.dye.swap();
        
        // Vorticity computation
        const curlProgram = this.programs.curlShader;
        gl.useProgram(curlProgram.program);
        gl.uniform2f(curlProgram.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        gl.uniform1i(curlProgram.uniforms.uVelocity, this.velocity.read.texture);
        this.blit(this.curl.fbo);
        
        // Vorticity confinement
        const vorticityProgram = this.programs.vorticityShader;
        gl.useProgram(vorticityProgram.program);
        gl.uniform2f(vorticityProgram.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        gl.uniform1i(vorticityProgram.uniforms.uVelocity, this.velocity.read.texture);
        gl.uniform1i(vorticityProgram.uniforms.uCurl, this.curl.texture);
        gl.uniform1f(vorticityProgram.uniforms.curl, this.options.CURL);
        gl.uniform1f(vorticityProgram.uniforms.dt, dt);
        this.blit(this.velocity.write.fbo);
        this.velocity.swap();
        
        // Divergence computation
        const divergenceProgram = this.programs.divergenceShader;
        gl.useProgram(divergenceProgram.program);
        gl.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        gl.uniform1i(divergenceProgram.uniforms.uVelocity, this.velocity.read.texture);
        this.blit(this.divergence.fbo);
        
        // Clear pressure
        const clearProgram = this.programs.clearShader;
        gl.useProgram(clearProgram.program);
        gl.uniform1i(clearProgram.uniforms.uTexture, this.pressure.read.texture);
        gl.uniform1f(clearProgram.uniforms.value, this.options.PRESSURE_DISSIPATION);
        this.blit(this.pressure.write.fbo);
        this.pressure.swap();
        
        // Pressure iterations
        const pressureProgram = this.programs.pressureShader;
        gl.useProgram(pressureProgram.program);
        gl.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        gl.uniform1i(pressureProgram.uniforms.uDivergence, this.divergence.texture);
        
        for (let i = 0; i < this.options.PRESSURE_ITERATIONS; i++) {
            gl.uniform1i(pressureProgram.uniforms.uPressure, this.pressure.read.texture);
            this.blit(this.pressure.write.fbo);
            this.pressure.swap();
        }
        
        // Gradient subtraction
        const gradientProgram = this.programs.gradientSubtractShader;
        gl.useProgram(gradientProgram.program);
        gl.uniform2f(gradientProgram.uniforms.texelSize, 1.0 / this.textureWidth, 1.0 / this.textureHeight);
        gl.uniform1i(gradientProgram.uniforms.uPressure, this.pressure.read.texture);
        gl.uniform1i(gradientProgram.uniforms.uVelocity, this.velocity.read.texture);
        this.blit(this.velocity.write.fbo);
        this.velocity.swap();
    }
    
    render() {
        const gl = this.gl;
        
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        
        if (this.options.TRANSPARENT) {
            gl.clearColor(0, 0, 0, 0);
        } else {
            const c = this.options.BACK_COLOR;
            gl.clearColor(c.r / 255, c.g / 255, c.b / 255, 1);
        }
        
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Handle shading
        if (this.options.SHADING) {
            this.renderBloom();
        } else {
            // Just display the fluid without any bloom
            gl.disable(gl.BLEND);
            const displayProgram = this.programs.displayShader;
            gl.useProgram(displayProgram.program);
            gl.uniform1i(displayProgram.uniforms.uTexture, this.dye.read.texture);
            this.blit(null);
        }
    }
    
    renderBloom() {
        if (!this.options.BLOOM) return;
        
        const gl = this.gl;
        
        // Prefilter
        gl.disable(gl.BLEND);
        gl.viewport(0, 0, this.bloomFramebuffers[0].width, this.bloomFramebuffers[0].height);
        gl.useProgram(this.bloomPrefilterProgram.program);
        gl.uniform1i(this.bloomPrefilterProgram.uniforms.uTexture, this.dye.read.texture);
        this.blit(this.bloomFramebuffers[0].write.fbo);
        this.bloomFramebuffers[0].swap();
        
        // Blur
        gl.useProgram(this.bloomBlurProgram.program);
        let i;
        for (i = 0; i < this.bloomFramebuffers.length; i++) {
            const bf = this.bloomFramebuffers[i];
            
            gl.uniform2f(this.bloomBlurProgram.uniforms.texelSize, bf.texelSizeX, 0.0);
            gl.uniform1i(this.bloomBlurProgram.uniforms.uTexture, bf.read.texture);
            gl.viewport(0, 0, bf.width, bf.height);
            this.blit(bf.write.fbo);
            bf.swap();
            
            gl.uniform2f(this.bloomBlurProgram.uniforms.texelSize, 0.0, bf.texelSizeY);
            gl.uniform1i(this.bloomBlurProgram.uniforms.uTexture, bf.read.texture);
            gl.viewport(0, 0, bf.width, bf.height);
            this.blit(bf.write.fbo);
            bf.swap();
        }
        
        // Blend all bloom layers
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        
        // Draw base texture
        const displayProgram = this.programs.displayShader;
        gl.useProgram(displayProgram.program);
        gl.uniform1i(displayProgram.uniforms.uTexture, this.dye.read.texture);
        this.blit(null);
        
        // Draw each bloom layer
        gl.useProgram(this.bloomFinalProgram.program);
        for (i = 0; i < this.bloomFramebuffers.length; i++) {
            const bf = this.bloomFramebuffers[i];
            
            gl.uniform2f(this.bloomFinalProgram.uniforms.texelSize, bf.texelSizeX, bf.texelSizeY);
            gl.uniform1i(this.bloomFinalProgram.uniforms.uTexture, bf.read.texture);
            this.blit(null);
        }
        
        gl.disable(gl.BLEND);
    }
    
    blit(target) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, target);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }
    
    splat(x, y, dx, dy, color) {
        const gl = this.gl;
        
        // Splat velocity
        gl.useProgram(this.programs.splatShader.program);
        gl.uniform1i(this.programs.splatShader.uniforms.uTarget, this.velocity.read.texture);
        gl.uniform1f(this.programs.splatShader.uniforms.aspectRatio, this.width / this.height);
        gl.uniform2f(this.programs.splatShader.uniforms.point, x, y);
        gl.uniform3f(this.programs.splatShader.uniforms.color, dx, dy, 0.0);
        gl.uniform1f(this.programs.splatShader.uniforms.radius, this.options.SPLAT_RADIUS);
        this.blit(this.velocity.write.fbo);
        this.velocity.swap();
        
        // Splat dye
        gl.useProgram(this.programs.splatShader.program);
        gl.uniform1i(this.programs.splatShader.uniforms.uTarget, this.dye.read.texture);
        gl.uniform1f(this.programs.splatShader.uniforms.aspectRatio, this.width / this.height);
        gl.uniform2f(this.programs.splatShader.uniforms.point, x, y);
        gl.uniform3f(this.programs.splatShader.uniforms.color, color.r, color.g, color.b);
        gl.uniform1f(this.programs.splatShader.uniforms.radius, this.options.SPLAT_RADIUS);
        this.blit(this.dye.write.fbo);
        this.dye.swap();
    }
    
    generateColor() {
        const c = this.options.COLORFUL ? this.HSVtoRGB(Math.random(), 1.0, 1.0) : this.HSVtoRGB(0.0, 0.0, 0.5 + Math.random() * 0.5);
        return {
            r: c.r * 0.15,
            g: c.g * 0.15,
            b: c.b * 0.15
        };
    }
    
    HSVtoRGB(h, s, v) {
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        
        return {
            r, g, b
        };
    }
    
    // Public methods
    addSplat(x, y, dx = 0, dy = 0, color = null) {
        if (color === null) {
            color = this.generateColor();
        }
        
        // Normalize coordinates
        x = x / this.width;
        y = 1.0 - y / this.height;
        
        // Add to splat stack for processing in the next step
        this.splatStack.push({ x, y, dx, dy, color });
    }
    
    // Create splat at mouse position when user interacts with map
    createInteraction(x, y, force = 1.0) {
        // Calculate velocities based on position relative to center
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const dx = (x - centerX) / this.width * force;
        const dy = (y - centerY) / this.height * force;
        
        // Create splats with varying colors
        this.addSplat(x, y, dx * 10, dy * 10);
        
        // Create additional splats around main point for more effect
        for (let i = 0; i < 3; i++) {
            const offsetX = x + (Math.random() * 100 - 50);
            const offsetY = y + (Math.random() * 100 - 50);
            const smallerForce = force * 0.3;
            const smallDx = (offsetX - centerX) / this.width * smallerForce;
            const smallDy = (offsetY - centerY) / this.height * smallerForce;
            this.addSplat(offsetX, offsetY, smallDx * 5, smallDy * 5);
        }
    }
}

// Export for use in other files
window.FluidSimulation = FluidSimulation;