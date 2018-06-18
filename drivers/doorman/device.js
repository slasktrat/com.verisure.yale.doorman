'use strict';

const   Homey               = require('homey'),
        _                   = require('lodash');

class MyDevice extends Homey.Device {
	
	onInit() {

		this._deviceLabel = this.getData().id;
		this._lockStatus = undefined;

		let lockDevice = Homey.app.getLock(this._deviceLabel);
		this.setLockStatus(lockDevice);

        this.registerCapabilityListener('locked', ( value, opts ) => {
        	let code = this.getSettings().code;
        	if(!code)
        		return Promise.reject('You must set the code to lock/unlock the door.');
        	return Homey.app.setTargetLockState(this._deviceLabel, value, code);
        });

        this.log(`Yale Doorman lock ${this.getName()} has been initialized`);
	}

	setLockStatus(lockStatus) {
        this._lockStatus = lockStatus;
        if (lockStatus) {
            this.setCapabilityValue("locked", lockStatus.lockedState === 'LOCKED').catch(this.error);
            // console.dir(lockStatus);
        }
    }

    getLockStatus() {
	    return this._lockStatus;
    }
}

module.exports = MyDevice;