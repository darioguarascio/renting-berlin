<?php

namespace Longman\TelegramBot\Commands\SystemCommands;

use Longman\TelegramBot\Commands\UserCommand;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Exception\TelegramException;

class StartCommand extends UserCommand
{
    /**
     * @var string
     */
    protected $name = 'start';

    /**
     * @var string
     */
    protected $description = 'What is this and how it works';

    /**
     * @var string
     */
    protected $usage = '/start';

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
        $supported = '';
        foreach (array_keys(\RB\Monitor::XPATH) as $site) {
            $supported .= sprintf("- %s\n", $site);
        }
        return $this->replyToChat(
'Hello, and welcome to *Renting.Berlin Bot*.

This is a quick monitoring system for new published ads, to help you being up to date in your apartment search.
The system is very simple: you set a search that will be monitored for new published ads.

How to set it up:
1. Search for an apartment using your criteria (size, price, area, etc)
2. Sort the search by newest published
3. Copy the URL in this chat.

Done. You will get messages when the first result of changes.

Currently supported websites:
' . $supported,
            [
                'parse_mode' => 'markdown',
            ]);
    }
}
