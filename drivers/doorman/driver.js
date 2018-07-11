'use strict';

const 	Homey 				= require('homey'),
		_                   = require('lodash');

class MyDriver extends Homey.Driver {
	
	onInit() {

	    this._unknownUserString = 'Unknown';
		this._userStringKey = 'userStrings';
        this._userStrings = Homey.ManagerSettings.get(this._userStringKey) || [ this._unknownUserString];

        this._lockStateChangedTrigger = new Homey.FlowCardTriggerDevice('lock_state_changed');
        this._lockStateChangedTrigger.register();

        this._unlockedByUserTrigger = new Homey.FlowCardTriggerDevice('unlocked_by_user');
        this._unlockedByUserTrigger
            .register()
            .registerRunListener(this.byUserMatch.bind(this))
            .getArgument('userString')
            .registerAutocompleteListener(this.onAutoCompleteUser.bind(this));

        this._lockedByUserTrigger = new Homey.FlowCardTriggerDevice('locked_by_user');
        this._lockedByUserTrigger
            .register()
            .registerRunListener(this.byUserMatch.bind(this))
            .getArgument('userString')
            .registerAutocompleteListener(this.onAutoCompleteUser.bind(this));

        this._unlockedByMethodTrigger = new Homey.FlowCardTriggerDevice('unlocked_by_method');
        this._unlockedByMethodTrigger
            .register()
            .registerRunListener(this.byMethodMatch.bind(this))
            .getArgument('method')
            .registerAutocompleteListener(this.onAutoCompleteMethodUnlock.bind(this));

        this._lockedByMethodTrigger = new Homey.FlowCardTriggerDevice('locked_by_method');
        this._lockedByMethodTrigger
            .register()
            .registerRunListener(this.byMethodMatch.bind(this))
            .getArgument('method')
            .registerAutocompleteListener(this.onAutoCompleteMethodLock.bind(this));

        this._lockedMethodCondition = new Homey.FlowCardCondition('lock_method_is');
        this._lockedMethodCondition
            .register()
            .registerRunListener(args => this.conditionMatch(args, 'method'))
            .getArgument('method')
            .registerAutocompleteListener(this.onAutoCompleteMethodLock.bind(this));

        this._lockedUserCondition = new Homey.FlowCardCondition('lock_user_is');
        this._lockedUserCondition
            .register()
            .registerRunListener(args => this.conditionMatch(args, 'userString'))
            .getArgument('userString')
            .registerAutocompleteListener(this.onAutoCompleteUser.bind(this));

        this._alarmStateChangedTrigger = new Homey.FlowCardTriggerDevice('alarm_state_changed');
        this._alarmStateChangedTrigger.register();

        this._alarmDisarmedTrigger = new Homey.FlowCardTriggerDevice('alarm_disarmed');
        this._alarmDisarmedTrigger.register();

        this._alarmAlarmedHomeTrigger = new Homey.FlowCardTriggerDevice('alarm_armed_home');
        this._alarmAlarmedHomeTrigger.register();

        this._alarmAlarmedAwayTrigger = new Homey.FlowCardTriggerDevice('alarm_armed_away');
        this._alarmAlarmedAwayTrigger.register();

		this.log('Yale Doorman driver has been initialized');
	}

	alarmChanged(lock, tokens) {
        let homeyDevice = this.getDevice({id: lock.deviceLabel});
        if (homeyDevice instanceof Error) return;

        this.log('Alarm state updated', tokens);
        this._alarmStateChangedTrigger.trigger(homeyDevice, tokens).catch(this.error);
        switch (tokens.state) {
            case 'DISARMED':
                this._alarmDisarmedTrigger.trigger(homeyDevice, tokens).catch(this.error);
                break;
            case 'ARMED_HOME':
                this._alarmAlarmedHomeTrigger.trigger(homeyDevice, tokens).catch(this.error);
                break;
            case 'ARMED_AWAY':
                this._alarmAlarmedAwayTrigger.trigger(homeyDevice, tokens).catch(this.error);
                break;
        }
    }

	updateCapabilities(lock)
	{
		let homeyDevice = this.getDevice({id: lock.deviceLabel});
		if (homeyDevice instanceof Error) return; 

        let userString = lock.userString;
        if(!userString) {
            lock.userString = this._unknownUserString;
            userString = lock.userString;
		}

		if (!_.includes(this._userStrings, userString))
		{
			this.log(`Adding user ${userString} to known users`);
			this._userStrings.push(userString);
			Homey.ManagerSettings.set(this._userStringKey, _.uniq(this._userStrings).sort());
		}

        let tokens = {
            method: lock.method,
            userString: userString,
            locked: lock.lockedState === 'LOCKED'
        };

        homeyDevice.setLockStatus(lock);
        this.log('Lock state updated', tokens);

        this._lockStateChangedTrigger.trigger(homeyDevice, tokens, tokens).catch(this.error);
        if(tokens.locked) {
            this._lockedByUserTrigger.trigger(homeyDevice, tokens, tokens).catch(this.error);
            this._lockedByMethodTrigger.trigger(homeyDevice, tokens, tokens).catch(this.error);
        }
        else {
            this._unlockedByUserTrigger.trigger(homeyDevice, tokens, tokens).catch(this.error);
        	this._unlockedByMethodTrigger.trigger(homeyDevice, tokens, tokens).catch(this.error);
        }
	}
	
	onPairListDevices(data, callback) {
		let devices = [];
		if (!Homey.app.isConnected()) {
			callback(new Error("Please enter your credentials in the settings page first."));
		}
		else
		{
			let locks = Homey.app.getLocks();
			for (const lock of Object.values(locks)) {
				let capabilities = [];
					capabilities.push("locked");

				devices.push({
					data: { id: lock.deviceLabel },
					capabilities: capabilities,
					name: lock.area,
				});
			}	
			callback(null, devices.sort(MyDriver._compareHomeyDevice));
		}
	}

	static _compareHomeyDevice(a, b) {
		if (a.name < b.name)
			return -1;
		if (a.name > b.name)
			return 1;
		return 0;
	}

	conditionMatch(args, variable) {
        try {
            const lockStatus = args.device.getLockStatus();
            return lockStatus && args[variable].name.toLowerCase() === lockStatus[variable].toLowerCase();
        }
        catch(error) {
            this.log('Device condition checked with error: ' + error.message);
            return Promise.reject(error);
        }
	}

    byUserMatch(args, state) {
        return args.userString.name.toLowerCase() === state.userString.toLowerCase();
    }

	byMethodMatch(args, state) {
        return args.method.name.toLowerCase() === state.method.toLowerCase();
    }

    onAutoCompleteUser() {
        return _.map(this._userStrings, user => { return { name:user } });
    }

    onAutoCompleteMethodLock() {
        return [ {name:'Auto'}, {name:'Code'}, {name:'Tag'}, {name:'Thumb'}, {name:'Remote'}, {name:'Star'} ];
    }

    onAutoCompleteMethodUnlock() {
        return [ {name:'Code'}, {name:'Tag'}, {name:'Thumb'}, {name:'Remote'} ];
    }
}

module.exports = MyDriver;