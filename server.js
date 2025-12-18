
import express from 'express';
import session from 'express-session'
import FileStore from 'session-file-store';
import path from "path";
import apiRoutes from '#src/router/index';




const app = express();


app.use(express.json());

const FileSessionStore = FileStore(session);


app.use(session({

    store: new FileSessionStore({
        path: './sessions',
        retries: 0,
        ttl: 30 * 24 * 60 * 60,
    }),
    secret: '648b308c-7b71-4e7e-b913-845f8b409824',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 30 * 24 * 60 * 60 // Session 有效期 1 天（毫秒）
    }
}));


//写死 用户id
app.use((req, res, next) => {
    req.session.user_id = 1;
    next();
});

app.use(express.static(path.join(process.cwd(), 'public'), {
    setHeaders: (res, path, stat) => {
        // 禁止缓存
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Surrogate-Control', 'no-store');
    }
}));


app.use('/', apiRoutes);

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('====================================');
    console.log(`✅ Proxy running on http://127.0.0.1:${PORT}`);
    console.log('====================================');
});
