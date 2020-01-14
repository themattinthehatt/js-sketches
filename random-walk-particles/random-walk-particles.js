/**
 * random-walk-particles is a gravitational particle simulation. Multiple point masses (planets)
 * move around according to a random walk provides the gravitational force that drives the dynamics
 * of the particles (satellites), which do *not* interact with each other.
 *
 * TODO:
 * planets:
 *      - repellant force between masses
 *      - allow one mass at a time to not feel effects of repellant force ("leader" mass)
 * particles:
 *      - spring force back to single planet?
 */


// ------------------------------
//     define user parameters
// ------------------------------

option_defaults = {};

// user parameters - planets
option_defaults.numPlanets = 1;         // number of planets
option_defaults.mass = 0.1;             // base planet mass
option_defaults.exponent = 0.05;        // exponent on gravitational-like force law
option_defaults.speed = 0.02;           // base speed of random walk
option_defaults.radii = 5;              // base radii of planets
option_defaults.renderPlanets = false;   // render planets as spheres

// user parameters - satellites
option_defaults.numSatellites = 5000;   // number of satellites to simulate
option_defaults.cycleColor = false;     // base color of satellites cycles through huespace
option_defaults.baseHue = 0.0;          // base hue of satellites
option_defaults.hueFreq = 0.05;         // frequency of hue cycling

// keep track of time
let clock = new THREE.Clock(true);

// -------------------
//     build scene
// -------------------

// allocate the scene object, and set the camera position
let scene = new SCENE.Scene({
    cameraPos: [150, 0, 0],
    controls: true,
    displayStats: true
});

// initialize massive planets
let planets = new Planets(option_defaults, scene);

// initialize massless satellites
let satellites = new Satellites(option_defaults, scene, planets);

// set up user parameters in gui
let gui;
let options = setupDatGUI();

// initialize the sketch
initializeScene();

// animate the scene (map the 3D world to the 2D scene)
updateScene();


function initializeScene() {
    // update planet options to params stored in gui
    planets.options = options;

    // update satellite options
    satellites.options = options;
    // add satellite mesh to scene
    scene.add(satellites.mesh);
}

function updateScene() {

    // update planets
    planets.update();

    // subject satellites to gravitational forces
    satellites.update(clock);

    // map the 3D scene down to the 2D screen (render the frame) (also updates camera controls)
    scene.renderScene();

    // request animation for next update
    requestAnimationFrame(updateScene);
}

function setupDatGUI() {

    let options = [];

    // initialize gui object
    gui = new dat.GUI();

    // add planet options to gui
    planets.setupGUI(options, gui);

    // add particle options to gui
    satellites.setupGUI(options, gui, clock);

    // add reset button
    options.reset = function() {
        planets.reset();
        satellites.reset();
    };
    gui.add(options, 'reset');

    return options;
}
