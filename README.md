# Yale Doorman

Homey App for the Yale Doorman door lock

First enter your verisure credentials in the App settings page.\
Then after added a lock, remember to input your pin code in the device settings page to be able to lock and unlock.

Both credentials and pin code are stored securely on your own Homey.

## Disclaimer 
This app uses an unofficial api from verisure which may break at any time. And if so should happen the app would stop working. However the api seem to have been stable for a long time, so hopefully that will continue to last.

To prevent your account risking to be banned, poll interval is limited to minimum 60 seconds and can be increased in the app settings page.

Use at your own risk.

## Credits
Thanks to ptz0n for creating node-verisure
https://github.com/ptz0n/node-verisure

Door icon made by [Those Icons](https://www.flaticon.com/authors/those-icons) from www.flaticon.com 

## License
The MIT License (MIT)

Copyright 2018 Espen Ljosland

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.