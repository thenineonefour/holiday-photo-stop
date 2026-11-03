// One entry per QR code. The QR for a spot points at  <site>/?spot=<key>
// (or <site>/#<key>). Anything a spot leaves out falls back to "default".
//
//   name        shown on the welcome screen
//   greeting    the big script line on the photo frame
//   sub         the small line under it (keep it short, about 30 characters)
//   theme       "classic" (cranberry + evergreen), "winter" (ice blue), "gold" (navy + gold)
//   frameImage  optional: a 1080x1350 transparent PNG in frames/ that replaces the drawn frame
//   snowman     false hides the snowman on this spot's photo screen
//   until       optional YYYY-MM-DD: after this date the page says the season is over
window.SPOTS = {
  default: {
    name: 'Holiday photo stop',
    greeting: 'Happy Holidays',
    sub: 'Season’s greetings',
    theme: 'classic',
    snowman: true,
  },

  // Demo spots. Swap these for the real locations.
  'gazebo': { name: 'The Gazebo', greeting: 'Happy Holidays', sub: 'Meet me at the gazebo', theme: 'classic' },
  'main-st': { name: 'Main Street', greeting: 'Merry & Bright', sub: 'Main Street lights', theme: 'winter' },
  'library': { name: 'The Library', greeting: 'Season’s Greetings', sub: 'Snow day at the library', theme: 'gold' },
};
