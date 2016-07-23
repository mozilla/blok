if (process.env.MODE === 'production') {
  exports.log = function noop(){};
} else {
  exports.log = console.log.bind(console);
}
