<?php

namespace Longman\TelegramBot\Commands\SystemCommands;

use Longman\TelegramBot\Commands\SystemCommand;
use Longman\TelegramBot\Conversation;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Exception\TelegramException;
use Longman\TelegramBot\Request;

use Exception;

class GenericmessageCommand extends SystemCommand
{
    /**
     * @var string
     */
    protected $name = 'genericmessage';

    /**
     * @var string
     */
    protected $description = 'Handle generic message';

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
        $message    = $this->getMessage();
        $from       = $message->getFrom();
        $user_id    = $from->getId();

        $text       = trim($message->getText(true));

        if (substr($text,0, 4) !== 'http') {
            return Request::emptyResponse();
        }

        $host = parse_url($text, PHP_URL_HOST);

        if (!in_array($host, array_keys(\RB\Monitor::XPATH))) {
            return $this->replyToChat('Sorry, URL not recognized. Type /help for more info.');

        } else {
            $monitor = new \RB\Monitor($user_id, $text, $from->getFirstName(), $from->getLastName(), $from->getUsername());
            $this->replyToChat('You started a monitor on the following URL: `' . PHP_EOL . $text .'`',[
                'parse_mode' => 'markdown',
            ]);

            try {
                $data = $monitor->fetchLastAd();

                return $this->replyToChat('The last published AD on this URL is: '. PHP_EOL . $data['last'] . PHP_EOL . 'You will be notified when this changes.' );

            } catch (Exception $e) {
                return $this->replyToChat($e->getMessage());
            }
        }
    }
}
