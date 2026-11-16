// Rapid Rush — input: keyboard and mouse, both steering the same raft.
// The game never reads keys directly; it reads this state, so the loop,
// the screenshot simulations and a future touch layer all steer alike.

export function createInput(canvas) {
  const input = {
    left: false,
    right: false,
    paddleHeld: false,
    paddlePressed: false, // one-shot: true for a single frame after a press
    pausePressed: false,
    restartPressed: false,
    startPressed: false,
    anyPressed: false,
    mouseX: null, // logical x the pointer wants, or null when idle
    mouseActive: false,
  };

  const KEY_ACTIONS = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'paddle', ArrowUp: 'paddle', KeyW: 'paddle',
    KeyP: 'pause', Escape: 'pause',
    KeyR: 'restart',
    Enter: 'start',
  };

  function onKeyDown(event) {
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    event.preventDefault();
    if (event.repeat) return;
    input.anyPressed = true;
    if (action === 'left') input.left = true;
    if (action === 'right') input.right = true;
    if (action === 'paddle') {
      input.paddleHeld = true;
      input.paddlePressed = true;
    }
    if (action === 'pause') input.pausePressed = true;
    if (action === 'restart') input.restartPressed = true;
    if (action === 'start') input.startPressed = true;
  }

  function onKeyUp(event) {
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    if (action === 'left') input.left = false;
    if (action === 'right') input.right = false;
    if (action === 'paddle') input.paddleHeld = false;
  }

  function pointerX(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / canvas.width;
    return (event.clientX - rect.left) / scale;
  }

  function onPointerMove(event) {
    input.mouseX = pointerX(event);
    input.mouseActive = true;
  }

  function onPointerDown(event) {
    input.anyPressed = true;
    input.mouseX = pointerX(event);
    input.mouseActive = true;
    input.paddleHeld = true;
    input.paddlePressed = true;
    event.preventDefault();
  }

  function onPointerUp() {
    input.paddleHeld = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  // One-shot flags live for exactly one frame; the loop calls this after
  // it has read them.
  input.consumePresses = function consumePresses() {
    input.paddlePressed = false;
    input.pausePressed = false;
    input.restartPressed = false;
    input.startPressed = false;
    input.anyPressed = false;
  };

  return input;
}

// A scripted stand-in for screenshots: steers toward a target x and
// paddles on a fixed rhythm, so a seeded run always plays the same way.
export function createScriptedInput() {
  return {
    left: false,
    right: false,
    paddleHeld: false,
    paddlePressed: false,
    pausePressed: false,
    restartPressed: false,
    startPressed: false,
    anyPressed: false,
    mouseX: null,
    mouseActive: false,
    consumePresses() {
      this.paddlePressed = false;
      this.pausePressed = false;
      this.restartPressed = false;
      this.startPressed = false;
      this.anyPressed = false;
    },
  };
}
