/**
 * Adapted from http://www.geofx.com
 *  @author rkwright
 */

var SCENE = { revision: '03' };

//some constants
var X_AXIS = 0;
var Y_AXIS = 1;
var Z_AXIS = 2;

SCENE.Scene = function(parameters) {

    this.scene = null;
    this.containerID = null;

    // renderer info
    this.renderer = null;
    this.alphaBuffer = false;
    this.clearColor = 0x000000;
    this.autoClear = true;
    this.canvasWidth = 0;
    this.canvasHeight = 0;

    // cameras and defaults
    this.defaultCamera = true;
    this.cameras = [];
    this.camera = undefined;
    this.perspective = true;
    this.fov = 45;
    this.near = 0.5; //0.01;
    this.far = 10000;
    this.cameraPos = [0, 20, 40];
    this.orthoSize = 1;

    // camera controls
    this.controls = false;
    this.orbitControls = [];

    // lighting
    this.defaultLights = true;
    this.ambientLights = [];
    this.directionalLights = [];
    this.pointLights = [];
    this.hemisphereLights = [];
    this.spotLights = [];
    this.shadowMapEnabled = false;
    this.skybox = false;

    // axes
    this.axesHeight = 0;

    // info displays
    this.displayStats = false;
    this.fpStats = null;
    this.msStats = null;
    this.mbStats = null;

    SCENE.setParameters(this, parameters);

    this.initialize();
};

SCENE.setParameters = function(object, values) {

    if (values === undefined) return;

    for (var key in values) {

        var newValue = values[key];

        if (newValue === undefined) {
            console.warn( "SCENE: '" + key + "' parameter is undefined." );
            continue;
        }

        if (key in object) {
            var currentValue = object[key];

            if (currentValue instanceof THREE.Color) {
                currentValue.set(newValue);
            }
            else if (currentValue instanceof THREE.Vector3 && newValue instanceof THREE.Vector3) {
                currentValue.copy(newValue);
            }
            else if (key === 'overdraw') {
                // ensure overdraw is backwards-compatible with legacy bool type
                object[key] = Number(newValue);
            }
            else if (currentValue instanceof Array) {
                object[key] = newValue.slice();
            }
            else {
                object[key] = newValue;
            }
        }
    }
};

// the scene's parameters from the values JSON object
// lifted from MrDoob's implementation in three.js
SCENE.Scene.prototype.initialize = function() {

    if (this.scene !== null) {
        console.error("SCENEScene initialize called twice!");
        return;
    }

    // Create the scene, in which all objects are stored
    // (e. g. camera, lights, geometries, ...)
    this.scene = new THREE.Scene();

    // WINDOW
    // If the user didn't supply a fixed size for the window,
    // get the size of the inner window (content area)
    if (this.canvasHeight === 0) {
        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight;

        // this is needed since "this" references the local object, which in
        // the event handler being called below is the event handler itself,
        // not the SCENE class
        var _self = this;

        // add an event listener to handle changing the size of the window
        window.addEventListener('resize', function() {
            _self.canvasWidth  = window.innerWidth;
            _self.canvasHeight = window.innerHeight;
            var aspect = _self.canvasWidth / _self.canvasHeight;

            if (_self.perspective === true) {
                _self.cameras[0].aspect = aspect;
            } else {
                var w2 = _self.orthoSize * aspect / 2;
                var h2 = _self.orthoSize / 2;

                _self.cameras[0].left   = -w2;
                _self.cameras[0].right  = w2;
                _self.cameras[0].top    = h2;
                _self.cameras[0].bottom = -h2;
            }
            _self.cameras[0].updateProjectionMatrix();
            _self.renderer.setSize( _self.canvasWidth, _self.canvasHeight);
        });
    }

    // SET UP DIV
    // if the caller supplied the container elm ID try to find it
    var container;
    if (this.containerID !== null && typeof this.containerID !== 'undefined')
        container = document.getElementById(this.containerID);
    // couldn't find it, so create it ourselves
    if (container === null || typeof container === 'undefined') {
        container = document.createElement('div');
        document.body.appendChild(container);
    }
    else {
        this.canvasWidth = container.clientWidth;
        this.canvasHeight = container.clientHeight;
    }

    // ALLOCATE THREE.js RENDERER
    this.renderer = new THREE.WebGLRenderer({
        antialias:true,
        alpha: this.alphaBuffer
    });
    this.renderer.autoClear = this.autoClear;
    // Set the background color of the renderer to black or the user-defined
    // color, with full opacity
    this.renderer.setClearColor(new THREE.Color(this.clearColor), 0.2);
    // Set the renderer's size to the content area's size
    this.renderer.setSize(this.canvasWidth, this.canvasHeight);
    // Get the DIV element from the HTML document by its ID and append the
    // renderer's DOM object
    container.appendChild(this.renderer.domElement);


    // set up the camera
    if (this.defaultCamera === true)
        this.setDefaultCamera();

    // if the user hasn't set defaultLights to false, then set them up
    if (this.defaultLights === true)
        this.setDefaultLights();

    // draw axes for orienting
    if (this.axesHeight !== 0)
        this.drawAxes(this.axesHeight);

    // skybox
    if (this.skybox === true)
        this.drawSkybox();

    // set up the stats window(s) if requested
    if (this.displayStats === true)
        this.setupStats(container);

};

SCENE.Scene.prototype.add = function(obj) {
    this.scene.add(obj);
};

SCENE.Scene.prototype.remove = function(obj) {
    this.scene.remove(obj);
};

/**
 * Render the scene. Map the 3D world to the 2D screen.
 */
SCENE.Scene.prototype.renderScene = function(camera) {

    if (this.cameras.length < 1)
        return;

    this.updateControls();
    this.updateStats();

    if (camera === undefined) {
        for (var i = 0; i < this.cameras.length; i++)
            this.renderer.render(this.scene, this.cameras[i]);
    }
    else {
        this.renderer.render(this.scene, camera);
    }
};

/**
 * Set up the camera for the scene.  Perspective or Orthographic
 */
SCENE.Scene.prototype.setDefaultCamera = function(jsonObj) {

    // why is this here?
    if (this.cameras.length > 0)
        this.cameras.pop();

    if (jsonObj === undefined) {
        var newObj = {
            perspective: this.perspective,
            cameraPos: this.cameraPos,
            fov: this.fov,
            near: this.near,
            far: this.far
        };
        return this.addCamera(newObj, 0);
    } else {
        return this.addCamera(jsonObj, 0);
    }
};

SCENE.Scene.prototype.addCamera = function (jsonObj, index) {
    // assign the current/default global values to the local values
    var perspective = this.perspective;
    var cameraPos   = this.cameraPos;
    var fov         = this.fov;
    var near        = this.near;
    var far         = this.far;
    var orthoSize   = this.orthoSize;

    if (jsonObj !== null && jsonObj !== undefined) {
        if (jsonObj.perspective !== undefined)
            perspective = jsonObj.perspective;

        cameraPos   = jsonObj.cameraPos || this.cameraPos;
        fov         = jsonObj.fov || this.fov;
        near        = jsonObj.near || this.near;
        far         = jsonObj.far || this.far;
        orthoSize   = jsonObj.orthoSize || this.orthoSize;
    }

    var camera;
    var aspect = this.canvasWidth / this.canvasHeight;
    if (perspective === true) {
        camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    }
    else {
        var w2 = orthoSize * aspect / 2;
        var h2 = orthoSize / 2;
        camera = new THREE.OrthographicCamera( -w2, w2, h2, -h2, 0.01, 1000);
    }

    camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);
    camera.lookAt(this.scene.position);
    camera.updateProjectionMatrix();

    if (index === undefined)
        this.cameras.push(camera);
    else
        this.cameras.splice(0, 0, camera);

    this.scene.add(camera);

    if (this.controls === true && this.renderer !== null) {
        this.orbitControls[this.cameras.length-1] =
            new THREE.OrbitControls(camera, this.renderer.domElement);
    }

    // set the "default" camera if not already done
    if (this.camera === undefined)
        this.camera = camera;

    return camera;
};

SCENE.Scene.prototype.getCamera = function(index) {
    if (this.cameras.length < 1 || index < 0 || index >= this.cameras.length)
        return null;

    if (index === undefined) {
        return this.cameras[0];
    } else {
        return this.cameras[index];
    }
};

SCENE.Scene.prototype.setDefaultControls = function() {
    if (this.cameras.length > 0)
        this.addControls(this.cameras[0]);
};

SCENE.Scene.prototype.addControls = function(camera) {
    if (camera !== null && typeof camera !== 'undefined') {
        this.orbitControls.push(new THREE.OrbitControls(camera, this.renderer.domElement) );
    }
};

SCENE.Scene.prototype.updateControls = function() {
    for (var i = 0; i < this.orbitControls.length; i++) {
        this.orbitControls[i].update();
    }
};

/**
 * If the user doesn't want to set custom lights, just allocate some defaults
 */
SCENE.Scene.prototype.setDefaultLights = function() {
    // Ambient light has no direction, it illuminates every object with the same
    // intensity. If only ambient light is used, no shading effects will occur.
    var ambLight = new THREE.AmbientLight(0xc0c0c0, 0.75);
    this.scene.add(ambLight);
    this.ambientLights.push(ambLight);

    // Directional light has a source and shines in all directions like the sun
    // This behaviour creates shading effects.
    var dirLight = new THREE.DirectionalLight(0xc0c0c0, 0.5);
    dirLight.position.set(5, 20, 12);
    this.scene.add(dirLight);
    this.directionalLights.push(dirLight);

    var pointLight = new THREE.PointLight(0xc0c0c0, 0.5 );
    pointLight.position.set(-15, 20, 12);
    this.scene.add(pointLight);
    this.pointLights.push(pointLight);
};

SCENE.Scene.prototype.getDefaultLight = function(type) {
    if ( type.indexOf("directional") !== -1 &&
        this.directionalLights.length > 0 ) {
        return this.directionalLights[0];
    }
    else
        return undefined;
};

/**
 * Add one or more lights to the current scene.  If the JSON object is null,
 * then the default lights are used.
 *
 * All lights support color and intensity
 * Supported types of light and their parameters are
 * 	AmbientLight
 *  DirectionalLight
 *    castShadow
 *    position
 *    target
 *  HemisphereLight
 *    castShadow
 *    position
 *    color   (of the sky)
 *    groundColor
 *  PointLight
 *    castShadow
 *    position
 *    decay
 *    power
 *  SpotLight
 *    distance
 *    angle
 *    penumbra
 *    decay
 *
 * @param type
 * @param values
 */
SCENE.Scene.prototype.addLight = function(type, values) {

    var light;
    var color = this.getLightProp('color', values, 0xffffff);
    var intensity = this.getLightProp ('intensity', values, 1);
    var castShadow = this.getLightProp('castShadow', values, false);
    var debug = this.getLightProp('debug', values, false);
    var distance = this.getLightProp('distance', values, 100);
    var decay;

    if (type === 'ambient') {
        light = new THREE.AmbientLight( color, intensity );
        this.ambientLights.push( light );
    }
    else {
        var pos = this.getLightProp('position', values, [0, 10, 0]);

        if (type === 'directional') {
            var target = this.getLightProp('target', values, undefined);
            light = new THREE.DirectionalLight(color, intensity);
            if (this.shadowMapEnabled === true) {
                light.shadow.mapSize.x = 2048;
                light.shadow.mapSize.y = 2048;
                light.shadow.camera.left = -20;
                light.shadow.camera.bottom = -20;
                light.shadow.camera.right = 20;
                light.shadow.camera.top = 20;
            }

            this.directionalLights.push(light);
        }
        else if (type === 'point') {
            distance = this.getLightProp('distance', values, 0);
            decay = this.getLightProp('decay', values, 1);
            light = new THREE.PointLight(color, intensity, distance, decay);
            this.pointLights.push(light);
        }
        else if (type === 'hemisphere') {
            var groundColor = this.getLightProp('groundColor', values, 0x000000);
            light = new THREE.HemisphereLight(color, groundColor, intensity);
            this.hemisphereLights.push(light);
        }
        else if (type === 'spotlight') {
            var angle = this.getLightProp('angle', values, Math.PI/3);
            var penumbra = this.getLightProp('penumbra', values, 0);
            distance = this.getLightProp('distance', values, 0);
            decay = this.getLightProp('decay', values, 1);
            light = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
            this.spotLights.push(light);
        }
        else {
            console.error("Unknown type of light: " + type);
            return undefined;
        }

        light.position.set(pos[0], pos[1], pos[2]);
        light.castShadow = castShadow;
        if (debug === true) {
            var helper = new THREE.CameraHelper( light.shadow.camera );
            this.scene.add( helper );
            //light.shadowCameraVisible = true;
        }
    }

    this.scene.add( light );

    return light;
};

SCENE.Scene.prototype.getLightProp = function(prop, values, def) {
    var value = values[ prop ];
    return ( value === undefined ) ? def : value;
};

SCENE.Scene.prototype.clearAllLights = function() {

    this.clearLights( this.ambientLights );
    this.clearLights( this.directionalLights );
    this.clearLights( this.pointLights );
    this.clearLights( this.spotLights );
    this.clearLights( this.hemisphereLights );
};

/**
 * Remove all the lights from the specified array
 */
SCENE.Scene.prototype.clearLights = function(lightArray) {

    while (lightArray.length > 0) {
        this.scene.remove(lightArray.pop());
    }
};

SCENE.Scene.prototype.drawAxis = function(axis, axisColor, axisHeight) {

    var AXIS_RADIUS   =	axisHeight/200.0;
    var	AXIS_HEIGHT   =	axisHeight;
    var	AXIS_STEP     =	axisHeight/20.0;
    var AXIS_SEGMENTS = 32;
    var	AXIS_GRAY     = 0x777777;
    var	AXIS_WHITE    = 0xEEEEEE;
    var curColor;

    for (var i = 0; i < (AXIS_HEIGHT/AXIS_STEP); i++) {

        var pos = -AXIS_HEIGHT / 2 + i * AXIS_STEP;

        if ((i & 1) === 0)
            curColor = axisColor;
        else if (pos < 0)
            curColor = AXIS_GRAY;
        else
            curColor = AXIS_WHITE;

        var geometry = new THREE.CylinderGeometry(
            AXIS_RADIUS, AXIS_RADIUS, AXIS_STEP, AXIS_SEGMENTS);
        var material = new THREE.MeshLambertMaterial({color: curColor});
        var cylinder = new THREE.Mesh(geometry, material);

        pos += AXIS_STEP/2.0;
        if (axis === X_AXIS) {
            cylinder.position.x = pos;
            cylinder.rotation.z = Math.PI/2;
        } else if (axis === Y_AXIS) {
            cylinder.rotation.y = Math.PI/2;
            cylinder.position.y = pos;
        } else {
            cylinder.position.z = pos;
            cylinder.rotation.x = Math.PI/2;
        }
        this.scene.add(cylinder);
    }
};

SCENE.Scene.prototype.drawAxes = function(height) {
    this.drawAxis(X_AXIS, 0xff0000, height);
    this.drawAxis(Y_AXIS, 0x00ff00, height);
    this.drawAxis(Z_AXIS, 0x0000ff, height);
};

SCENE.Scene.prototype.drawSkybox = function() {

    // why doesn't this work?
    // var paths = [
    //     'front.png', 'back.png',
    //     'left.png', 'right.png',
    //     'up.png', 'down.png'
    // ];
    // var loader = new THREE.CubeTextureLoader();
    // loader.setPath('images/stars/');
    // this.scene.background = loader.load(paths);

    // from https://stemkoski.github.io/Three.js/Skybox.html
    // var path = 'images/stars/';
    // var images  = ['front', 'back', 'left', 'right', 'up', 'down'];
    var path = 'images/ame_starfield/starfield_';
    var images  = ['ft', 'bk', 'lf', 'rt', 'up', 'dn'];
    var format = '.png';
    var geometry = new THREE.CubeGeometry(5000, 5000, 5000);

    var materialArray = [];
    for (var i = 0; i < 6; i++)
        materialArray.push(new THREE.MeshBasicMaterial({
            map: THREE.ImageUtils.loadTexture(path + images[i] + format),
            side: THREE.BackSide
        }));
    var material = new THREE.MeshFaceMaterial(materialArray);
    var skyBox = new THREE.Mesh(geometry, material);
    this.scene.add(skyBox);

};

SCENE.Scene.prototype.setupStats = function(container) {
    var pos = 0;

    if (this.displayStats === true || this.displayStats.indexOf("fps") !== -1) {
        this.fpStats = new Stats();
        this.fpStats.showPanel(0);
        this.fpStats.dom.style.left = pos + 'px';
        pos += 80;
        container.appendChild( this.fpStats.dom );
    }

    if (typeof this.displayStats === 'string' && this.displayStats.indexOf("ms") !== -1) {
        this.msStats = new Stats();
        this.msStats.showPanel(1);
        //this.msStats.domElement.style.position = 'absolute';
        //this.msStats.domElement.style.bottom = '0px';
        this.msStats.dom.style.left = pos + 'px';
        pos += 80;
        //this.msStats.domElement.style.zIndex = 100;
        container.appendChild( this.msStats.dom );
    }

    if (typeof this.displayStats === 'string' && this.displayStats.indexOf("mb") !== -1) {
        this.mbStats = new Stats();
        this.mbStats.showPanel(2);
        this.mbStats.dom.style.left = pos + '80px';
        container.appendChild( this.mbStats.dom );
    }
};

SCENE.Scene.prototype.updateStats = function() {
    if (this.fpStats !== null && typeof this.fpStats !== 'undefined')
        this.fpStats.update();
    if (this.msStats !== null && typeof this.msStats !== 'undefined')
        this.msStats.update();
    if (this.mbStats !== null && typeof this.mbStats !== 'undefined')
        this.mbStats.update();
};
