'use strict';

const 	Homey 				= require('homey'),
		_                   = require('lodash');

class MyDriver extends Homey.Driver {
	
	onInit() {

		this._userStringKey = 'userStrings';
        this._userStrings = Homey.ManagerSettings.get(this._userStringKey) || [];

        this.unlockedByUserTrigger = new Homey.FlowCardTriggerDevice('unlocked_by_user');
        this.unlockedByUserTrigger
            .register()
            .registerRunListener(this.byUserMatch)
            .getArgument('userString')
            .registerAutocompleteListener(this.onAutoCompleteUser.bind(this));

        this.lockedByUserTrigger = new Homey.FlowCardTriggerDevice('locked_by_user');
        this.lockedByUserTrigger
            .register()
            .registerRunListener(this.byUserMatch)
            .getArgument('userString')
            .registerAutocompleteListener(this.onAutoCompleteUser.bind(this));

        this.unlockedByMethodTrigger = new Homey.FlowCardTriggerDevice('unlocked_by_method');
        this.unlockedByMethodTrigger
            .register()
            .registerRunListener(this.byMethodMatch)
            .getArgument('method')
            .registerAutocompleteListener(this.onAutoCompleteMethodUnlock.bind(this));

        this.lockedByMethodTrigger = new Homey.FlowCardTriggerDevice('locked_by_method');
        this.lockedByMethodTrigger
            .register()
            .registerRunListener(this.byMethodMatch)
            .getArgument('method')
            .registerAutocompleteListener(this.onAutoCompleteMethodLock.bind(this));

        this.lockedMethodCondition = new Homey.FlowCardCondition('lock_method_is');
        this.lockedMethodCondition
            .register()
            .registerRunListener(args => this.conditionMatch(args, 'method'))
            .getArgument('method')
            .registerAutocompleteListener(this.onAutoCompleteMethodLock.bind(this));

        this.lockedUserCondition = new Homey.FlowCardCondition('lock_user_is');
        this.lockedUserCondition
            .register()
            .registerRunListener(args => this.conditionMatch(args, 'userString'))
            .getArgument('userString')
            .registerAutocompleteListener(this.onAutoCompleteUser.bind(this));

		this.log('Yale Doorman driver has been initialized');
	}
	
	updateCapabilities(lock)
	{
		let homeyDevice = this.getDevice({id: lock.deviceLabel});
		if (homeyDevice instanceof Error) return; 

        let userString = lock.userString;
        if(!userString) {
            lock.userString = 'Unknown';
            userString = lock.userString;
		}

		if (!_.includes(this._userStrings, userString))
		{
			this.log(`Adding user ${userString} to known users`);
			this._userStrings.push(userString);
			Homey.ManagerSettings.set(this._userStringKey, _.uniq(this._userStrings).sort());
		}

        homeyDevice.setLockStatus(lock);

        let state = {
            method: lock.method,
            userString: userString
        };
        if(lock.lockedState === 'LOCKED') {
            this.lockedByUserTrigger.trigger(homeyDevice, state, state).catch(this.error);
            this.lockedByMethodTrigger.trigger(homeyDevice, state, state).catch(this.error);
        }
        else {
            this.unlockedByUserTrigger.trigger(homeyDevice, state, state).catch(this.error);
        	this.unlockedByMethodTrigger.trigger(homeyDevice, state, state).catch(this.error);
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
        return [ {name:'Code'}, {name:'Tag'}, {name:'Thumb'}, {name:'Remote'}, {name:'Star'} ];
    }

    onAutoCompleteMethodUnlock() {
        return [ {name:'Code'}, {name:'Tag'}, {name:'Thumb'}, {name:'Remote'} ];
    }
}

module.exports = MyDriver;