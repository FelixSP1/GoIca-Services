import jwt from 'jsonwebtoken';

export const authRequired = (req,res,next) =>{
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ message: 'Usuario Sin Token'});
    }

    const token = authHeader.split(' ')[1]; //separar el "Bearer" del Token

    if (!token) {
        return res.status(401).json({ message: 'Token mal generado'});
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({message: 'Token Invalido'});
        }

        //Guardar Objeto
        req.user = user;

        next();
    })
}