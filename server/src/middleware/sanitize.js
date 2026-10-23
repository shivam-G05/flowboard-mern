// Removes MongoDB operator keys ("$where", "$gt", ...) and dotted keys from request bodies.
// Validation already rejects these; this is a second layer in case a route forgets to validate.
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) delete value[key];
      else value[key] = clean(value[key]);
    }
  }
  return value;
}

export function sanitizeBody(req, _res, next) {
  if (req.body) clean(req.body);
  next();
}
