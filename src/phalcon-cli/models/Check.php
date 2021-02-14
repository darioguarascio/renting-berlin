<?php
// use Logger;

class Check {
    protected $log;

    public function setUp() {
    }


    public function perform()
    {
        try {

	        $telegram = new Longman\TelegramBot\Telegram(getenv('TG_APIKEY'), getenv('TG_BOTNAME'));

	        $monitor = new RB\Monitor($this->args['user_id']);

	        try {
	            $data = $monitor->fetchLastAd();
	            if ($monitor->hasChanged) {
	                $message = [
	                    'chat_id' => $this->args['user_id'],
	                    'text'    => sprintf(
	                    	'New ads for your monitored search.' . PHP_EOL . PHP_EOL .
	                    	'Last discovered: %s' .PHP_EOL . PHP_EOL .
	                    	'Previously: %s' . PHP_EOL.PHP_EOL .
	                    	'Monitored search: %s', $data['last'], $data['previous'],  $data['url'])
	                ];
	                $resut = Longman\TelegramBot\Request::sendMessage($message);
	            }
	        } catch (Exception $e) {
	            $message = [
	                'chat_id' => $this->args['user_id'],
	                'text'    => 'Error while checking for new ads: ' . $e->getMessage()
	            ];

	            $result = Longman\TelegramBot\Request::sendMessage($message);
	        }



        } catch (\Exception $e) {
            throw $e;
        }
    }
}