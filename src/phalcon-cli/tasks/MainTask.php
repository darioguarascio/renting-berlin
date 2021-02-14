<?php

use Phalcon\Cli\Task;

use Longman\TelegramBot\TelegramLog;
use Monolog\Formatter\LineFormatter;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;


class MainTask extends Task {

    /**
     * Command to fill up check queue
     * 
     * @see `docker-compose run --rm cli pcli main load`
     */
    public function loadAction(array $params = array()) {
        Resque::setBackend( getenv('REDIS_ADDRESS') );
        Resque::dequeue('check');

        $logger = new Monolog\Logger('worker', [
            new Monolog\Handler\StreamHandler('php://stdout', Psr\Log\LogLevel::DEBUG)
        ]);

        $redis = new \Redis;
        list($host,$port) = explode(':', getenv('REDIS_ADDRESS'));
        $redis->pconnect($host,$port);

        $it = NULL;
        do {
            $arr_keys = $redis->scan($it, 'rb.*');
            if ($arr_keys !== FALSE) {
                foreach($arr_keys as $str_key) {
                    Resque::enqueue('check', 'Check', array( 'user_id' => str_replace('rb.','', $str_key) ));
                    $logger->debug('Queued: ' . $str_key);
                }
            }
        } while ($it > 0);
    }


    /**
     * Queue worker(s)
     * 
     * @see `docker-compose up --build --scale worker=1 cli`
     */
    public function mainAction(array $params = array()) {


        Resque::setBackend( getenv('REDIS_ADDRESS') );

        $interval = 1;
        $BLOCKING = false;
        $logger = new Monolog\Logger('worker', [
            new Monolog\Handler\StreamHandler('php://stdout', Psr\Log\LogLevel::NOTICE)
        ]);

        $worker = new Resque_Worker(['*']);
        $worker->setLogger($logger);

        $PIDFILE = getenv('PIDFILE');
        if ($PIDFILE) {
            file_put_contents($PIDFILE, getmypid()) or
                die('Could not write PID information to ' . $PIDFILE);
        }

        $logger->log(Psr\Log\LogLevel::NOTICE, 'Starting worker {worker}', array('worker' => $worker));
        $worker->work($interval, $BLOCKING);

    }
}
