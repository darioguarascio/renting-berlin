<?php

/**
 * This file is part of the PHP Telegram Bot example-bot package.
 * https://github.com/php-telegram-bot/example-bot/
 *
 * (c) PHP Telegram Bot Team
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * User "/echo" command
 *
 * Simply echo the input back to the user.
 */

namespace Longman\TelegramBot\Commands\UserCommands;

use Carbon\Carbon;

use Longman\TelegramBot\Commands\UserCommand;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Exception\TelegramException;

class MonitorCommand extends UserCommand
{
    /**
     * @var string
     */
    protected $name = 'monitor';

    /**
     * @var string
     */
    protected $description = 'Your monitoring status';

    /**
     * @var string
     */
    protected $usage = '/monitor';

    /**
     * @var string
     */
    protected $version = '1.0.0';

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

        $text    = $message->getText(true);

        $redis = new \Redis;
        list($host,$port) = explode(':', getenv('REDIS_ADDRESS'));
        $redis->pconnect($host, $port);
        $url = $redis->get('rb.' . $user_id);

        if (!$url) {
            return $this->replyToChat('You have no current monitor. To set a monitor, write a search URL in this chat.' . PHP_EOL . 'Type /start for more info.');
        } else {

            $data = json_decode($url);
            $lastCheck = Carbon::createFromTimeStamp($data->ts)->diffForHumans();
            return $this->replyToChat('You are currently monitoring: ' . PHP_EOL . $data->url . PHP_EOL . PHP_EOL . 'Last publisehd AD: ' . $data->last. PHP_EOL . PHP_EOL . 'Last checked: ' . $lastCheck);
        }
    }
}
