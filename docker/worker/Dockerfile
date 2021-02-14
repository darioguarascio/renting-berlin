FROM php:7.2

WORKDIR /php

# PSR for phalcon 4.x
ARG PSR_VERSION=0.6.1

ARG PHALCON_VERSION=3.4.3
ARG PHALCON_EXT_PATH=php7/64bits

RUN set -xe && \
        # Compile PSR   
        curl -LO https://github.com/jbboehr/php-psr/archive/v${PSR_VERSION}.tar.gz && \
        tar xzf ${PWD}/v${PSR_VERSION}.tar.gz && \
        cd ${PWD}/php-psr-${PSR_VERSION} && \
        phpize && \
        ./configure && \
        make && \
        make test && \
        make install 

RUN set -xe && \
        # Compile Phalcon
        curl -LO https://github.com/phalcon/cphalcon/archive/v${PHALCON_VERSION}.tar.gz && \
        tar xzf ${PWD}/v${PHALCON_VERSION}.tar.gz && \
        cd ${PWD}/cphalcon-${PHALCON_VERSION}/build/ && \
        ./install

# Install packages
RUN apt-get update && \
        apt-get install -y libpq-dev && \
        apt-get install -y zlib1g-dev && \ 
        apt-get install -y g++ libicu-dev && \ 
        apt-get install -y libpng-dev && \
        apt-get install -y nano && \
        apt-get install -y git && \
        apt-get install -y unzip && \
        apt-get install -y procps

ENV PHPREDIS_VERSION 3.0.0

RUN mkdir -p /usr/src/php/ext/redis \
    && curl -L https://github.com/phpredis/phpredis/archive/$PHPREDIS_VERSION.tar.gz | tar xvz -C /usr/src/php/ext/redis --strip 1 \
    && echo 'redis' >> /usr/src/php-available-exts

RUN docker-php-ext-install zip
RUN docker-php-ext-install gd
RUN docker-php-ext-install redis
RUN docker-php-ext-install intl
RUN docker-php-ext-install pcntl



COPY ./php.ini /usr/local/etc/php/php.ini

# Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

COPY ./composer.json ./

# Temp dir to let `composer install` exit successfully
RUN mkdir -p /app/tasks /app/models
RUN composer install


COPY ./docker-entrypoint.sh /usr/local/bin/pcli
CMD     ["/usr/local/bin/pcli" ]