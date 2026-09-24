// Shared input state written by the on-screen touch controls (UIScene)
// and read by the player alongside the keyboard (GameScene).
export const touchInput = {
  x: 0, // -1..1
  y: 0, // -1..1
  attack: false, // set on press, cleared by the game once handled
};
