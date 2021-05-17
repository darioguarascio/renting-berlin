# Renting Berlin project
*renting.berlin* is a project born out of living the nightmare of finding a place to live in Berlin, aiming to make a little bit better the house hunting process, already difficult per se, and in Berlin this task becomes a full-time frustrating job, eating out your time and nerves.


## DISCLAIMER
Some websites implement an anti-automated requests policy that end up with this bot unable to perform requests. There are tecniques to bypass this protections such as rotating proxies or increasing requests interval, none of which have been implemented here as this is a proof-of-concept.
In short: take it as it is

## How to find an apartment in Berlin?
The modern approach is to use real estate websites such as [immobilienscout24](https://www.immobilienscout24.de) or [wg-gesucht](https://www.wg-gesucht.de/). 
Because of Berlin's high demand, one of the main issues of this process is the significant loss of time spent waiting for new ads to be published. After searching for a while, you can start feeling the pressure of having more demand than offer, which pushes you to try to be among the first ones applying, in order to have more chances.

## How can renting.berlin help?
The approach is quite simple: automated monitoring of search results pages, using [Telegram](https://telegram.org/) to deliver instant notifications for newly discovered ads. Faster than any daily email, and allowing you to take back any apartment-related FOMO.

## Requirements
- Having `docker` & `docker-compose` installed
- Registering a [Telegram Bot](https://core.telegram.org/bots)

## Services
### Bot
This is the main bot thread, listeing for and replying to incoming messages.

### Redis
The temporary storage for data

### Cli-worker
This process is the main queue worker, only checking the queue of URL-checks. Can be scaled with `docker-compose --scale` in case one is not able to handle the load.

### Cli-loader
This is a timed process that fills `worker`'s queue with what-to-check. Can be run once every X minutes. 


## Setup
### .env file
After registering a bot, create a `.env` file in the same directory of `docker-compose.yml` file.
```
TG_APIKEY=<Bot token>
TG_BOTNAME=<Bot name>
TG_ADMINS=<comma-separated user id list>
```

### Running services
- `docker-compose up -d bot redis` to have `bot`, `redis`  running
- `docker-compose up --build --scale worker=1 cli` to run N workers that will fetch remote data 
- `docker-compose run --rm cli pcli main load` this commands fills the workers queue, triggering them to run checks. It needs to be run periodically


## Hosted version
In Telegram, search for [@RentingBerlinBot](https://t.me/RentingBerlinBot) and type `/start` in its chat.
<br/>
Then:
```
    1. Search for your apartment criteria in any of the supported websites
    2. Sort the result page by last published
    3. Copy the search URL in @RentingBerlinBot chat
```
Done. You will get messages whenever new ads are discovered. Checks are run every 2 minutes.



## Supported websites
Each websites has a unique xpath query to retrive the latest item published on a listing page.

```
immobilienscout:
    host: www.immobilienscout24.de
    xpath: //div[@id="listings"]//a[contains(@class, "result-list-entry")]/@href

wg-gesucht
    host: www.wg-gesucht.de
    xpath: //div[contains(@class,"wgg_card offer_list_item")]//a/@href

```


## Limitations
This software fetches data from websites, unsing a fixed xpath query per website. If websites change layout or implement anti-scraping tools, the whole system won't work anymore.

