/**
 * Adapted from:
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 *
 * TODO
 * add variable speed for rotational/translational movement
 */

// dict of key states to hold persistent key press info
keyStates = {};
// only pay attention to standard ASCII keys
for (var i = 32; i < 128; i++) {
    var c = String.fromCharCode(i);
    // console.log('key ' + i + ': ' + c);
    keyStates[c] = false;
}
keyStates['arrowright'] = false;
keyStates['arrowleft'] = false;
keyStates['arrowup'] = false;
keyStates['arrowdown'] = false;
keyStates['control'] = false;
keyStates['alt'] = false;
keyStates['shift'] = false;

THREE.OrbitControls = function(camera, domElement) {

    this.camera = camera;
    // this.domElement = (domElement !== undefined) ? domElement : document;

    this.enabled = true;

    this.userZoomSpeed = 1.0;
    this.userRotateSpeed = 0.01;
    this.userPanSpeed = 0.1;

    // start near origin facing along y-axis
    this.position0 = new THREE.Vector3(
        camera.position.x,
        camera.position.y,
        camera.position.z);
    this.horizontalAngle0 = 0.0;
    this.verticalAngle0 = Math.PI / 2;

    this.position = this.position0;
    this.horizontalAngle = this.horizontalAngle0;
    this.verticalAngle = this.verticalAngle0;

    // update heading
    this.heading = new THREE.Vector3(
        Math.cos(this.horizontalAngle) * Math.sin(this.verticalAngle),
        Math.sin(this.horizontalAngle) * Math.sin(this.verticalAngle),
        Math.cos(this.verticalAngle)
    );
    // right vector
    this.right = new THREE.Vector3(
        Math.cos(this.horizontalAngle - Math.PI / 2),
        Math.sin(this.horizontalAngle - Math.PI / 2),
        0
    );
    // up vector
    this.up = new THREE.Vector3(0.0, 0.0, 0.0);
    this.up.crossVectors(this.right, this.heading);

    // events
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);

    // document.addEventListener('keydown', onKeyDown, false);
    // document.addEventListener('keyup', onKeyUp, false);

};

// subclass event dispatcher
THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);

THREE.OrbitControls.prototype.moveRight = function(distance) {
    this.position.addScaledVector(this.right.clone(), distance);
};
THREE.OrbitControls.prototype.moveLeft = function(distance) {
    this.position.addScaledVector(this.right.clone(), -distance);
};
THREE.OrbitControls.prototype.moveUp = function(distance) {
    this.position.addScaledVector(this.up.clone(), distance);
};
THREE.OrbitControls.prototype.moveDown = function(distance) {
    this.position.addScaledVector(this.up.clone(), -distance);
};
THREE.OrbitControls.prototype.moveForward = function(distance) {
    this.position.addScaledVector(this.heading.clone(), distance);
};
THREE.OrbitControls.prototype.moveBackward = function(distance) {
    this.position.addScaledVector(this.heading.clone(), -distance);
};
THREE.OrbitControls.prototype.rotateUp = function(rotationAngle) {
    this.verticalAngle -= rotationAngle; // we're in standard spherical coords
    if (this.verticalAngle < 0) {
        this.verticalAngle = 0;
    }
};
THREE.OrbitControls.prototype.rotateDown = function(rotationAngle) {
    this.verticalAngle += rotationAngle;
    if (this.verticalAngle > Math.PI) {
        this.verticalAngle = Math.PI;
    }
};
THREE.OrbitControls.prototype.rotateRight = function(rotationAngle) {
    this.horizontalAngle -= rotationAngle;
};
THREE.OrbitControls.prototype.rotateLeft = function(rotationAngle) {
    this.horizontalAngle += rotationAngle;
};

THREE.OrbitControls.prototype.update = function () {

    this.handleKeys();

    // update heading information
    this.heading.set(
        Math.cos(this.horizontalAngle) * Math.sin(this.verticalAngle),
        Math.sin(this.horizontalAngle) * Math.sin(this.verticalAngle),
        Math.cos(this.verticalAngle)
    );
    // right vector
    this.right.set(
        Math.cos(this.horizontalAngle - Math.PI / 2),
        Math.sin(this.horizontalAngle - Math.PI / 2),
        0
    );
    // up vector
    this.up.crossVectors(this.right, this.heading);

    this.camera.position.set(this.position.x, this.position.y, this.position.z);
    this.camera.up.set(this.up.x, this.up.y, this.up.z);

    this.camera.lookAt(this.position.clone().add(this.heading));

    // if ( this.lastPosition.distanceTo( this.camera.position ) > 0 ) {
    //
        // this.dispatchEvent( this.changeEvent );
        //
        // this.lastPosition.copy( this.camera.position );
    //
    // }

};

THREE.OrbitControls.prototype.handleKeys = function() {
    // move right
    if (keyStates['arrowright']) {
        this.moveRight(this.userPanSpeed);
    }
    // move left
    if (keyStates['arrowleft']) {
        this.moveLeft(this.userPanSpeed);
    }
    // move up
    if (keyStates['arrowup'] && keyStates['shift']) {
        this.moveUp(this.userPanSpeed);
    }
    // move down
    if (keyStates['arrowdown'] && keyStates['shift']) {
        this.moveDown(this.userPanSpeed);
    }
    // move forward
    if (keyStates['arrowup'] && !keyStates['shift']) {
        this.moveForward(this.userPanSpeed);
    }
    // move backward
    if (keyStates['arrowdown'] && !keyStates['shift']) {
        this.moveBackward(this.userPanSpeed);
    }
    // rotate up
    if (keyStates['w']) {
        this.rotateUp(this.userRotateSpeed);
    }
    // rotate down
    if (keyStates['s']) {
        this.rotateDown(this.userRotateSpeed);
    }
    // rotate right
    if (keyStates['d']) {
        this.rotateRight(this.userRotateSpeed);
    }
    // rotate up
    if (keyStates['a']) {
        this.rotateLeft(this.userRotateSpeed);
    }
};

onKeyDown = function(event) {
    var key = event.key.toLowerCase();
    if (key in keyStates) {
        keyStates[key] = true;
    }
};

onKeyUp = function(event) {
    var key = event.key.toLowerCase();
    if (key in keyStates) {
        keyStates[key] = false;
    }
};