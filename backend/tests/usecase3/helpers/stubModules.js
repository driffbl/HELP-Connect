const Module = require('node:module');

/**
 * Makes require('express') and require('jsonwebtoken') return fakes, because this project's
 * dependencies are not needed to check how routes are wired. Returns a function that undoes it.
 */
function stubModules(map) {
  const original = Module._load;
  Module._load = function (request, ...rest) {
    if (Object.prototype.hasOwnProperty.call(map, request)) return map[request];
    return original.call(this, request, ...rest);
  };
  return () => { Module._load = original; };
}

/** A tiny Router that only records what was registered. */
function fakeExpress() {
  function Router() {
    const router = { routes: [], mounts: [] };
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      router[method] = (path, ...handlers) => router.routes.push({ method: method.toUpperCase(), path, handlers });
    }
    router.use = (path, child) => router.mounts.push({ path, child });
    return router;
  }
  return { Router };
}

/** Flattens a router and everything mounted on it into [{ method, path, handlers }]. */
function flatten(router, prefix = '') {
  const own = router.routes.map((r) => ({ method: r.method, path: (prefix + r.path).replace(/\/$/, '') || '/', handlers: r.handlers }));
  return own.concat(...router.mounts.map((m) => flatten(m.child, prefix + m.path)));
}

module.exports = { stubModules, fakeExpress, flatten };
