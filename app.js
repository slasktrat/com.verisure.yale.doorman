'use strict';

const   Homey                   = require('homey'),
        _                       = require('lodash'),
        Promise                 = require('bluebird'),
        Verisure                = require('verisure');


const doormanDriverName = "doorman";

class YaleDoormanApp extends Homey.App {
    
    onInit() {
        this._gatewayConnected = false;
        this._homeyDoormanDriver = Homey.ManagerDrivers.getDriver(doormanDriverName);
        this._installations = {};
        this._doorLockStatusList = {};
        this._pollInterval = undefined;

        let username = Homey.ManagerSettings.get('username');
        let password = Homey.ManagerSettings.get('password');
                
        (async (args, callback) => {
            try {
                if(username && password)
                    await this.authenticate(username, password);
            } catch (err) {
                this.log(err.message);
            }
        })();

        this.log(`Yale Doorman App has been initialized`);
    }

    async authenticate(username, password) {
        this._verisure = new Verisure(username, password);

        return this._verisure.getToken()
            .then(() => this._verisure.getInstallations())
            .then(installations => {
                if(this._pollInterval !== undefined)
                    clearInterval(this._pollInterval);
                let interval = Homey.ManagerSettings.get('interval');
                this._pollInterval = setInterval(this.getAllOverview.bind(this), interval * 1000);

                this._installations = installations;
                this._gatewayConnected = true;
                return this.getAllOverview();
            });
    }

    async getAllOverview() {
        if(this._gatewayConnected)
            return Promise.map(this._installations, this.getOverview.bind(this));
    }

    async getOverview(installation) {
        return installation.getOverview().then((overview) => {
            this.log('Overview fetched for installation ' + installation.giid);
            // this.log('OVERVIEW:', overview);
            // this._doorLockStatusList = overview.doorLockStatusList;
            _.each(overview.doorLockStatusList, lock => {
                if(!this._doorLockStatusList[lock.deviceLabel] || this._doorLockStatusList[lock.deviceLabel].eventTime !== lock.eventTime)
                    this._lockUpdated(lock, installation);
            });
            return overview;
        });
    }

    isConnected() {
        return this._gatewayConnected;
    }

    getLock(deviceLabel) {
        return this._doorLockStatusList[deviceLabel];
    }

    getLocks() {
        return this._doorLockStatusList;
    }

    getInstallation(deviceLabel) {
        return this._installations[deviceLabel];
    }

    setTargetLockState(deviceLabel, value, code) {
        this.log(`Setting target lock state to: ${value}`);

        const request = {
            method: 'PUT',
            uri: `/device/${deviceLabel}/${value ? 'lock' : 'unlock'}`,
            json: { code: code },
        };

        let installation = this.getInstallation(deviceLabel);

        let logger = this.log;
        let retry = 0;
        function resolveChangeResult(uri) {
            logger(`Resolving: ${uri}`);
            if(++retry > 5)
                throw new Error('Unable to change lock state');

            return installation.client({ uri }).then(({ result }) => {
                logger(`Got "${result}" back from: ${uri}`);
                if (typeof result === 'undefined' || result === 'NO_DATA') {
                    return new Promise(resolve => setTimeout(() =>
                        resolve(resolveChangeResult(uri)), 200));
                }
                return result;
            });
        }

        return installation.client(request)
            .then(({ doorLockStateChangeTransactionId }) =>
                resolveChangeResult(`/doorlockstate/change/result/${doorLockStateChangeTransactionId}`))
            .catch((error) => {
                logger('Error code', error.errorCode);
                if (error.errorCode === 'VAL_00819') {
                    return true; // Lock already at desired state.
                }
                else if (error.errorCode === 'VAL_00008')
                    throw new Error('Wrong code');

                throw error;
            });
    }

    _lockUpdated(lock, installation) {
        this.log(`${lock.area} updated`);
        this._doorLockStatusList[lock.deviceLabel] = lock;
        this._installations[lock.deviceLabel] = installation;
        this._homeyDoormanDriver.updateCapabilities(lock);
    }
}
module.exports = YaleDoormanApp;
