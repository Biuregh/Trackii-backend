
module.exports = (err, req, res, next) => {
    console.error(err);

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Server error";

    const payload = { message };
    if (err.errors && Array.isArray(err.errors)) {
        payload.errors = err.errors;
    }

    res.status(status).json(payload);
};
