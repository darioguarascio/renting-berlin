<?php namespace RB;

use Exception;

class Monitor {

    const XPATH = array(
        'www.immobilienscout24.de'  => '//div[@id="listings"]//a[contains(@class, "result-list-entry")]/@href',
        'www.wg-gesucht.de'         => '//div[contains(@class,"wgg_card offer_list_item")]//a/@href'
    );


    private $redis;
    private $cookies;
    private $last, $user;

    public $hasChanged = false;

    public function __construct( $user_id, $url = null, $firstName = null, $lastName = null, $userName = null ) {
        $this->redis = new \Redis;
        list($host,$port) = explode(':', getenv('REDIS_ADDRESS'));
        $this->redis->pconnect($host,$port);

        $this->user_id = $user_id;
        $this->url = $url;

        $this->cookies = new \Requests_Cookie_Jar([]);

        if (!!$this->url) {
            $this->user = [
                'firstName' => $firstName,
                'lastName'  => $lastName,
                'userName'  => $userName
            ];
            $this->redis->set('rb.' . $user_id, json_encode([
                'url'   => $this->url,
                'last'  => null,
                'user' => $this->user
            ]));
        } else {

            $data = $this->redis->get('rb.' . $user_id);
            $data = json_decode($data, true);
            $this->cookies = unserialize($data['cookies']);
            $this->url = $data['url'];
            $this->last = $data['last'];
            $this->user = $data['user'];
        }

    }

    public function fetchLastAd() {

         $headers = json_decode('


{
        "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:82.0) Gecko/20100101 Firefox/82.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0"

}

', true);

        $options = array();

        $request = \Requests::get($this->url, $headers, $options);

        $this->redis->hincrby('rb:stats', 'reqs', 1);

        $html = $request->body;

        if (preg_match('/Ich bin kein Roboter/i', $html)) {
            throw new Exception("Request has been identified as automated, and blocked. Sorry.", 10001);
        }

        $host = parse_url($this->url, PHP_URL_HOST);

        libxml_use_internal_errors(true);

        $doc = new \DOMDocument();
        $doc->loadHTML($html);

        $xpath = new \DOMXPath($doc);
        $query = self::XPATH[$host];

        $entries = $xpath->query($query);

        if ($entries->length > 0) {

            $lastUrl = sprintf('https://%s%s', $host, $entries[0]->nodeValue);
            $dataset = [
                'cookies'   => serialize($this->cookies),
                'url'       => $this->url,
                'last'      => $lastUrl,
                'user'      => $this->user,
                'previous'  => $this->last,
                'ts'        => time()
            ];


            $this->hasChanged = $this->last != $lastUrl;

            $this->redis->set('rb.' . $this->user_id, json_encode($dataset));

            return $dataset;

        } else {
            throw new Exception("Cannot find the last published AD. Could be a bug, an unexpected website reply. Sorry", 10002);
        }
    }



}