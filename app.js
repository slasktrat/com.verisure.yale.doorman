'use strict';

const   Homey                   = require('homey'),
        _                       = require('lodash'),
        Promise                 = require('bluebird'),
        Verisure                = require('verisure');


const doormanDriverName = "doorman";
const minPollInterval = 30;

class YaleDoormanApp extends Homey.App {
    
    onInit() {
        this._gatewayConnected = false;
        this._homeyDoormanDriver = Homey.ManagerDrivers.getDriver(doormanDriverName);
        this._installations = {};
        this._alarmStates = {};
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

        this._alarmStateChangedTrigger = new Homey.FlowCardTrigger('alarm_state_changed_global');
        this._alarmStateChangedTrigger.register();

        this._alarmDisarmedTrigger = new Homey.FlowCardTrigger('alarm_disarmed_global');
        this._alarmDisarmedTrigger.register();

        this._alarmAlarmedHomeTrigger = new Homey.FlowCardTrigger('alarm_armed_home_global');
        this._alarmAlarmedHomeTrigger.register();

        this._alarmAlarmedAwayTrigger = new Homey.FlowCardTrigger('alarm_armed_away_global');
        this._alarmAlarmedAwayTrigger.register();

        this.log(`Yale Doorman App has been initialized`);
    }

    async authenticate(username, password) {
        this._verisure = new Verisure(username, password);

        return this._verisure.getToken()
            .then(() => this._verisure.getInstallations())
            .then(installations => {
                if(this._pollInterval !== undefined)
                    clearInterval(this._pollInterval);
                let interval = Number(Homey.ManagerSettings.get('interval'));
                if(_.isNaN(interval) || interval < minPollInterval) {
                    Homey.ManagerSettings.set('interval', minPollInterval);
                    interval = minPollInterval;
                }

                this._pollInterval = setInterval(this.getAllOverview.bind(this), interval * 1000);

                this._installations = installations;
                this._gatewayConnected = true;
                return this.getAllOverview();
            });
    }

    async getAllOverview() {
        if(this._gatewayConnected)
            return Promise.mapSeries(this._installations, this.getOverview.bind(this));
    }

    async getOverview(installation) {
        return installation.getOverview().then((overview) => {
            this.log('Overview fetched for installation ' + installation.giid);

            _.each(overview.doorLockStatusList, lock => {
                if(!this._doorLockStatusList[lock.deviceLabel] || this._doorLockStatusList[lock.deviceLabel].eventTime !== lock.eventTime)
                    this._lockUpdated(lock, installation);
            });

            const alarmState = _.get(overview, 'armState.statusType');
            if(this._alarmStates[installation.giid] !== alarmState) {
                this.log('Setting alarm state', alarmState);
                this._alarmStates[installation.giid] = alarmState;
                const tokens = {state: alarmState, installation: Number(installation.giid)};
                this.alarmChanged(tokens);
                _.each(overview.doorLockStatusList, lock => {
                    this._homeyDoormanDriver.alarmChanged.call(this._homeyDoormanDriver, lock, tokens);
                });
            }

            return overview;
        });
    }

    alarmChanged(tokens) {
        this._alarmStateChangedTrigger.trigger(tokens).catch(this.error);
        switch (tokens.state) {
            case 'DISARMED':
                this._alarmDisarmedTrigger.trigger(tokens).catch(this.error);
                break;
            case 'ARMED_HOME':
                this._alarmAlarmedHomeTrigger.trigger(tokens).catch(this.error);
                break;
            case 'ARMED_AWAY':
                this._alarmAlarmedAwayTrigger.trigger(tokens).catch(this.error);
                break;
        }
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
        this._homeyDoormanDriver.updateCapabilities.call(this._homeyDoormanDriver, lock);
    }
}
module.exports = YaleDoormanApp;
