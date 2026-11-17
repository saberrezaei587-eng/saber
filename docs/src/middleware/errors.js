function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} was not found` }
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON' }
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' }
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected server error occurred' }
  });
}

module.exports = { notFoundHandler, errorHandler };
