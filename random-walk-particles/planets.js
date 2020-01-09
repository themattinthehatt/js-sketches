
class Planets {

    constructor(options, scene) {

        this.scene = scene;
        this.options = options;
        // numPlanets
        // mass
        // exponent
        // speed
        // radii
        // renderPlanets

        this.pos = [];           // location of each planet
        this.vel = [];           // velocity of each planet
        this.acc = [];           // acceleration of each planet
        this.masses = [];        // mass of each planet
        this.meshes = [];
        this.randomWalkers = [];

        this.initialize();

    }

    initialize() {
        this.initializePlanets();   // pos, vel, acc
        this.createRandomWalkers(); // updates to acc
        if (this.options.renderPlanets) {
            this.addMeshes()
        }
    }

    initializePlanets(numPlanets) {
        this.numPlanets = numPlanets || this.options.numPlanets;
        this.pos = [];
        this.vel = [];
        this.acc = [];
        this.masses = [];
        for (let i = 0; i < this.options.numPlanets; i++) {
            let pos = new THREE.Vector3(
                100 * (Math.random() - 0.5),
                100 * (Math.random() - 0.5),
                100 * (Math.random() - 0.5));
            this.pos.push(pos);
            this.vel.push(new THREE.Vector3(0.0, 0.0, 0.0));
            this.acc.push(new THREE.Vector3(0.0, 0.0, 0.0));
            this.masses.push(this.options.mass)
        }
    }

    createRandomWalkers() {
        this.randomWalkers = [];
        for (let i = 0; i < this.options.numPlanets; i++) {
            this.randomWalkers.push(new CartesianRandomWalker(10))
        }
    }

    update() {
        for (let i = 0; i < this.options.numPlanets; i++) {
            let acc = this.randomWalkers[i].getNextVal();
            this.vel[i].addScaledVector(acc, this.options.speed);
            this.pos[i].add(this.vel[i]);
            if (this.options.renderPlanets) {
                this.meshes[i].position.set(this.pos[i].x, this.pos[i].y, this.pos[i].z);
                this.meshes[i].geometry.verticesNeedUpdate = true
            }
        }
    }

    reset() {
        // create centers of gravity
        this.initializePlanets(this.options.numPlanets);
        this.createRandomWalkers();
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

        let planets_ = this;

        let f = gui.addFolder('Planet parameters');

        // number of masses dropdown
        let mList = [1, 2, 4, 6, 8, 10];
        options.numPlanets = planets_.options.numPlanets;
        f.add(options, 'numPlanets', mList).onChange(function() {
            planets_.reset();
        });

        // base mass slider
        options.mass = planets_.options.mass;
        f.add(options, 'mass', 0.0, 1.0);

        // gravitational force exponent slider
        options.exponent = planets_.options.exponent;
        f.add(options, 'exponent', 0.1, 2.0);

        // speed of random walk slider
        options.speed = planets_.options.speed;
        f.add(options, 'speed', 0.0, 0.1);

        // mass sizes slider
        options.radii = planets_.options.radii;
        f.add(options, 'radii', 1, 10).onChange(function() {
            if (options.renderPlanets) {
                planets_.removeMeshes();
                planets_.addMeshes();
            }
        });

        // render masses radio button
        options.renderPlanets = planets_.options.renderPlanets;
        f.add(options, 'renderPlanets').onChange(function() {
            if (options.renderPlanets) {
                planets_.addMeshes();
            } else {
                planets_.removeMeshes();
            }
        });

    }

}
