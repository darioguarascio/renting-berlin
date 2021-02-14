#!/usr/bin/env sh

set -e

cd /php && composer du > /dev/null 2>/dev/null;
cd /app && exec php cli.php $1 $2 $3 
