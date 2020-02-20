/**
 * random-walk-particles is a gravitational particle simulation. Multiple point masses (planets)
 * move around according to a random walk provides the gravitational force that drives the dynamics
 * of the particles (satellites), which do *not* interact with each other.
 *
 * TODO:
 * planets:
 *      - multiple planets
 *      - repellant force between masses
 *      - allow one mass at a time to not feel effects of repellant force ("leader" mass)
 * other:
 *      - reset camera with "reset" radio button
 *
 * good param settings:
 *      - spherical shell: 1, 0.1, 0.05, 0.02, 5 -- 0.05, 0.025
 *      - restrained volcano: 0.45, 0.05, 0.01, 10 -- 0.05, 0.025
 *      - oscillating shell: 0.005 (0.02), 0.05, 0.01, 10 -- 0.05, 0
 *      - pulse+particle-0: 0.01, 0.05, 0.01, 10 -- 0.003, 0.001-0.003 (controls spread)
 *      - pulse+particle-1: 0.027, 0.05, 0.01, 10 -- 0.0027, 0.0027
 */


// ------------------------------
//     define user parameters
// ------------------------------

option_defaults = {};

// user parameters - planets
option_defaults.numPlanets = 2;         // number of planets
option_defaults.mass = 0.01;             // base planet mass
option_defaults.exponent = 0.05;        // exponent on gravitational-like force law
option_defaults.speed = 0.01;           // base speed of random walk
option_defaults.radii = 10;              // base radii of planets
option_defaults.renderPlanets = false;   // render planets as spheres

// user parameters - satellites
option_defaults.numSatellites = 50000;   // number of satellites to simulate
option_defaults.cycleColor = false;     // base color of satellites cycles through huespace
option_defaults.baseHue = 0.0;          // base hue of satellites
option_defaults.hueFreq = 0.05;         // frequency of hue cycling
option_defaults.kPos = 0.003;            // strength of spring force (displacement)
option_defaults.kVel = 0.001;            // strength of spring force (velocity)

// keep track of time
let clock = new THREE.Clock(true);

// -------------------
//     build scene
// -------------------

// allocate the scene object, and set the camera position
cameraPosInit = [200, 0, 0];
let scene = new SCENE.Scene({
    cameraPos: cameraPosInit,
    controls: true,
    displayStats: true
});

// initialize massive planets
let planets = new Planets(option_defaults, scene);

// initialize massless satellites
let satellites = new SatelliteArray(option_defaults, scene, planets);

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
    satellites.updateOptions(options);
    // add satellite mesh to scene
    satellites.addMesh(scene);

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
    planets.setupGUI(options, gui, satellites);

    // add particle options to gui
    satellites.setupGUI(options, gui, clock);

    // add reset button
    options.reset = function() {
        planets.reset();
        satellites.reset();
        scene.cameraPos = cameraPosInit
    };
    gui.add(options, 'reset');

    return options;
}
