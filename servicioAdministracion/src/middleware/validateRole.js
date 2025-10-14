export const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.rol)) {
            return res.status(403).json({ message: "Acceso denegado, No tienes los permisos correspondientes." });
        }
        next();
    };
};