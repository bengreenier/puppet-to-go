# puppet-to-go 🚗

A purpose-built browser driven by puppeteer to take screenshots of webpages in sequence.

![A weird puppet gif - idk](https://media1.giphy.com/media/l46CjoMYO5n2hQnWE/giphy.gif)

I needed a tool for quickly capturing sets of webpages as pngs, for archival purposes. This tool provides a configurable way to do this using electron and pupeeteer.

## How to use

+ `git clone https://github.com/bengreenier/puppet-to-go`
+ `cd puppet-to-go`
+ `npm i`
+ `npm start -- -c config.json`

A basic [config file](./config.json) is checked in - A json schema file is also included and referenced, so that tools like vscode can inform you what configuration options are available.

### Configuration Overview

All configuration files must have at minimum the following structure:

```
{
  "sequence": [
    { "url": "https://google.com", "displayName": "google" }
  ]
}
```

Further, the top-level key `folder` may be included to describe which folder to save screenshots into.

Please note that the presence of `displayName` is what controls if this portion of the sequence will be screenshot or not. You may include `waitForInterval`, or similar commands from [the puppeteer docs](https://github.com/puppeteer/puppeteer/blob/v7.0.1/docs/api.md#pagewaitfornavigationoptions) to pause between loading a url and taking a screenshot.

