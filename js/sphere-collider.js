module.exports = {
  schema: {
    objects: {default: ''},
    state: {default: 'collided'},
    radius: {default: 0.05},
    watch: {default: true}
  },

  init: function () {
    /** @type {MutationObserver} */
    this.observer = null;
    /** @type {Array<Element>} Elements to watch for collisions. */
    this.els = [];
    /** @type {Array<Element>} Elements currently in collision state. */
    this.collisions = [];

    this.handleHit = this.handleHit.bind(this);
  },

  remove: function () {
    this.pause();
  },

  play: function () {
    var sceneEl = this.el.sceneEl;

    if (this.data.watch) {
      this.observer = new MutationObserver(this.update.bind(this, null));
      this.observer.observe(sceneEl, {childList: true, subtree: true});
    }
  },

  pause: function () {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  },

  /**
   * Update list of entities to test for collision.
   */
  update: function () {
    var data = this.data;
    var objectEls;

    // Push entities into list of els to intersect.
    if (data.objects) {
      objectEls = this.el.sceneEl.querySelectorAll(data.objects);
    } else {
      // If objects not defined, intersect with everything.
      objectEls = this.el.sceneEl.children;
    }
    // Convert from NodeList to Array
    this.els = Array.prototype.slice.call(objectEls);
  },

  tick: (function () {
    var position = new THREE.Vector3(),
        meshPosition = new THREE.Vector3(),
        distanceMap = new Map();
    return function () {
      var el = this.el,
          data = this.data,
          mesh = el.getObject3D('mesh'),
          collisions = [];

      if (!mesh) { return; }

      distanceMap.clear();
      position.copy(el.object3D.getWorldPosition());

      // Update collision list.
      this.els.forEach(intersect);

      // Emit events and add collision states, in order of distance.
      collisions
        .sort(function (a, b) {
          return distanceMap.get(a) > distanceMap.get(b) ? 1 : -1;
        })
        .forEach(this.handleHit);

      // Remove collision state from current element.
      if (collisions.length === 0) { el.emit('hit', {el: null}); }

      // Remove collision state from other elements.
      this.collisions.filter(function (el) {
        return !distanceMap.has(el);
      }).forEach(function removeState (el) {
        el.removeState(data.state);
      });

      // Store new collisions
      this.collisions = collisions;

      // Bounding sphere collision detection
      function intersect (el) {
        var radius, mesh, distance;

        if (!el.isEntity) { return; }

        mesh = el.getObject3D('mesh');

        if (!mesh || !mesh.geometry) { return; }

        mesh.getWorldPosition(meshPosition);
        mesh.geometry.computeBoundingSphere();
        radius = mesh.geometry.boundingSphere.radius;
        distance = position.distanceTo(meshPosition);
        if (distance < radius + data.radius) {
          collisions.push(el);
          distanceMap.set(el, distance);
        }
      }
    };
  })(),

  handleHit: function (targetEl) {
    targetEl.emit('hit');
    targetEl.addState(this.data.state);
    this.el.emit('hit', {el: targetEl});
  }
};