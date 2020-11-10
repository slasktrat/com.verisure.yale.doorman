# Yale Doorman

Homey App for the Yale Doorman door lock

First enter your verisure credentials in the App settings page.\
Then after added a lock, remember to input your pin code in the device settings page to be able to lock and unlock.

Both credentials and pin code are stored securely on your own Homey.

## Release notes

#### 1.1.1
- Added flow triggers: "Alarm state changed", "Alarm disarmed", "Alarm partially armed" and "Alarm armed"

#### 1.0.4
- Minor bugfix

#### 1.0.3
- Added flow triggers: "Alarm state changed", "Alarm disarmed", "Alarm partially armed" and "Alarm armed"  

#### 1.0.2
- Added additional flow trigger: "Lock state changed"  

#### 1.0.1
- Added additional flow trigger: "Lock state changed"
- Added support for lock method "Auto"

#### 1.0.0
- Added new flow triggers and conditions to filter by method and/or user (all users must have locked or unlocked the lock once before appearing in the user list)

#### 0.0.x
- Initial version

## Disclaimer 
This app uses an unofficial api from verisure which may break at any time. And if so should happen the app would stop working. However the api seem to have been stable for a long time, so hopefully that will continue to last.

To prevent your account risking to be banned, poll interval is limited to minimum 60 seconds and can be increased in the app settings page.

Use at your own risk.