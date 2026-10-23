// Every successful response has the shape { data, meta? } and every error { error: { code, message, details? } }.
// Keeping one envelope makes the client's fetch wrapper trivial.

export function ok(res, data, meta) {
  return res.status(200).json(meta ? { data, meta } : { data });
}

export function created(res, data) {
  return res.status(201).json({ data });
}

export function paginationMeta({ total, page, limit }) {
  return {
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
