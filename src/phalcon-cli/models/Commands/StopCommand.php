<?php

namespace Longman\TelegramBot\Commands\SystemCommands;

use Longman\TelegramBot\Commands\UserCommand;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Exception\TelegramException;

class StopCommand extends UserCommand
{
    /**
     * @var string
     */
    protected $name = 'stop';

    /**
     * @var string
     */
    protected $description = 'Stop monitoring';

    /**
     * @var string
     */
    protected $usage = '/stop';

    /**
     * @var string
     */
    protected $version = '1.0.0';

    /**
     * @var bool
     */
    protected $private_only = false;

    /**
     * Main command execution
     *
     * @return ServerResponse
     * @throws TelegramException
     */
    public function execute(): ServerResponse
    {

        $message = $this->getMessage();

        $from       = $message->getFrom();
        $user_id    = $from->getId();

        $redis = new \Redis;
        list($host,$port) = explode(':', getenv('REDIS_ADDRESS'));
        $redis->pconnect($host,$port);
        $x = $redis->del('rb.' . $user_id);

        return $this->replyToChat('Monitor has been stopped.');
    }
}
