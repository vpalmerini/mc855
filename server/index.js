const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const logger = require('./log');
const HttpServer = require('./http-server');

const map = {};

function forkWorker(worker_id) {
  const worker = cluster.fork({
    worker_id: worker_id,
  });
  map[worker.id] = worker_id;
}

if (cluster.isMaster) {

  //fork worker threads
  for (let iWorker = 0; iWorker < numCPUs; iWorker++) {
    forkWorker(iWorker + 1);
  }

  cluster.on('online', (worker) => {
  });

  cluster.on('listening', (worker, address) => {
  });

  cluster.on('exit', (worker, code, signal) => {
    const oldWorkerId = map[worker.id];
    delete map[worker.id];
    forkWorker(oldWorkerId);
  });

  Object.keys(cluster.workers).forEach((id) => {
    cluster.workers[id].on('message', (msg) => {
      cluster.workers[msg.id].send(msg);
    });
  });
} else {
  logger.info(module.filename, 'Worker #', process.env.worker_id);
  new HttpServer(8080).startServer();
}
