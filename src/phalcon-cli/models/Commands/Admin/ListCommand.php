<?php

/**
 * This file is part of the TelegramBot package.
 *
 * (c) Avtandil Kikabidze aka LONGMAN <akalongman@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Longman\TelegramBot\Commands\AdminCommands;

use Longman\TelegramBot\Commands\AdminCommand;
use Longman\TelegramBot\DB;
use Longman\TelegramBot\Entities\Chat;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Exception\TelegramException;
use Longman\TelegramBot\Request;

class ListCommand extends AdminCommand
{
    /**
     * @var string
     */
    protected $name = 'list';

    /**
     * @var string
     */
    protected $description = 'List current users';

    /**
     * @var string
     */
    protected $usage = '/list';

    /**
     * @var string
     */
    protected $version = '1.0.0';

    /**
     * Command execute method
     *
     * @return ServerResponse
     * @throws TelegramException
     */
    public function execute()
    {
        $message = $this->getMessage();

        $chat_id = $message->getChat()->getId();

        $redis = new \Redis;
        list($host,$port) = explode(':', getenv('REDIS_ADDRESS'));
        $redis->pconnect($host,$port);

        $msg = [];
        $it = NULL;
        do {
            $arr_keys = $redis->scan($it, 'rb.*');
            if ($arr_keys !== FALSE) {
                foreach($arr_keys as $str_key) {
                    $x = json_decode($redis->get($str_key), true);
                    $msg[] = sprintf('`%s`'." (%s)\n".'`%s`', isset($x['user']) ? $x['user']['userName'] : 'n/a', $str_key, $x['url']);
                }
            }
        } while ($it > 0);


        return Request::sendMessage( [
            'chat_id' => $chat_id,
            'text'    => count($msg) > 0 ? implode("\n\n", $msg) : 'nobody',
            'parse_mode' => 'Markdown'
        ]);
    }
}
