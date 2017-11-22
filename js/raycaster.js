AFRAME.registerComponent('my-component', {
  dependencies: ['raycaster'],
  init: function () {
    this.raycaster = this.el.components.raycaster;
  }
});