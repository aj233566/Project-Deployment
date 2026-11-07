function resolvePort(environment = process.env) {
  const candidate = environment.PORT || environment.RPORT;
  const port = Number(candidate);
  if (Number.isInteger(port) && port > 0 && port <= 65535) {
    return port;
  }
  return 5000;
}
module.exports = { resolvePort };
