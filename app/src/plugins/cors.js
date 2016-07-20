const cors = require('kcors');

function init() {

}

function middleware(app) {
    app.use(cors({
        allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
        credentials: true,
    }));
}


module.exports = {
    middleware,
    init,
};
