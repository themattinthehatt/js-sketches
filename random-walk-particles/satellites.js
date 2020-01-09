
class Satellites {

    constructor(options, scene) {

        this.scene = scene;
        this.options = options;
        // numSatellites
        // cycleColor
        // baseHue
        // hueFreq

        this.mesh = null;  // satellite mesh
        this.pos = [];     // satellite positions
        this.vel = [];     // satellite velocities
        this.acc = [];     // satellite accelerations
        this.color = [];   // satellite colors
        this.maxLen = 5.0; // parameter for dynamic control of satellite colors
        this.phase = 0.0;  // phase offset for color control

        this.initialize();

    }

    initialize() {
        // clear info
        this.pos = [];
        this.vel = [];
        this.acc = [];
        this.color = [];

        // allocate a plain geometry that will hold all of the vertices which are the satellites
        let satellites = new THREE.Geometry();
        // create the vertices and add them to the satellite's geometry
        let phi, theta, x, y, z;
        let RADIUS = 20;

        for (let i = 0; i < this.options.numSatellites; i++) {

            // random initial position on the surface of a sphere
            phi = Math.random() * Math.PI;
            theta = Math.random() * 2.0 * Math.PI;
            z = RADIUS * Math.cos(phi);
            x = RADIUS * Math.sin(phi) * Math.cos(theta);
            y = RADIUS * Math.sin(phi) * Math.sin(theta);

            // add vertices to satellite system
            let satellite = new THREE.Vector3(x, y, z);
            satellites.vertices.push(satellite);
            let col = new THREE.Color(0, 0, 0);
            this.color.push(col.setHSL(0, 1, 0));

            // keep track of satellite info
            this.pos.push(new THREE.Vector3(x, y, z));
            this.vel.push(new THREE.Vector3(0, 0, 0));
            this.acc.push(new THREE.Vector3(0, 0, 0));
        }
        satellites.colors = this.color;

        // create satellite system mesh
        let satelliteMaterial = new THREE.PointsMaterial({
            vertexColors: THREE.VertexColors,
            size: 0.4,
            sizeAttenuation: false
        });
        this.mesh = new THREE.Points(satellites, satelliteMaterial);
    }

    update(planets, clock) {

        // for dynamic updates to color
        let temp = 0.0;
        let maxLenNew = 0.0;
        let hueTrans = 0.16;
        let baseHue = this.options.baseHue;
        if (this.options.cycleColor) {
            baseHue = this.options.baseHue + 0.5 +
                0.5 * Math.cos(this.options.colorFreq * clock.getElapsedTime() + phase);
        }

        // define vertices and colors for easy access
        let verts = this.mesh.geometry.vertices;
        let cols = this.mesh.geometry.colors;

        // loop through satellites and update
        for (let i = 0; i < verts.length; i++) {

            // calculate gravitational force
            let force = new THREE.Vector3(gravCenter.x, gravCenter.y, gravCenter.z).sub(verts[i]);
            let len = force.length();
            force.normalize().multiplyScalar(
                this.options.mass / (Math.pow(len, this.options.exponent)));

            // update dynamics
            this.acc[i].add(force);
            this.vel[i].add(this.acc[i]);
            this.pos[i].add(this.vel[i]);

            // actually update vertices in mesh
            verts[i].set(this.pos[i].x, this.pos[i].y, this.pos[i].z);

            // clear out acceleration
            this.acc[i].multiplyScalar(0.0);

            // set color based on velocity
            let speed = this.vel[i].length();
            let speedScaled = speed / (this.maxLen * 1.5);
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
        this.maxLen = 0.99 * this.maxLen + 0.01 * maxLenNew;

        // update satellite system info on gpu
        this.mesh.geometry.verticesNeedUpdate = true;
        this.mesh.geometry.colorsNeedUpdate = true;

    }

    reset() {
        let phi, theta, x, y, z;
        for (let i = 0; i < this.options.numSatellites; i++) {
            // random initial position on the surface of a sphere
            phi = Math.random() * Math.PI;
            theta = Math.random() * 2.0 * Math.PI;
            z = RADIUS * Math.cos(phi);
            x = RADIUS * Math.sin(phi) * Math.cos(theta);
            y = RADIUS * Math.sin(phi) * Math.sin(theta);

            // reset satellite position/velocity/acceleration
            this.mesh.geometry.vertices[i].set(x, y, z);
            this.pos[i].set(x, y, z);
            this.vel[i].multiplyScalar(0.0);
            this.acc[i].multiplyScalar(0.0);
        }
        // update satellite system info on gpu
        this.mesh.geometry.verticesNeedUpdate = true;
    }

    setupGUI(options, gui) {

        let satellites = this;

        let f = gui.addFolder('Satellite parameters');

        // change number of satellites text field
        options.numSatellites = satellites.options.numSatellites;
        f.add(options, 'numSatellites').onChange(function() {
            // make sure input is a reasonable integer
            options.numSatellites = Math.round(options.numSatellites);
            if (options.numSatellites > 200000) {
                options.numSatellites = 200000;
            } else if (options.numSatellites < 1) {
                options.numSatellites = 1;
            }
            // remove old satellite system
            satellites.scene.remove(satellites.mesh);

            // create new satellite system
            satellites.initialize();

            // add new satellite system to scene
            satellites.scene.add(satellites.mesh);
        });

        // cycle through base colors of satellites radio button
        options.cycleColor = satellites.options.cycleColor;
        f.add(options, 'cycleColor').onChange(function() {
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
        options.baseHue = satellites.options.baseHue;
        options.colorInit = {h: 360 * satellites.options.baseHue, s: 1.0, v: 1.0}; // actual color
        f.addColor(options, 'colorInit').onChange(function() {
            // use hue of chosen color to update the base hue
            options.baseHue = options.colorInit.h / 360.0;
            // update phase for smooth transition while color cycling; makes cosine
            // term go to 1 so that actual picked hue is used
            if (options.cycleColor) {
                phase = -1.0 * options.hueFreq * clock.getElapsedTime();
            }
        });

        // frequency of hue cycling
        options.hueFreq = satellites.options.hueFreq;
        f.add(options, 'hueFreq', 0.0, 0.5);

    }

}