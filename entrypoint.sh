#!/bin/bash
set -e

case "$1" in
    develop)
        echo "Running Development Server"
        exec grunt --gruntfile app/Gruntfile.js | bunyan
        ;;
    startDev)
        echo "Running Start Dev"
        exec node app/index
        ;;
    startCron)
        echo "Running Start Dev"
        exec node app/index-crons
        ;;
    test)
        echo "Running Test"
        exec grunt --gruntfile app/Gruntfile.js test
        ;;
    start)
        echo "Running Start"
        exec npm start
        ;;
    *)
        exec "$@"
esac
