<?php

use Phalcon\Cli\Task;

use Longman\TelegramBot\TelegramLog;
use Monolog\Formatter\LineFormatter;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;


class BotTask extends Task {

    private $loops   = 10;

    private $timeout = 10;

    /**
     * @see `docker-compose up bot`
     */
    public function mainAction(array $params = array()) {

        $logger = new Monolog\Logger('worker', [
            new Monolog\Handler\StreamHandler('php://stdout', Psr\Log\LogLevel::DEBUG)
        ]);

        TelegramLog::initialize(
            // Main logger that handles all 'debug' and 'error' logs.
            new Logger('telegram_bot', [
                (new StreamHandler('/logs/debug_log_file', Logger::DEBUG))->setFormatter(new LineFormatter(null, null, true)),
                (new StreamHandler('/logs/error_log_file', Logger::ERROR))->setFormatter(new LineFormatter(null, null, true)),
            ]),
            // Updates logger for raw updates.
            new Logger('telegram_bot_updates', [
                (new StreamHandler('/logs/updates_log_file', Logger::INFO))->setFormatter(new LineFormatter('%message%' . PHP_EOL)),
            ])
        );

        try {
            $telegram = new Longman\TelegramBot\Telegram(getenv('TG_APIKEY'), getenv('TG_BOTNAME'));

            # this function requires an array of int
            $admins = array_map( function( $e ) { return intval($e); },  explode(',', getenv('TG_ADMINS') )  );
            $telegram->enableAdmins($admins); 

            $telegram->addCommandsPaths([ __DIR__ . '/../models/Commands/' ]);

            $telegram-> useGetUpdatesWithoutDatabase();


            while ($this->loops--) {
                $server_response = $telegram->handleGetUpdates(null, $this->timeout);

                if ($server_response->isOk()) {
                    $update_count = count($server_response->getResult());
                    $logger->debug('Processed ' . $update_count . ' updates');
                } else {
                    $logger->debug('Failed to fetch updates: ' . $server_response->printError());
                }
                sleep(1);
            }
        } catch (Longman\TelegramBot\Exception\TelegramException $e) {
            Longman\TelegramBot\TelegramLog::error($e);

        } catch (Longman\TelegramBot\Exception\TelegramLogException $e) {
            // Uncomment this to output log initialisation errors (ONLY FOR DEVELOPMENT!)
            // echo $e;
        }
    }
}
