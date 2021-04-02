const express = require('express');
const http = require('http');
const logger = require('./log');

class HttpServer {

  constructor(port) {
    this._listeningPort = port;
    this._app = express();
    this._setupServer();
    this._setupControllers();
    this._setupMiddlewaresForErrorHandler();
    this._server = {};
  }

  /**
   * Starts Http Server
   * Installs listener listening and error event handlers
   */
  startServer() {
    this._server = http.createServer(this._app);
    this._server.listen(this._listeningPort, '0.0.0.0');
    this._server.on('error', this._onServerError);
    this._server.on('listening', this._onServerListening);
  }

  /**
   * Setup server request processing
   *
   * @private
   */
  _setupServer() {
    this._app.set('port', this._listeningPort);
    this._app.use(express.json({ limit: '2mb' }));
    this._app.use(express.urlencoded({ limit: '2mb', extended: true }));
  }

  /**
   * Handles server listening event
   *
   * @private
   */
  _onServerListening() {
    logger.info('Server is running');
  }

  /**
   * Handles server error event
   *
   * @param error  Error threw by server
   * @private
   */
  _onServerError(error) {
    switch (error.code) {
      case 'EACCES':
        logger.info(this._listeningPort + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        logger.error(this._listeningPort + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

  /**
   * Setup routes this server is able to handle
   *
   * @private
   */
  _setupControllers() {
    this._app.use((request, response, next) => {
      response.header("Access-Control-Allow-Origin", "*");
      response.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
      next();
    });
    this._app.get('/health-check', (req, res) => res.end("healthy"));
  }

  /**
   * Setup middlewares for http errors handling
   * @private
   */
  _setupMiddlewaresForErrorHandler() {

    this._app.use((req, res, next) => {

      logger.warn('URL: ' + req.originalUrl +
        ' Requester IP: ' + req.headers["x-forwarded-for"] + ' hitting port: ' + req.headers["x-forwarded-port"] +
        ' with protocol: ' + req.headers["x-forwarded-proto"]);
      const err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    if (this._app.get('env') === 'development') {
      this._app.use(function (err, req, res, next) {
        logger.error(err);
        res.status(err.status || 500);
        res.json({ 'code': err.code, 'description': err });
      });
    } else if (this._app.get('env') === 'production') {
      this._app.use(function (err, req, res, next) {
        logger.error(err);
        res.status(err.status || 500);
        res.json({ 'code': err.code, 'description': err.message });
      });
    }

  }

  get listeningPort() {
    return this._listeningPort
  }

}

module.exports = HttpServer;
