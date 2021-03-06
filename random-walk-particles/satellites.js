
class Satellites {

    constructor(options, scene, planets, planet_id = 0) {

        this.scene = scene;
        this.planets = planets;
        this.options = options;
        // numSatellites
        // cycleColor
        // baseHue
        // hueFreq
        // kPos
        // kVel
        this.planet_id = planet_id;

        this.mesh = null;  // satellite mesh
        this.pos0 = [];    // initial satellite positions
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
        let r, phi, theta, x, y, z;
        for (let i = 0; i < this.options.numSatellites; i++) {

            // random initial position on the surface of a sphere
            phi = Math.random() * 2.0 * Math.PI;
            theta = Math.random() * Math.PI;
            r = 1.0; //Math.random();
            x = r * this.options.radii * Math.sin(phi) * Math.cos(theta);
            y = r * this.options.radii * Math.sin(phi) * Math.sin(theta);
            z = r * this.options.radii * Math.cos(phi);

            // add vertices to satellite system
            satellites.vertices.push(new THREE.Vector3(x, y, z));
            let col = new THREE.Color(1, 1, 1);
            this.color.push(col.setHSL(0, 1, 1));

            // keep track of satellite info
            this.pos0.push(new THREE.Vector3(x, y, z));
            this.pos.push(new THREE.Vector3(
                this.pos0[i].x + this.planets.pos[this.planet_id].x,
                this.pos0[i].y + this.planets.pos[this.planet_id].y,
                this.pos0[i].z + this.planets.pos[this.planet_id].z));
            this.vel.push(new THREE.Vector3(0, 0, 0));
            this.acc.push(new THREE.Vector3(0, 0, 0));
        }
        satellites.colors = this.color;

        // create satellite system mesh
        let satelliteMaterial = new THREE.PointsMaterial({
            vertexColors: THREE.VertexColors,
            size: 0.5,
            sizeAttenuation: true
        });
        this.mesh = new THREE.Points(satellites, satelliteMaterial);
    }

    update(clock) {

        // for dynamic updates to color
        let temp = 0.0;
        let maxLenNew = 0.0;
        let hueTrans = 0.16; // distance traveled in hue space before switching to lightness inc
        let baseHue;
        if (this.options.cycleColor) {
            baseHue = this.options.baseHue + 0.5 +
                0.5 * Math.cos(this.options.hueFreq * clock.getElapsedTime() + this.phase);
        } else {
            baseHue = this.options.baseHue;
        }

        // define vertices and colors for easy access
        let verts = this.mesh.geometry.vertices;
        let cols = this.mesh.geometry.colors;

        // loop through satellites and update
        for (let i = 0; i < verts.length; i++) {

            // calculate gravitational force
            let force;
            for (let j = 0; j < this.options.numPlanets; j++) {
                force = this.planets.pos[j].clone().sub(verts[i]);
                force.normalize().multiplyScalar(
                    this.options.mass / (Math.pow(force.length(), this.options.exponent)));
                this.acc[i].add(force);
            }

            // calculate damped spring force
            // acc += -k_0 * velocity - k_1 * displacement
            // let forceSpring = this.pos[i].clone().sub(this.planets.pos[0].add(this.pos0[i]));
            // let forceSpring = this.pos[i].clone().sub(this.planets.pos[0].clone().add(this.pos0[i]));
            let forceSpring = this.planets.pos[this.planet_id].clone().add(
                this.pos0[i]).sub(this.pos[i].clone());
            forceSpring.multiplyScalar(this.options.kPos);
            forceSpring.addScaledVector(this.vel[i], -1.0 * this.options.kVel);
            this.acc[i].add(forceSpring);

            // update dynamics
            this.vel[i].add(this.acc[i]);
            this.pos[i].add(this.vel[i]);

            // actually update vertices in mesh
            verts[i].set(this.pos[i].x, this.pos[i].y, this.pos[i].z);

            // clear out acceleration
            this.acc[i].multiplyScalar(0.0);

            // set color based on velocity
            let speed = this.vel[i].length();
            let speedScaled = speed / (this.maxLen * 1.1);
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
        let r, phi, theta, x, y, z;
        for (let i = 0; i < this.options.numSatellites; i++) {
            // random initial position on the surface of a sphere
            phi = Math.random() * 2.0 * Math.PI;
            theta = Math.random() * Math.PI;
            r = 1.0; // Math.random();
            x = r * this.options.radii * Math.sin(phi) * Math.cos(theta);
            y = r * this.options.radii * Math.sin(phi) * Math.sin(theta);
            z = r * this.options.radii * Math.cos(phi);

            // reset satellite position/velocity/acceleration
            this.pos0[i].set(x, y, z);
            this.pos[i].set(
                this.pos0[i].x + this.planets.pos[this.planet_id].x,
                this.pos0[i].y + this.planets.pos[this.planet_id].y,
                this.pos0[i].z + this.planets.pos[this.planet_id].z);
            this.mesh.geometry.vertices[i].set(this.pos0[i].x, this.pos0[i].y, this.pos0[i].z);
            this.vel[i].multiplyScalar(0.0);
            this.acc[i].multiplyScalar(0.0);
        }
        // update satellite system info on gpu
        this.mesh.geometry.verticesNeedUpdate = true;
    }

}

class SatelliteArray {

    constructor(options, scene, planets) {
        this.scene = scene;
        this.planets = planets;
        this.options = options;
        this.reinitialize(planets)
    }

    reinitialize(planets) {
        if (typeof this.satelliteArray !== "undefined") {
            this.removeMesh()
        }
        this.satelliteArray = [];
        for (let i = 0; i < this.options.numPlanets; i++) {
            this.satelliteArray.push(new Satellites(this.options, this.scene, planets, i))
        }
        this.addMesh()
    }

    update(clock) {
        for (let i = 0; i < this.satelliteArray.length; i++) {
            this.satelliteArray[i].update(clock)
        }
    }

    updateOptions(options) {
        this.options = options;
        for (let i = 0; i < this.satelliteArray.length; i++) {
            this.satelliteArray[i].options = options;
        }
    }

    addMesh() {
        for (let i = 0; i < this.satelliteArray.length; i++) {
            this.scene.add(this.satelliteArray[i].mesh);
        }
    }

    removeMesh() {
        for (let i = 0; i < this.satelliteArray.length; i++) {
            this.scene.remove(this.satelliteArray[i].mesh);
        }
    }

    reset() {
        for (let i = 0; i < this.satelliteArray.length; i++) {
            this.satelliteArray[i].reset()
        }
    }

    setupGUI(options, gui, clock) {

        let satellites = this;

        let f = gui.addFolder('Satellite parameters');

        // change number of satellites text field
        options.numSatellites = satellites.options.numSatellites;
        f.add(options, 'numSatellites').onChange(function() {
            // make sure input is a reasonable integer
            options.numSatellites = Math.round(options.numSatellites);
            if (options.numSatellites > 100000) {
                options.numSatellites = 100000;
            } else if (options.numSatellites < 1) {
                options.numSatellites = 1;
            }
            satellites.reinitialize(planets)
            // remove old satellite system
            // satellites.removeMesh();
            // for (let i = 0; i < satellites.satelliteArray.length; i++) {
            //     satellites.scene.remove(satellites.satelliteArray[i].mesh);
            // }
            // create new satellite system
            // satellites.satelliteArray = [];
            // for (let i = 0; i < options.numPlanets; i++) {
            //     satellites.satelliteArray.push(new Satellites(options, scene, planets, i))
            // }
            // add new satellite system to scene
            // for (let i = 0; i < options.numPlanets; i++) {
            //     satellites.scene.add(satellites.satelliteArray[i].mesh);
            // }

        });

        // cycle through base colors of satellites radio button
        options.cycleColor = satellites.options.cycleColor;
        f.add(options, 'cycleColor').onChange(function() {
            if (options.cycleColor) {
                // if turning on cycling, start with current hue by making cosine term go to 1
                for (let i = 0; i < options.numPlanets; i++) {
                    satellites.satelliteArray[i].phase =
                        -1.0 * options.hueFreq * clock.getElapsedTime();
                }
                // satellites.phase = -1.0 * satellites.options.hueFreq * clock.getElapsedTime();
            } else {
                // if turning off cycling, reset baseHue to current hue
                options.baseHue = options.baseHue + 0.5 + 0.5 * Math.cos(
                    options.hueFreq * clock.getElapsedTime() +
                    satellites.satelliteArray[0].phase)
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
                for (let i = 0; i < options.numPlanets; i++) {
                    satellites.satelliteArray[i].phase =
                        -1.0 * options.hueFreq * clock.getElapsedTime();
                }
                // satellites.phase = -1.0 * satellites.options.hueFreq * clock.getElapsedTime();
            }
        });

        // frequency of hue cycling
        options.hueFreq = satellites.options.hueFreq;
        f.add(options, 'hueFreq', 0.0, 0.5);

        // strength of spring force (displacement)
        options.kPos = satellites.options.kPos;
        f.add(options, 'kPos', 0.0, 0.1);

        // strength of spring force (velocity)
        options.kVel = satellites.options.kVel;
        f.add(options, 'kVel', 0.0, 0.1);

    }

}