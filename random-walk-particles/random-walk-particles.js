/**
 * random-walk-particles is a gravitational particle simulation. Multiple point masses move around
 * according to a random walk provides the gravitational force that drives the dynamics of the
 * particles, which do *not* interact with each other.
 *
 * TODO:
 * repellant force between masses
 * allow one mass at a time to not feel effects of repellant force ("leader" mass)
 */

// -------------------------
//     define parameters
// -------------------------

option_defaults = {};

// user parameters - masses
option_defaults.numMasses = 1;         // display torus knot that center of mass follows
option_defaults.mass = 0.1;            // base gravitational mass
option_defaults.exponent = 0.1;        // exponent on gravitational-like force law
option_defaults.speed = 1.0;           // base speed of random walk
option_defaults.massRadii = 5;         // base radii of masses
option_defaults.renderMasses = true;   // render masses as spheres

// user parameters - particles
option_defaults.numParticles = 100000; // number of particles to simulate
option_defaults.cycleColor = true;     // base color of particles cycles through huespace
option_defaults.baseHue = 0.0;         // base hue of particles
option_defaults.hueFreq = 0.05;        // frequency of hue cycling

// internal parameters - gravity info
let massCentersInit = [];              // location of each center of gravity
let massCenters = [];                  // location of each center of gravity
let massMasses = [];                   // mass of each center of gravity
let massMeshes = [];
let randomWalkers = [];

// internal parameters - particle dynamics info
let particleSystem;                    // particle mesh
let pos_og = [];                       // initial position
let pos = [];                          // particle positions
let vel = [];                          // particle velocities
let acc = [];                          // particle accelerations
let color = [];                        // particle colors
let maxLen = 5.0;                      // parameter for dynamic control of particle colors
let phase = 0.0;                       // phase offset for color control

// keep track of time
let clock;

// -------------------
//     build scene
// -------------------

// set up user parameters in gui
let gui;
let options = setupDatGUI();

// allocate the scene object, and set the camera position
let scene = new SCENE.Scene({
    cameraPos: [150, 0, 0],
    controls: true,
    displayStats: true
});

// initialize the sketch
initializeScene();

// animate the scene (map the 3D world to the 2D scene)
updateScene();

function initializeScene() {
    // control degree of motion in particles
    clock = new THREE.Clock(true);

    // create centers of gravity
    createMasses();
    createRandomWalkers();
    if (options.renderMasses) {
        addMassMeshes()
    }

    // create particle system
    // particleSystem = createParticleSystem();
    // scene.add(particleSystem);
}

function updateScene() {

    // update center of gravity
    updateMasses();

    // subject particles to gravitational and spring forces
    // updateParticles();

    // map the 3D scene down to the 2D screen (render the frame) (also updates camera controls)
    scene.renderScene();

    // request animation for next update
    requestAnimationFrame(updateScene);
}

/*
 * Mass functions
 */
function createMasses() {
    massCentersInit = [];
    massCenters = [];
    massMasses = [];
    for (let i = 0; i < options.numMasses; i++) {
        let pos = new THREE.Vector3(
            100 * (Math.random() - 0.5),
            100 * (Math.random() - 0.5),
            100 * (Math.random() - 0.5));
        massCentersInit.push(pos);
        massCenters.push(pos);
        massMasses.push(options.mass)
    }
}

function updateMasses() {
    for (let i = 0; i < options.numMasses; i++) {
        let position = randomWalkers[i].getNextVal();
        console.log(position);
        massCenters[i] = massCentersInit[i].addScaledVector(position, 1);
        console.log(massCenters[i]);
        if (options.renderMasses) {
            massMeshes[i].position.set(massCenters[i].x, massCenters[i].y, massCenters[i].z);
            massMeshes[i].geometry.verticesNeedUpdate = true
        }
    }
}

function resetMasses() {
    // create centers of gravity
    createMasses();
    createRandomWalkers();
    if (options.renderMasses) {
        removeMassMeshes();
        addMassMeshes();
    }
}

function addMassMeshes() {
    massMeshes = [];
    for (let i = 0; i < massCenters.length; i++) {
        let geometry = new THREE.SphereGeometry(
            options.massRadii, 64, 32);
        let material = new THREE.MeshPhongMaterial(
            {color: 0x333333, side: THREE.DoubleSide});
        massMeshes.push(new THREE.Mesh(geometry, material));
        massMeshes[i].position.set(massCenters[i].x, massCenters[i].y, massCenters[i].z);
        scene.add(massMeshes[i]);
    }
}

function removeMassMeshes() {
    for (let i = 0; i < massCenters.length; i++) {
        scene.remove(massMeshes[i])
    }
}

function createRandomWalkers() {
    randomWalkers = [];
    for (let i = 0; i < options.numMasses; i++) {
        randomWalkers.push(new CartesianRandomWalker(200))
    }
}

/*
 * Particle functions
 */
function createParticleSystem() {

    // clear particle info
    pos_og = [];    // initial position
    pos = [];       // particle positions
    vel = [];       // particle velocities
    acc = [];       // particle accelerations
    color = [];     // particle colors

    // allocate a plain geometry that will hold all of the vertices which are the 'particles'
    let particles = new THREE.Geometry();
    // create the vertices and add them to the particle's geometry
    let phi, theta, x, y, z;
    for (let i = 0; i < options.numParticles; i++) {

        // random initial position on the surface of a sphere
        phi = Math.random() * Math.PI;
        theta = Math.random() * 2.0 * Math.PI;
        z = RADIUS * Math.cos(phi);
        x = RADIUS * Math.sin(phi) * Math.cos(theta);
        y = RADIUS * Math.sin(phi) * Math.sin(theta);

        // add vertices to particle system
        let particle = new THREE.Vector3(x, y, z);
        particles.vertices.push(particle);
        let col = new THREE.Color(0, 0, 0);
        color.push(col.setHSL(0, 1, 0));

        // keep track of particle info
        pos_og.push(new THREE.Vector3(x, y, z));
        pos.push(new THREE.Vector3(x, y, z));
        vel.push(new THREE.Vector3(0, 0, 0));
        acc.push(new THREE.Vector3(0, 0, 0));
    }
    particles.colors = color;

    // create particle system mesh
    let particleMaterial = new THREE.PointsMaterial({
        vertexColors: THREE.VertexColors,
        size: 0.4,
        sizeAttenuation: false
    });
    particleSystem = new THREE.Points(particles, particleMaterial);
    return particleSystem;
}

function updateParticles() {

    // update parameters based on controller
    updateController();

    // UPDATE PARTICLE DYNAMICS

    // for dynamic updates to color
    let temp = 0.0;
    let maxLenNew = 0.0;
    let hueTrans = 0.16;
    let baseHue = options.baseHue;
    if (options.cycleColor) {
        baseHue = options.baseHue + 0.5 +
            0.5 * Math.cos(options.colorFreq * clock.getElapsedTime() + phase);
    }

    // define vertices and colors for easy access
    let verts = particleSystem.geometry.vertices;
    let cols = particleSystem.geometry.colors;

    // loop through particles and update
    for (let i = 0; i < verts.length; i++) {

        // calculate gravitational force
        let force = new THREE.Vector3(gravCenter.x, gravCenter.y, gravCenter.z).sub(verts[i]);
        let len = force.length();
        force.normalize().multiplyScalar(options.mass / (Math.pow(len, options.exponent)));

        // calculate damped spring force
        // acc += -p1*velocity - k*displacement
        // multiply original position by fracCurr during reset to smooth appearance of transitions
        let forceReg = new THREE.Vector3(
            pos_og[i].x, pos_og[i].y, pos_og[i].z).multiplyScalar(
            1.0 + fracCurr).sub(verts[i]);
        forceReg.multiplyScalar(options.dampPos);
        forceReg.addScaledVector(vel[i], -1.0 * options.dampVel);

        // update dynamics
        acc[i].add(force);
        acc[i].add(forceReg);
        vel[i].add(acc[i]);
        pos[i].add(vel[i]);

        // actually update vertices in mesh
        verts[i].set(pos[i].x, pos[i].y, pos[i].z);

        // clear out acceleration
        acc[i].multiplyScalar(0.0);

        // set color based on velocity
        let speed = vel[i].length();
        let speedScaled = speed / (maxLen * 1.5);
        if (speedScaled < 0.5) {
            // move color from red to yellow
            temp = baseHue + speedScaled * 2.0 * hueTrans;
            cols[i].setHSL(temp - Math.floor(temp), 1, 0.5);
        } else {
            // move color from yellow to white
            temp = baseHue + hueTrans;
            cols[i].setHSL(temp - Math.floor(temp), 1, speedScaled);
        }
        if (speed > maxLenNew) {
            maxLenNew = speed
        }
    }
    // update velocity ceiling
    maxLen = 0.99 * maxLen + 0.01 * maxLenNew;

    // update particle system info on gpu
    particleSystem.geometry.verticesNeedUpdate = true;
    particleSystem.geometry.colorsNeedUpdate = true;

}

function resetParticles() {
    let phi, theta, x, y, z;
    for (let i = 0; i < options.numParticles; i++) {
        // random initial position on the surface of a sphere
        phi = Math.random() * Math.PI;
        theta = Math.random() * 2.0 * Math.PI;
        z = RADIUS * Math.cos(phi);
        x = RADIUS * Math.sin(phi) * Math.cos(theta);
        y = RADIUS * Math.sin(phi) * Math.sin(theta);

        // reset particle position/velocity/acceleration
        particleSystem.geometry.vertices[i].set(x, y, z);
        pos[i].set(x, y, z);
        vel[i].multiplyScalar(0.0);
        acc[i].multiplyScalar(0.0);
    }
    // update particle system info on gpu
    particleSystem.geometry.verticesNeedUpdate = true;
}

/*
 * parameter GUI
 */
function setupDatGUI() {

    let options = [];

    // initialize gui object
    gui = new dat.GUI();

    // -----------------------
    // add mass options to gui
    // -----------------------
    let f1 = gui.addFolder('Mass parameters');

    // number of masses dropdown
    let mList = [1, 2, 4, 6, 8, 10];
    options.numMasses = option_defaults.numMasses;
    f1.add(options, 'numMasses', mList).onChange(function() {
        resetMasses();
    });

    // base mass slider
    options.mass = option_defaults.mass;
    f1.add(options, 'mass', 0.0, 1.0);

    // gravitational force exponent slider
    options.exponent = option_defaults.exponent;
    f1.add(options, 'exponent', 0.1, 2.0);

    // speed of random walk slider
    options.speed = option_defaults.speed;
    f1.add(options, 'speed', 0.0, 5.0);

    // mass sizes slider
    options.massRadii = option_defaults.massRadii;
    f1.add(options, 'massRadii', 1, 10).onChange(function() {
        if (options.renderMasses) {
            removeMassMeshes();
            addMassMeshes();
        }
    });

    // render masses radio button
    options.renderMasses = option_defaults.renderMasses;
    f1.add(options, 'renderMasses').onChange(function() {
        if (options.renderMasses) {
            addMassMeshes();
        } else {
            removeMassMeshes();
        }
    });

    // ---------------------------
    // add particle options to gui
    // ---------------------------
    let f3 = gui.addFolder('Particle parameters');

    // change number of particles text field
    options.numParticles = option_defaults.numParticles;
    f3.add(options, 'numParticles').onChange(function() {
        // make sure input is a reasonable integer
        options.numParticles = Math.round(options.numParticles);
        if (options.numParticles > 200000) {
            options.numParticles = 200000;
        } else if (options.numParticles < 1) {
            options.numParticles = 1;
        }
        // remove old particle system
        scene.remove(particleSystem);

        // create new particle system
        particleSystem = createParticleSystem();

        // add new particle system to scene
        scene.add(particleSystem);
    });

    // cycle through base colors of particles radio button
    options.cycleColor = option_defaults.cycleColor;
    f3.add(options, 'cycleColor').onChange(function() {
        if (options.cycleColor) {
            // if turning on cycling, start with current hue by making cosine term go to 1
            phase = -1.0 * options.colorFreq * clock.getElapsedTime();
        } else {
            // if turning off cycling, reset baseHue to current hue
            options.baseHue = options.baseHue + 0.5 +
                0.5 * Math.cos(options.colorFreq * clock.getElapsedTime() + phase)
        }
    });

    // change base color with color controller
    options.baseHue = option_defaults.baseHue;
    options.colorInit = {h: 360 * option_defaults.baseHue, s: 1.0, v: 1.0}; // actual color
    f3.addColor(options, 'colorInit').onChange(function() {
        // use hue of chosen color to update the base hue
        options.baseHue = options.colorInit.h / 360.0;
        // update phase for smooth transition while color cycling; makes cosine
        // term go to 1 so that actual picked hue is used
        if (options.cycleColor) {
            phase = -1.0 * options.hueFreq * clock.getElapsedTime();
        }
    });

    // frequency of hue cycling
    options.hueFreq = option_defaults.hueFreq;
    f3.add(options, 'hueFreq', 0.0, 0.5);


    // ----------------
    // add reset button
    // ----------------
    options.reset = function() {
        resetMasses();
        // resetParticles();
    };
    gui.add(options, 'reset');

    return options;
}
