#!/bin/bash
cd $(dirname "$0")/..

echo "cleaning up dist folder....."
rm -rf dist/*

echo "transpiling to ES5 with babel....."
babel lib/app --out-dir dist

