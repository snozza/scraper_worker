#!/bin/bash
cd $(dirname "$0")/..

echo "cleaning up dist folder....."
rm -rf dist/*

echo "transpiling to ES5 with babel....."
babel lib --out-dir dist

echo "copying non-js files....."
rsync -a --include '*/' --exclude '*.js' lib/ dist/

