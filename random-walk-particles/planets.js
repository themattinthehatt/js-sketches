
class Planets {

    constructor(options, scene) {

        this.scene = scene;
        this.options = options;
        // numPlanets: number of planets
        // mass: base planet mass
        // exponent: exponent on gravitational-like force law
        // speed: base speed of random walk
        // radii: base radii of planets
        // renderPlanets: render planets as spheres

        this.pos = [];           // location of each planet (cartesian coords)
        this.posSph = [];        // position of each planet (spherical coords)
        this.vel = [];           // velocity of each planet
        this.acc = [];           // acceleration of each planet
        this.masses = [];        // mass of each planet
        this.meshes = [];
        this.randomWalkers = [];

        this.walkType = 'spherical'; // cartesian | spherical
        // this.walkType = 'cartesian'; // cartesian | spherical
        this.radius = 50;            // radius of sphere on which planets live

        this.initialize();

    }

    initialize() {
        this.createRandomWalkers(); // updates to acc
        this.initializePlanets();   // pos, vel, acc
        if (this.options.renderPlanets) {
            this.addMeshes()
        }
    }

    initializePlanets(numPlanets) {
        this.numPlanets = numPlanets || this.options.numPlanets;
        this.pos = [];
        this.posSph = [];
        this.vel = [];
        this.acc = [];
        this.masses = [];
        for (let i = 0; i < this.options.numPlanets; i++) {
            let pos;
            if (this.walkType === 'cartesian') {
                pos = new THREE.Vector3(
                    100 * (Math.random() - 0.5),
                    100 * (Math.random() - 0.5),
                    100 * (Math.random() - 0.5));
            } else if (this.walkType === 'spherical') {
                let r = this.radius; // + this.radius * 0.05 * rand.x;
                let theta = Math.PI * Math.random();
                let phi = 2 * Math.PI * Math.random();
                pos = new THREE.Vector3(r, theta, phi);
            } else {
                console.log('Invalid walk type %s', this.walkType)
            }
            this.posSph.push(pos);
            this.pos.push(this.sphericalToCartesian(
                this.posSph[i].x, this.posSph[i].y, this.posSph[i].z));
            this.vel.push(new THREE.Vector3(0.0, 0.0, 0.0));
            this.acc.push(new THREE.Vector3(0.0, 0.0, 0.0));
            this.masses.push(this.options.mass);
        }
    }

    createRandomWalkers() {
        this.randomWalkers = [];
        for (let i = 0; i < this.options.numPlanets; i++) {
            if (this.walkType === 'cartesian') {
                this.randomWalkers.push(new CartesianRandomWalker(100))
            } else if (this.walkType === 'spherical') {
                this.randomWalkers.push(new CartesianRandomWalker(200))
            }

        }
    }

    update() {
        for (let i = 0; i < this.options.numPlanets; i++) {
            if (this.walkType === 'cartesian') {
                let acc = this.randomWalkers[i].getNextVal();
                // this.vel[i].addScaledVector(acc, this.options.speed);
                // this.pos[i].add(this.vel[i]);
                this.pos[i].add(acc);
            } else if (this.walkType === 'spherical') {
                let rand = this.randomWalkers[i].getNextVal();
                this.vel[i].x = 0;
                this.vel[i].y = this.options.speed * rand.y;
                this.vel[i].z = this.options.speed * rand.z;
                this.posSph[i].add(this.vel[i]);
                this.pos[i] = this.sphericalToCartesian(
                    this.posSph[i].x, this.posSph[i].y, this.posSph[i].z);
            }
            if (this.options.renderPlanets) {
                this.meshes[i].position.set(this.pos[i].x, this.pos[i].y, this.pos[i].z);
                this.meshes[i].geometry.verticesNeedUpdate = true
            }
        }
    }

    reset() {
        // create centers of gravity
        this.createRandomWalkers();
        this.initializePlanets(this.options.numPlanets);
        if (this.options.renderPlanets) {
            this.removeMeshes();
            this.addMeshes();
        }
    }

    addMeshes() {
        this.meshes = [];
        for (let i = 0; i < this.options.numPlanets; i++) {
            let geometry = new THREE.SphereGeometry(
                this.options.radii, 64, 32);
            let material = new THREE.MeshPhongMaterial(
                {color: 0x333333, side: THREE.DoubleSide});
            this.meshes.push(new THREE.Mesh(geometry, material));
            this.meshes[i].position.set(this.pos[i].x, this.pos[i].y, this.pos[i].z);
            this.scene.add(this.meshes[i]);
        }
    }

    removeMeshes(scene) {
        for (let i = 0; i < this.meshes.length; i++) {
            this.scene.remove(this.meshes[i])
        }
    }

    setupGUI(options, gui) {

        let planets = this;

        let f = gui.addFolder('Planet parameters');

        // number of masses dropdown
        let mList = [1, 2, 4, 6, 8, 10];
        options.numPlanets = planets.options.numPlanets;
        f.add(options, 'numPlanets', mList).onChange(function() {
            planets.reset();
        });

        // base mass slider
        options.mass = planets.options.mass;
        f.add(options, 'mass', 0.0, 1);

        // gravitational force exponent slider
        options.exponent = planets.options.exponent;
        f.add(options, 'exponent', 0.01, 1.0);

        // speed of random walk slider
        options.speed = planets.options.speed;
        f.add(options, 'speed', 0.0, 0.05);

        // mass sizes slider
        options.radii = planets.options.radii;
        f.add(options, 'radii', 1, 10).onChange(function() {
            if (options.renderPlanets) {
                planets.removeMeshes();
                planets.addMeshes();
            }
        });

        // render masses radio button
        options.renderPlanets = planets.options.renderPlanets;
        f.add(options, 'renderPlanets').onChange(function() {
            if (options.renderPlanets) {
                planets.addMeshes();
            } else {
                planets.removeMeshes();
            }
        });

    }

    sphericalToCartesian(r, theta, phi) {
        if (Math.floor(theta / Math.PI) % 2 === 1) {
            // theta should be in [0, PI], [2 * PI, 3 * PI], etc; if not flip its sign and rotate
            // phi
            theta = -theta;
            phi += Math.PI;
        }
        let x = r * Math.sin(theta) * Math.cos(phi);
        let y = r * Math.sin(theta) * Math.sin(phi);
        let z = r * Math.cos(theta);

        return new THREE.Vector3(x, y, z)
    }

}
