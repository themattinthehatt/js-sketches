/**
 * Random walk classes - 3D cartesian, spherical
 * Random
 */

class RandomWalker {

    constructor(numSamples) {
        /*
        Returns values from a 1D Gaussian noise process that is smoothed by averaging over previous
        random values (moving average filter); values will lie approximately between -1 and 1

        Args:
            numSamples: samples used in moving average filter
        */

        this.numSamples = numSamples;
        this.noiseIdx = 0;            // counter in noise array
        this.noiseSamples = new Array(numSamples);
        this.reinitialize();
    }

    reinitialize() {
        for (let i = 0; i < this.noiseSamples.length; i++) {
            this.noiseSamples[i] = randn();
        }
        this.noiseIdx = 0;
    }

    getNextVal() {
        // update noise samples
        this.noiseSamples[this.noiseIdx] = randn();
        this.noiseIdx = (this.noiseIdx + 1) % this.numSamples;
        let sum = this.noiseSamples.reduce((previous, current) => current += previous);
        let avg = sum / this.noiseSamples.length;
        return avg * Math.sqrt(this.numSamples) / 3.0
    }
}

class CartesianRandomWalker {

    constructor(n_samples) {
        this.x = new RandomWalker(n_samples);
        this.y = new RandomWalker(n_samples);
        this.z = new RandomWalker(n_samples);
    }

    reinitialize() {
        this.x.reinitialize();
        this.y.reinitialize();
        this.z.reinitialize();
    }

    getNextVal() {
        return new THREE.Vector3(this.x.getNextVal(), this.y.getNextVal(), this.z.getNextVal())
    }
}

// Standard Normal variate using Box-Muller transform.
// https://stackoverflow.com/a/36481059
function randn() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}