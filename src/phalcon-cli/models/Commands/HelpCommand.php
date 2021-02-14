<?php

namespace Longman\TelegramBot\Commands\UserCommands;

use Longman\TelegramBot\Commands\Command;
use Longman\TelegramBot\Commands\UserCommand;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Exception\TelegramException;

class HelpCommand extends UserCommand
{
    /**
     * @var string
     */
    protected $name = 'help';

    /**
     * @var string
     */
    protected $description = 'Shows list of commands';

    /**
     * @var string
     */
    protected $usage = '/help or /help <command>';

    /**
     * @var string
     */
    protected $version = '1.4.0';

    /**
     * Main command execution
     *
     * @return ServerResponse
     * @throws TelegramException
     */
    public function execute(): ServerResponse
    {
        $message     = $this->getMessage();
        $command_str = trim($message->getText(true));

        // Admin commands shouldn't be shown in group chats
        $safe_to_show = $message->getChat()->isPrivateChat();

        [$all_commands, $user_commands, $admin_commands] = $this->getUserAndAdminCommands();

        // If no command parameter is passed, show the list.
        if ($command_str === '') {
            $text = '*Commands List*:' . PHP_EOL;
            foreach ($user_commands as $user_command) {
                $text .= '/' . $user_command->getName() . ' - ' . $user_command->getDescription() . PHP_EOL;
            }

            if ($safe_to_show && count($admin_commands) > 0) {
                $text .= PHP_EOL . '*Admin Commands List*:' . PHP_EOL;
                foreach ($admin_commands as $admin_command) {
                    $text .= '/' . $admin_command->getName() . ' - ' . $admin_command->getDescription() . PHP_EOL;
                }
            }

            // $text .= PHP_EOL . 'For exact command help type: /help <command>';

            return $this->replyToChat($text, ['parse_mode' => 'markdown']);
        }

        $command_str = str_replace('/', '', $command_str);
        if (isset($all_commands[$command_str]) && ($safe_to_show || !$all_commands[$command_str]->isAdminCommand())) {
            $command = $all_commands[$command_str];

            return $this->replyToChat(sprintf(
                'Command: %s (v%s)' . PHP_EOL .
                'Description: %s' . PHP_EOL .
                'Usage: %s',
                $command->getName(),
                $command->getVersion(),
                $command->getDescription(),
                $command->getUsage()
            ), ['parse_mode' => 'markdown']);
        }

        return $this->replyToChat('No help available: Command `/' . $command_str . '` not found', ['parse_mode' => 'markdown']);
    }

    /**
     * Get all available User and Admin commands to display in the help list.
     *
     * @return Command[][]
     * @throws TelegramException
     */
    protected function getUserAndAdminCommands(): array
    {
        /** @var Command[] $all_commands */
        $all_commands = $this->telegram->getCommandsList();

        // Only get enabled Admin and User commands that are allowed to be shown.
        $commands = array_filter($all_commands, function ($command): bool {
            return !$command->isSystemCommand() && $command->showInHelp() && $command->isEnabled();
        });

        // Filter out all User commands
        $user_commands = array_filter($commands, function ($command): bool {
            return $command->isUserCommand();
        });

        // Filter out all Admin commands
        $admin_commands = array_filter($commands, function ($command): bool {
            return $command->isAdminCommand();
        });

        ksort($commands);
        ksort($user_commands);
        ksort($admin_commands);

        return [$commands, $user_commands, $admin_commands];
    }
}
