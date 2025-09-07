import * as THREE from 'three';
import { CAMERA_CONFIG } from '../config.js';

export class FPSCameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.enabled = true;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isSprinting = false;

    // Separate yaw/pitch objects
    this.yawObject = new THREE.Object3D();
    this.pitchObject = new THREE.Object3D();
    this.pitchObject.add(camera);
    this.yawObject.add(this.pitchObject);
    this.yawObject.position.set(
      CAMERA_CONFIG.START_POSITION.x,
      CAMERA_CONFIG.START_POSITION.y,
      CAMERA_CONFIG.START_POSITION.z
    );

    this.PI_2 = Math.PI / 2;
    this.pointerLocked = false;

    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._lookSensitivity = 0.0021;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    this._onPointerLockError = this._onPointerLockError.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);

    this._setupEvents();
  }

  getObject() {
    return this.yawObject;
  }

  _setupEvents() {
    document.addEventListener('mousemove', this._onMouseMove, false);
    document.addEventListener('pointerlockchange', this._onPointerLockChange, false);
    document.addEventListener('pointerlockerror', this._onPointerLockError, false);
    document.addEventListener('keydown', this._onKeyDown, false);
    document.addEventListener('keyup', this._onKeyUp, false);
  }

  dispose() {
    document.removeEventListener('mousemove', this._onMouseMove, false);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange, false);
    document.removeEventListener('pointerlockerror', this._onPointerLockError, false);
    document.removeEventListener('keydown', this._onKeyDown, false);
    document.removeEventListener('keyup', this._onKeyUp, false);
  }

  lock(e) {
    if (e && e.target && e.target.closest && e.target.closest('.ui-block')) {
      return;
    }
    this.domElement.requestPointerLock();
  }

  unlock() {
    document.exitPointerLock();
  }

  _onPointerLockChange() {
    this.pointerLocked = document.pointerLockElement === this.domElement;
  }

  _onPointerLockError() {
    console.error('PointerLock Error');
  }

  _onMouseMove(event) {
    if (!this.pointerLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    this._euler.setFromQuaternion(this.yawObject.quaternion);

    this._euler.y -= movementX * this._lookSensitivity;
    this._euler.x -= movementY * this._lookSensitivity;

    this._euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this._euler.x));
    this.yawObject.quaternion.setFromEuler(this._euler);
  }

  _onKeyDown(e) {
    switch (e.code) {
      case 'KeyW': this.moveForward = true; break;
      case 'KeyA': this.moveLeft = true; break;
      case 'KeyS': this.moveBackward = true; break;
      case 'KeyD': this.moveRight = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.isSprinting = true; break;
      case 'Escape': this.unlock(); break;
      default: break;
    }
  }

  _onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': this.moveForward = false; break;
      case 'KeyA': this.moveLeft = false; break;
      case 'KeyS': this.moveBackward = false; break;
      case 'KeyD': this.moveRight = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.isSprinting = false; break;
      default: break;
    }
  }

  update(delta, reducedMotion) {
    if (!this.enabled) return;

    const accel = reducedMotion ? CAMERA_CONFIG.REDUCED_MOTION_ACCEL : CAMERA_CONFIG.ACCELERATION;
    const damping = reducedMotion ? CAMERA_CONFIG.REDUCED_MOTION_DAMPING : CAMERA_CONFIG.DAMPING;

    this.direction.set(0,0,0);
    if (this.moveForward) this.direction.z -= 1;
    if (this.moveBackward) this.direction.z += 1;
    if (this.moveLeft) this.direction.x -= 1;
    if (this.moveRight) this.direction.x += 1;

    if (this.direction.lengthSq() > 0) {
      this.direction.normalize();
      const yaw = this.yawObject.rotation.y;
      // Movement relative to yaw only (ignore pitch)
      const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).negate();
      const wish = new THREE.Vector3();
      wish.addScaledVector(forward, this.direction.z);
      wish.addScaledVector(right, this.direction.x);
      wish.normalize();

      const targetSpeed = CAMERA_CONFIG.MAX_SPEED * (this.isSprinting ? CAMERA_CONFIG.SPRINT_MULTIPLIER : 1);
      this.velocity.addScaledVector(wish, accel * delta);
      if (this.velocity.length() > targetSpeed) {
        this.velocity.setLength(targetSpeed);
      }
    } else {
      // Damping when not pressing keys
      this.velocity.multiplyScalar(Math.max(0, 1 - damping * delta));
      if (this.velocity.length() < 0.01) {
        this.velocity.set(0,0,0);
      }
    }

    // Apply translation
    const offset = this.velocity.clone().multiplyScalar(delta);
    this.yawObject.position.add(offset);

    // Clamp boundaries
    const p = this.yawObject.position;
    p.x = Math.min(Math.max(p.x, CAMERA_CONFIG.BOUNDS.minX), CAMERA_CONFIG.BOUNDS.maxX);
    p.z = Math.min(Math.max(p.z, CAMERA_CONFIG.BOUNDS.minZ), CAMERA_CONFIG.BOUNDS.maxZ);
  }
}